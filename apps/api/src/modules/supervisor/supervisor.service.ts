import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type SupervisorReviewType = "pricing_override" | "markup_change" | "waiver" | "assignment_override" | "operational_exception";
export type SupervisorReviewOutcome = "approved" | "rejected" | "noted" | "coaching_required";

export type WorkloadRow = {
  userId: number;
  agentName: string;
  roles: string[];
  availabilityStatus: string;
  capacityLimit: number;
  openRequests: number;
  openBookings: number;
  dueToday: number;
  overdue: number;
  escalated: number;
  openCases: number;
  oldestUntouchedAt: string | null;
  oldestUntouchedLabel: string;
};

export type SupervisorReviewItem = {
  id: string;
  requestId: number | null;
  requestNumber: string | null;
  clientName: string | null;
  type: SupervisorReviewType;
  summary: string;
  overriddenRule: string;
  reason: string;
  valueAmount: string | null;
  currency: string | null;
  occurredById: number;
  occurredByName: string;
  occurredAt: string;
  occurredAtLabel: string;
  status: "unreviewed" | "reviewed";
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewedAtLabel: string | null;
  outcome: SupervisorReviewOutcome | null;
  reviewComment: string | null;
};

type ReviewRow = {
  id: string;
  travel_request_id: number | null;
  request_number: string | null;
  client_name: string | null;
  review_type: SupervisorReviewType;
  summary: string;
  overridden_rule: string;
  reason: string;
  value_amount: string | null;
  currency: string | null;
  occurred_by: number;
  occurred_by_name: string;
  occurred_at: string;
  status: "unreviewed" | "reviewed";
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  outcome: SupervisorReviewOutcome | null;
  review_comment: string | null;
};

const REVIEW_SELECT = `
  SELECT item.id::text, item.travel_request_id, request.request_number,
         client.name AS client_name, item.review_type, item.summary,
         item.overridden_rule, item.reason, item.value_amount::text,
         item.currency, item.occurred_by, actor.name AS occurred_by_name,
         item.occurred_at, item.status, reviewer.name AS reviewed_by_name,
         item.reviewed_at, item.outcome, item.review_comment
  FROM supervisor_review_items item
  JOIN users actor ON actor.id = item.occurred_by
  LEFT JOIN users reviewer ON reviewer.id = item.reviewed_by
  LEFT JOIN travel_requests request ON request.id = item.travel_request_id
  LEFT JOIN clients client ON client.id = request.client_id
`;

/** Formats a stored instant for the Brooklyn operations desk on the server. */
function deskTimeLabel(value: string | Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(value));
}

/**
 * Converts one database review row into the stable API shape used by the
 * supervisor queue. This keeps SQL column names out of the browser contract.
 */
function toReviewItem(row: ReviewRow): SupervisorReviewItem {
  return {
    id: row.id,
    requestId: row.travel_request_id,
    requestNumber: row.request_number,
    clientName: row.client_name,
    type: row.review_type,
    summary: row.summary,
    overriddenRule: row.overridden_rule,
    reason: row.reason,
    valueAmount: row.value_amount,
    currency: row.currency,
    occurredById: row.occurred_by,
    occurredByName: row.occurred_by_name,
    occurredAt: row.occurred_at,
    occurredAtLabel: deskTimeLabel(row.occurred_at) ?? "",
    status: row.status,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    reviewedAtLabel: deskTimeLabel(row.reviewed_at),
    outcome: row.outcome,
    reviewComment: row.review_comment,
  };
}

@Injectable()
export class SupervisorService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Builds the live cross-team workload table from current request and reminder
   * records. Counts are calculated in PostgreSQL so every viewer sees one
   * consistent snapshot and the browser performs no deadline arithmetic.
   */
  async workload(showAll: boolean): Promise<WorkloadRow[]> {
    const result = await this.pool.query<{
      user_id: number; agent_name: string; roles: string[]; availability_status: string;
      capacity_limit: number; open_requests: number; due_today: number; overdue: number;
      escalated: number; oldest_untouched_at: string | null;
    }>(
      `SELECT u.id AS user_id, u.name AS agent_name, u.roles,
              COALESCE(profile.availability_status, 'available') AS availability_status,
              COALESCE(profile.capacity_limit, 10) AS capacity_limit,
              COUNT(DISTINCT request.id)::int AS open_requests,
              COUNT(DISTINCT reminder.id) FILTER (
                WHERE reminder.state IN ('due', 'overdue', 'escalated')
                  AND reminder.due_at >= date_trunc('day', now())
                  AND reminder.due_at < date_trunc('day', now()) + interval '1 day'
              )::int AS due_today,
              COUNT(DISTINCT reminder.id) FILTER (WHERE reminder.state = 'overdue')::int AS overdue,
              COUNT(DISTINCT reminder.id) FILTER (WHERE reminder.state = 'escalated')::int AS escalated,
              MIN(request.updated_at) AS oldest_untouched_at
       FROM users u
       LEFT JOIN staff_routing_profiles profile ON profile.user_id = u.id
       LEFT JOIN travel_requests request ON request.assigned_user_id = u.id
         AND request.request_status_id NOT IN (
           SELECT id FROM request_statuses WHERE code IN ('completed', 'cancelled')
         )
       LEFT JOIN staff_reminders reminder ON reminder.assigned_user_id = u.id
         AND reminder.state IN ('due', 'overdue', 'escalated')
       WHERE u.active = true
         AND u.roles && ARRAY['travel_agent', 'supervisor_manager', 'offshore_intake_employee']::text[]
       GROUP BY u.id, u.name, u.roles, profile.availability_status, profile.capacity_limit
       HAVING $1::boolean OR COUNT(DISTINCT request.id) > 0 OR COUNT(DISTINCT reminder.id) > 0
       ORDER BY COUNT(DISTINCT reminder.id) FILTER (WHERE reminder.state = 'escalated') DESC,
                COUNT(DISTINCT reminder.id) FILTER (WHERE reminder.state = 'overdue') DESC,
                COUNT(DISTINCT request.id) DESC, u.name`,
      [showAll],
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      agentName: row.agent_name,
      roles: row.roles,
      availabilityStatus: row.availability_status,
      capacityLimit: row.capacity_limit,
      openRequests: row.open_requests,
      openBookings: 0,
      dueToday: row.due_today,
      overdue: row.overdue,
      escalated: row.escalated,
      openCases: 0,
      oldestUntouchedAt: row.oldest_untouched_at,
      oldestUntouchedLabel: deskTimeLabel(row.oldest_untouched_at) ?? "No open request",
    }));
  }

  /**
   * Returns the retrospective review queue. The status filter controls whether
   * supervisors see pending work, completed history, or both without changing
   * or hiding any underlying review record.
   */
  async reviews(status: "unreviewed" | "reviewed" | "all"): Promise<{ counts: { unreviewed: number; reviewed: number; all: number }; items: SupervisorReviewItem[] }> {
    const [counts, items] = await Promise.all([
      this.pool.query<{ unreviewed: number; reviewed: number; all: number }>(
        `SELECT COUNT(*) FILTER (WHERE status = 'unreviewed')::int AS unreviewed,
                COUNT(*) FILTER (WHERE status = 'reviewed')::int AS reviewed,
                COUNT(*)::int AS all
         FROM supervisor_review_items`,
      ),
      this.pool.query<ReviewRow>(
        `${REVIEW_SELECT}
         WHERE ($1 = 'all' OR item.status = $1)
         ORDER BY CASE WHEN item.status = 'unreviewed' THEN 0 ELSE 1 END,
                  item.occurred_at DESC, item.id DESC
         LIMIT 250`,
        [status],
      ),
    ]);
    return { counts: counts.rows[0] ?? { unreviewed: 0, reviewed: 0, all: 0 }, items: items.rows.map(toReviewItem) };
  }

  /**
   * Records a completed exception or markup change for later supervisor review.
   * It does not inspect, pause or reverse the operational action; it only adds
   * the durable after-the-fact record required by Rule 23.
   */
  async recordReview(input: {
    requestId: number | null; type: SupervisorReviewType; summary: string;
    overriddenRule: string; reason: string; valueAmount: string | null; currency: string | null;
  }, actorUserId: number): Promise<SupervisorReviewItem> {
    if (input.requestId !== null) {
      const request = await this.pool.query("SELECT 1 FROM travel_requests WHERE id = $1", [input.requestId]);
      if (!request.rowCount) throw new NotFoundException("Travel request not found");
    }
    if ((input.valueAmount === null) !== (input.currency === null)) {
      throw new BadRequestException("Amount and currency must be provided together");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO supervisor_review_items
           (travel_request_id, review_type, summary, overridden_rule, reason,
            value_amount, currency, occurred_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text`,
        [input.requestId, input.type, input.summary.trim(), input.overriddenRule.trim(),
         input.reason.trim(), input.valueAmount, input.currency, actorUserId],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error("Failed to record supervisor review item");
      await recordAudit(client, actorUserId, "supervisor_review.recorded", "supervisor_review_item", id, null, input);
      await client.query("COMMIT");
      return this.getReview(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Appends a supervisor decision and updates the queue's current status in one
   * transaction. A reviewed item cannot be silently rewritten; later discussion
   * remains in the audit and immutable review-event histories.
   */
  async review(id: string, outcome: SupervisorReviewOutcome, comment: string, actorUserId: number): Promise<SupervisorReviewItem> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query<ReviewRow>(`${REVIEW_SELECT} WHERE item.id = $1 FOR UPDATE OF item`, [id]);
      const row = before.rows[0];
      if (!row) throw new NotFoundException("Supervisor review item not found");
      if (row.status === "reviewed") throw new ConflictException("This item has already been reviewed");
      await client.query(
        `UPDATE supervisor_review_items
         SET status = 'reviewed', reviewed_by = $2, reviewed_at = now(), outcome = $3, review_comment = $4
         WHERE id = $1`,
        [id, actorUserId, outcome, comment.trim()],
      );
      await client.query(
        `INSERT INTO supervisor_review_events (review_item_id, reviewer_user_id, outcome, comment)
         VALUES ($1,$2,$3,$4)`,
        [id, actorUserId, outcome, comment.trim()],
      );
      await recordAudit(client, actorUserId, "supervisor_review.completed", "supervisor_review_item", id,
        toReviewItem(row), { outcome, comment: comment.trim() });
      await client.query("COMMIT");
      return this.getReview(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Loads one review after a mutation so callers receive the same fully joined
   * representation as the queue rather than a partial INSERT or UPDATE result.
   */
  private async getReview(id: string): Promise<SupervisorReviewItem> {
    const result = await this.pool.query<ReviewRow>(`${REVIEW_SELECT} WHERE item.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Supervisor review item not found");
    return toReviewItem(row);
  }

  /**
   * Reads the configurable markup-review thresholds. They identify which
   * completed changes require attention and never block an operational action.
   */
  async settings(): Promise<{ markupAmountThreshold: string; markupPercentageThreshold: string; currency: string; updatedAt: string }> {
    const result = await this.pool.query<{ markup_amount_threshold: string; markup_percentage_threshold: string; currency: string; updated_at: string }>(
      `SELECT markup_amount_threshold::text, markup_percentage_threshold::text, currency, updated_at
       FROM supervisor_review_settings WHERE id = 1`,
    );
    const row = result.rows[0];
    if (!row) throw new Error("Supervisor review settings are unavailable");
    return { markupAmountThreshold: row.markup_amount_threshold, markupPercentageThreshold: row.markup_percentage_threshold, currency: row.currency, updatedAt: row.updated_at };
  }

  /**
   * Updates the retrospective-review thresholds and records the configuration
   * change for accountability. The values do not introduce an approval gate.
   */
  async updateSettings(input: { markupAmountThreshold: string; markupPercentageThreshold: string; currency: string }, actorUserId: number) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query("SELECT * FROM supervisor_review_settings WHERE id = 1 FOR UPDATE");
      await client.query(
        `UPDATE supervisor_review_settings
         SET markup_amount_threshold = $1, markup_percentage_threshold = $2,
             currency = $3, updated_by = $4, updated_at = now() WHERE id = 1`,
        [input.markupAmountThreshold, input.markupPercentageThreshold, input.currency, actorUserId],
      );
      await recordAudit(client, actorUserId, "supervisor_review.settings_updated", "supervisor_review_settings", 1,
        before.rows[0] ?? null, input);
      await client.query("COMMIT");
      return this.settings();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
