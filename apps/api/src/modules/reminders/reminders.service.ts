import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { StaffPermission } from "@yb-travel/shared";
import type { Pool, PoolClient } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type ReminderState = "pending" | "due" | "overdue" | "escalated" | "acknowledged" | "resolved";
export type ReminderType = "unanswered_inquiry" | "missing_information" | "next_action" | "onboarding_task";

export type ReminderRecord = {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  entityType: "travel_request" | "client" | "onboarding_task";
  entityId: string;
  requestId: number | null;
  requestNumber: string | null;
  clientId: number | null;
  clientName: string | null;
  onboardingTaskId: string | null;
  assignedUserId: number;
  assignedUserName: string;
  state: ReminderState;
  dueAt: string;
  escalatesAt: string;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReminderRow = {
  id: string;
  reminder_type: ReminderType;
  title: string;
  message: string;
  entity_type: ReminderRecord["entityType"];
  entity_id: string;
  request_id: number | null;
  request_number: string | null;
  client_id: number | null;
  client_name: string | null;
  onboarding_task_id: string | null;
  assigned_user_id: number;
  assigned_user_name: string;
  state: ReminderState;
  due_at: string;
  escalates_at: string;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

type DeliveryRow = {
  id: string;
  reminder_id: string;
  reminder_state: "due" | "overdue" | "escalated";
  attempt_count: number;
};

const SELECT_REMINDERS = `
  SELECT reminder.id::text AS id, reminder.reminder_type, reminder.title, reminder.message,
         reminder.entity_type, reminder.entity_id, reminder.request_id,
         request.request_number, reminder.client_id, client.name AS client_name,
         reminder.onboarding_task_id::text AS onboarding_task_id,
         reminder.assigned_user_id, assignee.name AS assigned_user_name,
         reminder.state, reminder.due_at, reminder.escalates_at,
         reminder.acknowledged_at, reminder.created_at, reminder.updated_at
  FROM staff_reminders reminder
  JOIN users assignee ON assignee.id = reminder.assigned_user_id
  LEFT JOIN travel_requests request ON request.id = reminder.request_id
  LEFT JOIN clients client ON client.id = reminder.client_id
`;

function toReminder(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    type: row.reminder_type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    requestId: row.request_id,
    requestNumber: row.request_number,
    clientId: row.client_id,
    clientName: row.client_name,
    onboardingTaskId: row.onboarding_task_id,
    assignedUserId: row.assigned_user_id,
    assignedUserName: row.assigned_user_name,
    state: row.state,
    dueAt: row.due_at,
    escalatesAt: row.escalates_at,
    acknowledgedAt: row.acknowledged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class RemindersService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  onModuleInit(): void {
    if (process.env.REMINDER_PROCESSOR_DISABLED === "true") return;
    void this.runCycle().catch((error) => console.error("Reminder processor failed", error));
    this.timer = setInterval(() => {
      void this.runCycle().catch((error) => console.error("Reminder processor failed", error));
    }, 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runCycle(): Promise<{ synchronized: boolean; delivered: number }> {
    if (this.running) return { synchronized: false, delivered: 0 };
    this.running = true;
    try {
      await this.synchronizeSources();
      let delivered = 0;
      for (let index = 0; index < 50; index += 1) {
        if (!(await this.processNextDelivery())) break;
        delivered += 1;
      }
      return { synchronized: true, delivered };
    } finally {
      this.running = false;
    }
  }

  async list(
    userId: number,
    permissions: StaffPermission[],
    state: ReminderState | "active" | "all" = "active",
    scope: "mine" | "all" = "mine",
  ): Promise<{ counts: Record<ReminderState | "active", number>; reminders: ReminderRecord[] }> {
    await this.synchronizeSources();
    const canSeeAll = permissions.includes("requests.assign_any");
    const effectiveScope = scope === "all" && canSeeAll ? "all" : "mine";
    const params: Array<number | string> = [];
    const filters: string[] = [];
    if (effectiveScope === "mine") {
      params.push(userId);
      filters.push(`reminder.assigned_user_id = $${params.length}`);
    }
    if (state === "active") {
      filters.push("reminder.state IN ('pending','due','overdue','escalated')");
    } else if (state !== "all") {
      params.push(state);
      filters.push(`reminder.state = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = await this.pool.query<ReminderRow>(
      `${SELECT_REMINDERS} ${where}
       ORDER BY CASE reminder.state WHEN 'escalated' THEN 1 WHEN 'overdue' THEN 2 WHEN 'due' THEN 3 WHEN 'pending' THEN 4 ELSE 5 END,
                reminder.due_at, reminder.id
       LIMIT 250`,
      params,
    );
    const countParams: number[] = effectiveScope === "mine" ? [userId] : [];
    const countWhere = effectiveScope === "mine" ? "WHERE assigned_user_id = $1" : "";
    const countsResult = await this.pool.query<{ state: ReminderState; count: number }>(
      `SELECT state, count(*)::int AS count FROM staff_reminders ${countWhere} GROUP BY state`,
      countParams,
    );
    const counts = { pending: 0, due: 0, overdue: 0, escalated: 0, acknowledged: 0, resolved: 0, active: 0 };
    for (const item of countsResult.rows) counts[item.state] = item.count;
    counts.active = counts.pending + counts.due + counts.overdue + counts.escalated;
    return { counts, reminders: rows.rows.map(toReminder) };
  }

  async acknowledge(id: number, userId: number, permissions: StaffPermission[]): Promise<ReminderRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await this.loadForUpdate(client, id);
      if (before.assignedUserId !== userId && !permissions.includes("requests.assign_any")) {
        throw new ForbiddenException("Only the assignee or an assignment manager can acknowledge this reminder");
      }
      await client.query(
        `UPDATE staff_reminders SET state = 'acknowledged', acknowledged_at = now(),
                acknowledged_by = $2, updated_at = now()
         WHERE id = $1 AND state NOT IN ('acknowledged','resolved')`,
        [id, userId],
      );
      await client.query(
        `UPDATE staff_reminder_deliveries SET delivery_state = 'cancelled', updated_at = now()
         WHERE reminder_id = $1 AND delivery_state IN ('pending','processing','failed')`,
        [id],
      );
      const after = await this.load(client, id);
      await recordAudit(client, userId, "staff_reminder.acknowledged", "staff_reminder", id, before, after);
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async reassign(id: number, assignedUserId: number, actorUserId: number): Promise<ReminderRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await this.loadForUpdate(client, id);
      const user = await client.query("SELECT 1 FROM users WHERE id = $1 AND active = true", [assignedUserId]);
      if ((user.rowCount ?? 0) === 0) throw new NotFoundException("Active assignee not found");
      await client.query(
        `UPDATE staff_reminders SET assigned_user_id = $2, updated_at = now() WHERE id = $1`,
        [id, assignedUserId],
      );
      const after = await this.load(client, id);
      await recordAudit(client, actorUserId, "staff_reminder.reassigned", "staff_reminder", id, before, after);
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async synchronizeSources(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        WITH request_sources AS (
          SELECT 'unanswered_inquiry'::text AS reminder_type,
                 request.id AS request_id, request.client_id,
                 COALESCE(request.assigned_user_id, request.created_by, client.preferred_rep_id, client.secondary_rep_id) AS assignee_id,
                 request.response_due_at AS due_at,
                 request.request_number || ' needs a response' AS title,
                 client.name || ' · ' || request.trip_summary || ' has not received a first response.' AS message,
                 'request:' || request.id || ':unanswered' AS dedupe_key
          FROM travel_requests request
          JOIN clients client ON client.id = request.client_id
          JOIN request_statuses status ON status.id = request.request_status_id
          WHERE request.response_due_at IS NOT NULL AND request.first_response_at IS NULL
            AND status.code NOT IN ('completed','cancelled')
          UNION ALL
          SELECT 'missing_information', request.id, request.client_id,
                 COALESCE(request.assigned_user_id, request.created_by, client.preferred_rep_id, client.secondary_rep_id),
                 COALESCE(request.response_due_at, request.updated_at + interval '24 hours'),
                 request.request_number || ' is waiting for information',
                 client.name || ' · Follow up on missing trip or traveller information.',
                 'request:' || request.id || ':missing-information'
          FROM travel_requests request
          JOIN clients client ON client.id = request.client_id
          JOIN request_statuses status ON status.id = request.request_status_id
          WHERE status.code = 'waiting_for_information'
          UNION ALL
          SELECT 'next_action', request.id, request.client_id,
                 COALESCE(request.assigned_user_id, request.created_by, client.preferred_rep_id, client.secondary_rep_id),
                 request.service_due_at,
                 request.request_number || ' next action is due',
                 client.name || ' · ' || request.trip_summary || ' requires the next service action.',
                 'request:' || request.id || ':next-action'
          FROM travel_requests request
          JOIN clients client ON client.id = request.client_id
          JOIN request_statuses status ON status.id = request.request_status_id
          WHERE request.service_due_at IS NOT NULL AND request.service_completed_at IS NULL
            AND status.code NOT IN ('completed','cancelled')
        )
        INSERT INTO staff_reminders
          (reminder_type, title, message, entity_type, entity_id, request_id, client_id,
           assigned_user_id, state, due_at, escalates_at, dedupe_key)
        SELECT source.reminder_type, source.title, source.message, 'travel_request', source.request_id::text,
               source.request_id, source.client_id, source.assignee_id, 'pending', source.due_at,
               source.due_at + interval '4 hours', source.dedupe_key
        FROM request_sources source
        JOIN users assignee ON assignee.id = source.assignee_id AND assignee.active = true
        ON CONFLICT (dedupe_key) DO UPDATE SET
          title = EXCLUDED.title, message = EXCLUDED.message,
          assigned_user_id = CASE WHEN staff_reminders.state IN ('acknowledged','resolved')
                                  THEN staff_reminders.assigned_user_id ELSE EXCLUDED.assigned_user_id END,
          due_at = EXCLUDED.due_at, escalates_at = EXCLUDED.escalates_at, updated_at = now()
      `);
      await client.query(`
        WITH task_sources AS (
          SELECT task.id AS task_id, task.client_id, task.due_at,
                 COALESCE(client.preferred_rep_id, client.secondary_rep_id, task.created_by,
                   (SELECT user_account.id FROM users user_account
                    WHERE user_account.active = true
                      AND (task.responsible_role IS NULL OR user_account.roles @> ARRAY[task.responsible_role]::text[])
                    ORDER BY user_account.id LIMIT 1)) AS assignee_id,
                 'Onboarding task is due' AS title,
                 client.name || ' · ' || task.title AS message,
                 'onboarding-task:' || task.id AS dedupe_key
          FROM onboarding_tasks task
          JOIN clients client ON client.id = task.client_id
          WHERE task.status = 'open' AND task.due_at IS NOT NULL
        )
        INSERT INTO staff_reminders
          (reminder_type, title, message, entity_type, entity_id, client_id, onboarding_task_id,
           assigned_user_id, state, due_at, escalates_at, dedupe_key)
        SELECT 'onboarding_task', source.title, source.message, 'onboarding_task', source.task_id::text,
               source.client_id, source.task_id, source.assignee_id, 'pending', source.due_at,
               source.due_at + interval '4 hours', source.dedupe_key
        FROM task_sources source
        JOIN users assignee ON assignee.id = source.assignee_id AND assignee.active = true
        ON CONFLICT (dedupe_key) DO UPDATE SET
          title = EXCLUDED.title, message = EXCLUDED.message,
          assigned_user_id = CASE WHEN staff_reminders.state IN ('acknowledged','resolved')
                                  THEN staff_reminders.assigned_user_id ELSE EXCLUDED.assigned_user_id END,
          due_at = EXCLUDED.due_at, escalates_at = EXCLUDED.escalates_at, updated_at = now()
      `);

      await client.query(`
        UPDATE staff_reminders reminder SET state = 'resolved', resolved_at = now(), updated_at = now()
        WHERE reminder.state <> 'resolved' AND (
          (reminder.reminder_type = 'unanswered_inquiry' AND NOT EXISTS (
            SELECT 1 FROM travel_requests request JOIN request_statuses status ON status.id = request.request_status_id
            WHERE request.id = reminder.request_id AND request.first_response_at IS NULL AND status.code NOT IN ('completed','cancelled')
          )) OR
          (reminder.reminder_type = 'missing_information' AND NOT EXISTS (
            SELECT 1 FROM travel_requests request JOIN request_statuses status ON status.id = request.request_status_id
            WHERE request.id = reminder.request_id AND status.code = 'waiting_for_information'
          )) OR
          (reminder.reminder_type = 'next_action' AND NOT EXISTS (
            SELECT 1 FROM travel_requests request JOIN request_statuses status ON status.id = request.request_status_id
            WHERE request.id = reminder.request_id AND request.service_completed_at IS NULL AND status.code NOT IN ('completed','cancelled')
          )) OR
          (reminder.reminder_type = 'onboarding_task' AND NOT EXISTS (
            SELECT 1 FROM onboarding_tasks task WHERE task.id = reminder.onboarding_task_id AND task.status = 'open'
          ))
        )
      `);
      await client.query(`
        UPDATE staff_reminders SET state = CASE
          WHEN now() >= escalates_at THEN 'escalated'
          WHEN now() > due_at THEN 'overdue'
          WHEN now() >= due_at - interval '30 minutes' THEN 'due'
          ELSE 'pending' END,
          updated_at = CASE WHEN state IS DISTINCT FROM CASE
            WHEN now() >= escalates_at THEN 'escalated'
            WHEN now() > due_at THEN 'overdue'
            WHEN now() >= due_at - interval '30 minutes' THEN 'due'
            ELSE 'pending' END THEN now() ELSE updated_at END
        WHERE state NOT IN ('acknowledged','resolved')
      `);
      await client.query(`
        INSERT INTO staff_reminder_deliveries (reminder_id, reminder_state)
        SELECT id, state FROM staff_reminders WHERE state IN ('due','overdue','escalated')
        ON CONFLICT (reminder_id, reminder_state) DO NOTHING
      `);
      await client.query(`
        UPDATE staff_reminder_deliveries delivery SET delivery_state = 'cancelled', updated_at = now()
        FROM staff_reminders reminder
        WHERE reminder.id = delivery.reminder_id AND reminder.state IN ('acknowledged','resolved')
          AND delivery.delivery_state IN ('pending','processing','failed')
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async processNextDelivery(): Promise<boolean> {
    const client = await this.pool.connect();
    let delivery: DeliveryRow | null = null;
    try {
      await client.query("BEGIN");
      await client.query(`
        UPDATE staff_reminder_deliveries SET delivery_state = 'failed', locked_at = NULL,
               next_attempt_at = now(), last_error = 'Recovered stale processing lock', updated_at = now()
        WHERE delivery_state = 'processing' AND locked_at < now() - interval '5 minutes'
      `);
      const claimed = await client.query<DeliveryRow>(`
        WITH next_delivery AS (
          SELECT id FROM staff_reminder_deliveries
          WHERE delivery_state IN ('pending','failed') AND next_attempt_at <= now()
            AND attempt_count < 8
          ORDER BY next_attempt_at, id
          FOR UPDATE SKIP LOCKED LIMIT 1
        )
        UPDATE staff_reminder_deliveries delivery
        SET delivery_state = 'processing', attempt_count = delivery.attempt_count + 1,
            locked_at = now(), updated_at = now()
        FROM next_delivery WHERE delivery.id = next_delivery.id
        RETURNING delivery.id::text, delivery.reminder_id::text,
                  delivery.reminder_state, delivery.attempt_count
      `);
      delivery = claimed.rows[0] ?? null;
      if (!delivery) {
        await client.query("COMMIT");
        return false;
      }
      const reminder = await this.load(client, Number(delivery.reminder_id));
      if (reminder.state === "acknowledged" || reminder.state === "resolved") {
        await client.query(
          "UPDATE staff_reminder_deliveries SET delivery_state = 'cancelled', locked_at = NULL, updated_at = now() WHERE id = $1",
          [delivery.id],
        );
        await client.query("COMMIT");
        return true;
      }
      const notificationType = `reminder_${delivery.reminder_state}`;
      await client.query(
        `INSERT INTO staff_notifications
           (user_id, notification_type, title, message, entity_type, entity_id, reminder_delivery_id)
         VALUES ($1, $2, $3, $4, 'reminder', $5, $6)
         ON CONFLICT (reminder_delivery_id) WHERE reminder_delivery_id IS NOT NULL DO NOTHING`,
        [reminder.assignedUserId, notificationType, reminder.title, reminder.message, reminder.id, delivery.id],
      );
      await client.query(
        `UPDATE staff_reminder_deliveries SET delivery_state = 'delivered', delivered_at = now(),
                locked_at = NULL, last_error = NULL, updated_at = now() WHERE id = $1`,
        [delivery.id],
      );
      await client.query(
        "UPDATE staff_reminders SET last_notified_state = $2, updated_at = now() WHERE id = $1",
        [reminder.id, delivery.reminder_state],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      if (delivery) {
        const delayMinutes = Math.min(60, 2 ** Math.min(delivery.attempt_count, 6));
        await this.pool.query(
          `UPDATE staff_reminder_deliveries SET delivery_state = 'failed', locked_at = NULL,
                  next_attempt_at = now() + make_interval(mins => $2), last_error = $3, updated_at = now()
           WHERE id = $1`,
          [delivery.id, delayMinutes, error instanceof Error ? error.message.slice(0, 1000) : "Unknown delivery error"],
        );
      }
      return true;
    } finally {
      client.release();
    }
  }

  private async load(client: Pool | PoolClient, id: number): Promise<ReminderRecord> {
    const result = await client.query<ReminderRow>(`${SELECT_REMINDERS} WHERE reminder.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Reminder not found");
    return toReminder(row);
  }

  private async loadForUpdate(client: PoolClient, id: number): Promise<ReminderRecord> {
    const locked = await client.query("SELECT id FROM staff_reminders WHERE id = $1 FOR UPDATE", [id]);
    if ((locked.rowCount ?? 0) === 0) throw new NotFoundException("Reminder not found");
    return this.load(client, id);
  }
}
