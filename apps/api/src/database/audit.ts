import type { Pool, PoolClient } from "pg";

/**
 * Shared transactional audit writer. Call this with the same PoolClient and
 * transaction as the domain mutation so a committed change always has its
 * actor, action, and before/after state recorded with it.
 */
export async function recordAudit(
  client: Pool | PoolClient,
  actorUserId: number,
  action: string,
  entityType: string,
  entityId: number | string,
  beforeState: unknown,
  afterState: unknown,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events
       (actor_user_id, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      actorUserId,
      action,
      entityType,
      String(entityId),
      beforeState === null ? null : JSON.stringify(beforeState),
      afterState === null ? null : JSON.stringify(afterState),
    ],
  );
}
