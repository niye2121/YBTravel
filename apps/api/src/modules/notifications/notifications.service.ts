import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type StaffNotificationRecord = {
  id: number;
  type: "request_assigned" | "reminder_due" | "reminder_overdue" | "reminder_escalated" | "whatsapp_message";
  title: string;
  message: string;
  entityType: "travel_request" | "client" | "onboarding_task" | "reminder" | "conversation";
  entityId: string;
  createdByName: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: number;
  notification_type: StaffNotificationRecord["type"];
  title: string;
  message: string;
  entity_type: StaffNotificationRecord["entityType"];
  entity_id: string;
  created_by_name: string | null;
  read_at: string | null;
  created_at: string;
};

function toNotification(row: NotificationRow): StaffNotificationRecord {
  return {
    id: row.id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdByName: row.created_by_name,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

const SELECT_NOTIFICATIONS = `
  SELECT n.id::int AS id, n.notification_type, n.title, n.message,
         n.entity_type, n.entity_id, creator.name AS created_by_name,
         n.read_at, n.created_at
  FROM staff_notifications n
  LEFT JOIN users creator ON creator.id = n.created_by
`;

@Injectable()
export class NotificationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(userId: number, canReadWhatsApp = false) {
    const [itemsResult, unreadResult, inboxResult] = await Promise.all([
      this.pool.query<NotificationRow>(
        `${SELECT_NOTIFICATIONS} WHERE n.user_id = $1 AND ($2 OR n.notification_type <> 'whatsapp_message')
         ORDER BY n.created_at DESC, n.id DESC LIMIT 50`,
        [userId, canReadWhatsApp],
      ),
      this.pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM staff_notifications WHERE user_id = $1 AND read_at IS NULL AND ($2 OR notification_type <> 'whatsapp_message')",
        [userId, canReadWhatsApp],
      ),
      this.pool.query<{ conversation_id: string; count: number }>(
        `SELECT entity_id AS conversation_id, count(*)::int AS count FROM staff_notifications
         WHERE user_id = $1 AND $2 AND read_at IS NULL AND notification_type = 'whatsapp_message' GROUP BY entity_id`,
        [userId, canReadWhatsApp]),
    ]);
    return {
      unreadCount: unreadResult.rows[0]?.count ?? 0,
      notifications: itemsResult.rows.map(toNotification),
      inboxUnreadCount: inboxResult.rows.reduce((sum, row) => sum + row.count, 0),
      inboxUnreadByConversation: Object.fromEntries(inboxResult.rows.map((row) => [row.conversation_id, row.count])),
    };
  }

  async markRead(id: number, userId: number, canReadWhatsApp = false): Promise<StaffNotificationRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const beforeResult = await client.query<NotificationRow>(
        `${SELECT_NOTIFICATIONS} WHERE n.id = $1 AND n.user_id = $2 AND ($3 OR n.notification_type <> 'whatsapp_message') FOR UPDATE OF n`,
        [id, userId, canReadWhatsApp],
      );
      const beforeRow = beforeResult.rows[0];
      if (!beforeRow) throw new NotFoundException("Notification not found");
      if (beforeRow.read_at === null) {
        await client.query(
          "UPDATE staff_notifications SET read_at = now() WHERE id = $1 AND user_id = $2",
          [id, userId],
        );
      }
      const afterResult = await client.query<NotificationRow>(
        `${SELECT_NOTIFICATIONS} WHERE n.id = $1 AND n.user_id = $2`,
        [id, userId],
      );
      const afterRow = afterResult.rows[0];
      if (!afterRow) throw new NotFoundException("Notification not found");
      if (beforeRow.read_at === null) {
        await recordAudit(client, userId, "staff_notification.read", "staff_notification", id,
          toNotification(beforeRow), toNotification(afterRow));
      }
      await client.query("COMMIT");
      return toNotification(afterRow);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async readConversation(userId: number, conversationId: number, throughMessageId: number) {
    const result = await this.pool.query(
      `UPDATE staff_notifications SET read_at = now() WHERE user_id = $1 AND entity_type = 'conversation'
       AND entity_id = $2 AND notification_type = 'whatsapp_message' AND source_message_id <= $3 AND read_at IS NULL`,
      [userId, String(conversationId), throughMessageId]);
    return { updatedCount: result.rowCount ?? 0 };
  }

  async markAllRead(userId: number): Promise<{ updatedCount: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query<{ id: number }>(
        `UPDATE staff_notifications SET read_at = now()
         WHERE user_id = $1 AND read_at IS NULL RETURNING id`,
        [userId],
      );
      if ((updated.rowCount ?? 0) > 0) {
        await recordAudit(client, userId, "staff_notifications.read_all",
          "staff_notification_collection", userId,
          { unreadNotificationIds: updated.rows.map((row) => row.id) },
          { unreadNotificationIds: [] });
      }
      await client.query("COMMIT");
      return { updatedCount: updated.rowCount ?? 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
