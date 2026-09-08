import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";

type AuditFilters = {
  q?: string;
  actorUserId?: number;
  clientId?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  importantOnly: boolean;
  page: number;
};

type UnifiedAuditRow = {
  event_kind: "change" | "access";
  event_id: string;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
};

const PAGE_SIZE = 50;
const IMPORTANT_SQL = `(
  event_kind = 'access'
  OR action ~* '(permission|secret|test_data|deleted|supervisor_review|assignment_override|employee\\.(created|updated)|whatsapp\\.account)'
  OR entity_type IN ('user', 'system_settings', 'ai_provider_settings', 'assignment_settings')
)`;

const UNIFIED_EVENTS_SQL = `
  SELECT 'change'::text AS event_kind, event.id::text AS event_id,
         event.actor_user_id, actor.name AS actor_name, actor.email AS actor_email,
         event.action, event.entity_type, event.entity_id,
         event.before_state, event.after_state, event.created_at
  FROM audit_events event
  LEFT JOIN users actor ON actor.id = event.actor_user_id
  UNION ALL
  SELECT 'access'::text AS event_kind, access.id::text AS event_id,
         access.actor_user_id, actor.name AS actor_name, actor.email AS actor_email,
         'sensitive_access.' || access.action AS action,
         access.resource_type AS entity_type, access.resource_id AS entity_id,
         NULL::jsonb AS before_state,
         jsonb_build_object('fieldsAccessed', access.fields_accessed, 'purpose', access.purpose) AS after_state,
         access.created_at
  FROM sensitive_access_events access
  LEFT JOIN users actor ON actor.id = access.actor_user_id
`;

/** Formats an audit instant in the operations desk's Brooklyn timezone. */
function deskTimeLabel(value: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  }).format(new Date(value));
}

/** Identifies values that must never be returned from an audit endpoint. */
function isSecretField(field: string): boolean {
  const normalized = field.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.includes("password") || [
    "authkey", "accesstoken", "refreshtoken", "token", "apikey", "secret", "secretvalue",
    "passphrase", "privatekey", "passportnumber", "authorization", "cookie", "sessionid",
  ].includes(normalized);
}

/** Recursively redacts secret-bearing properties before state leaves the API. */
function sanitizeState(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeState);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key, isSecretField(key) ? "[REDACTED]" : sanitizeState(child),
  ]));
}

/** Flattens a JSON object into readable field paths for before/after comparison. */
function flattenState(value: unknown, prefix = "", output = new Map<string, unknown>(), depth = 0): Map<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value) && depth < 5) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0 && prefix) output.set(prefix, value);
    for (const [key, child] of entries) flattenState(child, prefix ? `${prefix}.${key}` : key, output, depth + 1);
  } else if (prefix) {
    output.set(prefix, value);
  }
  return output;
}

/** Converts any audit value into compact text suitable for a change table. */
function auditValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  const rendered = typeof value === "string" ? value : JSON.stringify(value);
  return rendered.length > 800 ? `${rendered.slice(0, 797)}…` : rendered;
}

/** Produces only the fields whose sanitized values differ. */
function buildChanges(beforeState: unknown, afterState: unknown) {
  const before = flattenState(sanitizeState(beforeState));
  const after = flattenState(sanitizeState(afterState));
  return [...new Set([...before.keys(), ...after.keys()])].sort().flatMap((field) => {
    const beforeValue = auditValue(before.get(field));
    const afterValue = auditValue(after.get(field));
    return beforeValue === afterValue ? [] : [{ field, before: beforeValue, after: afterValue }];
  }).slice(0, 100);
}

/** Classifies security-sensitive and high-impact events without claiming misconduct. */
function importanceFor(row: UnifiedAuditRow): { importance: "important" | "standard"; reason: string | null } {
  if (row.event_kind === "access") return { importance: "important", reason: "Protected information was accessed" };
  if (/permission|secret|test_data|deleted/i.test(row.action)) return { importance: "important", reason: "Security or destructive system change" };
  if (/supervisor_review|assignment_override/i.test(row.action)) return { importance: "important", reason: "Operational exception or override" };
  if (["user", "system_settings", "ai_provider_settings", "assignment_settings"].includes(row.entity_type)) {
    return { importance: "important", reason: "User access or system configuration changed" };
  }
  return { importance: "standard", reason: null };
}

@Injectable()
export class AuditHistoryService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Searches and paginates the unified administrator audit history. */
  async list(filters: AuditFilters) {
    const values: unknown[] = [];
    const conditions: string[] = [];
    const parameter = (value: unknown) => { values.push(value); return `$${values.length}`; };

    if (filters.q) {
      const token = parameter(`%${filters.q}%`);
      conditions.push(`(action ILIKE ${token} OR entity_type ILIKE ${token} OR entity_id ILIKE ${token} OR COALESCE(actor_name, 'System') ILIKE ${token} OR COALESCE(actor_email, '') ILIKE ${token})`);
    }
    if (filters.actorUserId) conditions.push(`actor_user_id = ${parameter(filters.actorUserId)}`);
    if (filters.clientId) {
      const client = parameter(filters.clientId);
      // Compare typed record references, never unrelated numeric IDs. Retained
      // document rows include deleted attachments; snapshots preserve old links.
      conditions.push(`(
        before_state->>'clientId' = ${client}::text OR after_state->>'clientId' = ${client}::text
        OR EXISTS (
          SELECT 1 FROM (
            SELECT 'client' AS kind, ${client}::text AS id
            UNION ALL SELECT 'travel_request', id::text FROM travel_requests WHERE client_id = ${client}::int
            UNION ALL SELECT 'traveller', traveller_id::text FROM traveller_accounts WHERE client_id = ${client}::int
            UNION ALL SELECT 'traveller_passport', traveller_id::text FROM traveller_accounts WHERE client_id = ${client}::int
            UNION ALL SELECT 'entity_document', id::text FROM entity_documents WHERE client_id = ${client}::int
            UNION ALL SELECT 'entity_note', id::text FROM entity_notes WHERE client_id = ${client}::int
            UNION ALL SELECT 'conversation', id::text FROM conversations WHERE client_id = ${client}::int
            UNION ALL SELECT 'message', m.id::text FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.client_id = ${client}::int
            UNION ALL SELECT 'staff_reminder', id::text FROM staff_reminders WHERE client_id = ${client}::int
          ) related WHERE related.kind = unified_events.entity_type AND related.id = unified_events.entity_id
        )
        OR (entity_type = 'information_field_review' AND (
          split_part(entity_id, ':', 2) = 'client' AND split_part(entity_id, ':', 3) = ${client}::text
          OR split_part(entity_id, ':', 2) = 'traveller' AND split_part(entity_id, ':', 3) IN
            (SELECT traveller_id::text FROM traveller_accounts WHERE client_id = ${client}::int)
        ))
      )`);
    }
    if (filters.action) conditions.push(`action = ${parameter(filters.action)}`);
    if (filters.dateFrom) conditions.push(`(created_at AT TIME ZONE 'America/New_York')::date >= ${parameter(filters.dateFrom)}::date`);
    if (filters.dateTo) conditions.push(`(created_at AT TIME ZONE 'America/New_York')::date <= ${parameter(filters.dateTo)}::date`);
    if (filters.importantOnly) conditions.push(IMPORTANT_SQL);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offsetParameter = parameter((filters.page - 1) * PAGE_SIZE);

    const [eventsResult, facetsResult] = await Promise.all([
      this.pool.query<UnifiedAuditRow & { total_count: string }>(
        `WITH unified_events AS (${UNIFIED_EVENTS_SQL})
         SELECT *, COUNT(*) OVER()::text AS total_count
         FROM unified_events ${where}
         ORDER BY created_at DESC, event_kind, event_id DESC
         LIMIT ${PAGE_SIZE} OFFSET ${offsetParameter}`,
        values,
      ),
      this.pool.query(
        `WITH unified_events AS (${UNIFIED_EVENTS_SQL})
         SELECT
           (SELECT COALESCE(jsonb_agg(actor ORDER BY actor->>'name'), '[]'::jsonb)
              FROM (SELECT DISTINCT jsonb_build_object('id', actor_user_id, 'name', COALESCE(actor_name, 'System'), 'email', actor_email) actor
                    FROM unified_events WHERE actor_user_id IS NOT NULL) actors) AS actors,
           (SELECT COALESCE(jsonb_agg(action ORDER BY action), '[]'::jsonb)
              FROM (SELECT DISTINCT action FROM unified_events) actions) AS actions,
           (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY lower(name), id), '[]'::jsonb)
              FROM clients) AS clients`,
      ),
    ]);

    const total = Number(eventsResult.rows[0]?.total_count ?? 0);
    return {
      items: eventsResult.rows.map((row) => ({
        id: `${row.event_kind}-${row.event_id}`,
        eventKind: row.event_kind,
        actorUserId: row.actor_user_id,
        actorName: row.actor_name ?? "System",
        actorEmail: row.actor_email,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        occurredAt: row.created_at,
        occurredAtLabel: deskTimeLabel(row.created_at),
        changes: buildChanges(row.before_state, row.after_state),
        ...importanceFor(row),
      })),
      actors: facetsResult.rows[0]?.actors ?? [],
      actions: facetsResult.rows[0]?.actions ?? [],
      clients: facetsResult.rows[0]?.clients ?? [],
      page: filters.page,
      pageSize: PAGE_SIZE,
      total,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }
}
