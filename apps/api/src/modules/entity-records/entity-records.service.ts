import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type EntityNote = {
  id: string; clientId: number; travelRequestId: number | null; body: string;
  createdByName: string | null; createdAt: string; updatedAt: string;
};
export type EntityDocument = {
  id: string; clientId: number; travelRequestId: number | null; fileName: string;
  mimeType: string; sizeBytes: number; sha256: string; description: string | null;
  uploadedByName: string | null; createdAt: string;
};
export type RecordActivity = {
  id: string; type: "note" | "document" | "message"; title: string; detail: string;
  actorName: string | null; occurredAt: string; direction?: "inbound" | "outbound";
};

const NOTE_SELECT = `SELECT n.id::text, n.client_id, n.travel_request_id, n.body,
  u.name AS created_by_name, n.created_at, n.updated_at
  FROM entity_notes n LEFT JOIN users u ON u.id = n.created_by`;
const DOCUMENT_SELECT = `SELECT d.id::text, d.client_id, d.travel_request_id, d.file_name,
  d.mime_type, d.size_bytes, d.sha256, d.description, u.name AS uploaded_by_name, d.created_at
  FROM entity_documents d LEFT JOIN users u ON u.id = d.uploaded_by`;

function note(row: any): EntityNote {
  return { id: row.id, clientId: row.client_id, travelRequestId: row.travel_request_id, body: row.body,
    createdByName: row.created_by_name, createdAt: row.created_at, updatedAt: row.updated_at };
}
function document(row: any): EntityDocument {
  return { id: row.id, clientId: row.client_id, travelRequestId: row.travel_request_id,
    fileName: row.file_name, mimeType: row.mime_type, sizeBytes: row.size_bytes, sha256: row.sha256,
    description: row.description, uploadedByName: row.uploaded_by_name, createdAt: row.created_at };
}

@Injectable()
export class EntityRecordsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async resolveScope(clientId: number, requestId: number | null) {
    const result = requestId
      ? await this.pool.query("SELECT client_id FROM travel_requests WHERE id = $1", [requestId])
      : await this.pool.query("SELECT id AS client_id FROM clients WHERE id = $1", [clientId]);
    const actualClientId = result.rows[0]?.client_id;
    if (!actualClientId) throw new NotFoundException(requestId ? "Travel request not found" : "Client not found");
    if (Number(actualClientId) !== clientId) throw new BadRequestException("Request does not belong to this client");
  }

  async clientIdForRequest(requestId: number): Promise<number> {
    const result = await this.pool.query("SELECT client_id FROM travel_requests WHERE id = $1", [requestId]);
    const clientId = result.rows[0]?.client_id;
    if (!clientId) throw new NotFoundException("Travel request not found");
    return Number(clientId);
  }

  async listNotes(clientId: number, requestId: number | null): Promise<EntityNote[]> {
    await this.resolveScope(clientId, requestId);
    const where = requestId ? "n.travel_request_id = $1" : "n.client_id = $1 AND n.travel_request_id IS NULL";
    return (await this.pool.query(`${NOTE_SELECT} WHERE ${where} ORDER BY n.created_at DESC, n.id DESC`, [requestId ?? clientId])).rows.map(note);
  }

  async addNote(clientId: number, requestId: number | null, body: string, actorUserId: number): Promise<EntityNote> {
    await this.resolveScope(clientId, requestId);
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      const inserted = (await db.query(
        `INSERT INTO entity_notes (client_id, travel_request_id, body, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4) RETURNING id`, [clientId, requestId, body.trim(), actorUserId])).rows[0];
      await recordAudit(db, actorUserId, "entity_note.created", "entity_note", inserted.id, null,
        { clientId, travelRequestId: requestId, characterCount: body.trim().length });
      const row = (await db.query(`${NOTE_SELECT} WHERE n.id = $1`, [inserted.id])).rows[0];
      await db.query("COMMIT");
      return note(row);
    } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
  }

  async listDocuments(clientId: number, requestId: number | null): Promise<EntityDocument[]> {
    await this.resolveScope(clientId, requestId);
    const where = requestId ? "d.travel_request_id = $1" : "d.client_id = $1 AND d.travel_request_id IS NULL";
    return (await this.pool.query(`${DOCUMENT_SELECT} WHERE ${where} ORDER BY d.created_at DESC, d.id DESC`, [requestId ?? clientId])).rows.map(document);
  }

  async addDocument(clientId: number, requestId: number | null, file: { originalname: string; mimetype: string; buffer: Buffer; size: number }, description: string | null, actorUserId: number): Promise<EntityDocument> {
    await this.resolveScope(clientId, requestId);
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowed.has(file.mimetype)) throw new BadRequestException("Upload a PDF, JPEG, or PNG document");
    if (!file.buffer.length || file.size > 10 * 1024 * 1024) throw new BadRequestException("Documents must be between 1 byte and 10 MB");
    const signatureOk = file.mimetype === "application/pdf" ? file.buffer.subarray(0, 5).toString() === "%PDF-"
      : file.mimetype === "image/png" ? file.buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : file.buffer[0] === 0xff && file.buffer[1] === 0xd8;
    if (!signatureOk) throw new BadRequestException("The document contents do not match its file type");
    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const safeName = file.originalname.replace(/[\\/\0]/g, "_").slice(0, 180) || "document";
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      const inserted = (await db.query(
        `INSERT INTO entity_documents
           (client_id, travel_request_id, file_name, mime_type, size_bytes, sha256, content, description, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [clientId, requestId, safeName, file.mimetype, file.size, sha256, file.buffer, description?.trim() || null, actorUserId])).rows[0];
      await recordAudit(db, actorUserId, "entity_document.uploaded", "entity_document", inserted.id, null,
        { clientId, travelRequestId: requestId, fileName: safeName, mimeType: file.mimetype, sizeBytes: file.size, sha256 });
      const row = (await db.query(`${DOCUMENT_SELECT} WHERE d.id = $1`, [inserted.id])).rows[0];
      await db.query("COMMIT");
      return document(row);
    } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
  }

  async downloadDocument(id: number, actorUserId: number) {
    const result = await this.pool.query(
      "SELECT id, file_name, mime_type, content, sha256 FROM entity_documents WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Document not found");
    await this.pool.query(
      `INSERT INTO sensitive_access_events
         (actor_user_id, resource_type, resource_id, action, fields_accessed, purpose)
       VALUES ($1, 'entity_document', $2, 'download', ARRAY['content'], 'Operational client/request document access')`,
      [actorUserId, String(id)],
    );
    return { fileName: row.file_name as string, mimeType: row.mime_type as string, content: row.content as Buffer, sha256: row.sha256 as string };
  }

  async activity(clientId: number, requestId: number | null): Promise<RecordActivity[]> {
    await this.resolveScope(clientId, requestId);
    const [notes, documents, messages] = await Promise.all([
      this.listNotes(clientId, requestId), this.listDocuments(clientId, requestId),
      this.pool.query(
        `SELECT DISTINCT m.id::text, m.direction, m.message_type, m.body, m.created_at
         FROM messages m JOIN conversations c ON c.id = m.conversation_id
         LEFT JOIN whatsapp_groups g ON g.conversation_id = c.id
         LEFT JOIN ai_draft_intakes draft ON draft.conversation_id = c.id
         LEFT JOIN travel_requests source_request ON source_request.source_draft_intake_id = draft.id
         WHERE ${requestId ? "(g.travel_request_id = $1 OR source_request.id = $1)" : "(c.client_id = $1 OR g.client_id = $1)"}
         ORDER BY m.created_at DESC LIMIT 100`, [requestId ?? clientId]),
    ]);
    const items: RecordActivity[] = [
      ...notes.map((item) => ({ id: `note-${item.id}`, type: "note" as const, title: "Internal note", detail: item.body, actorName: item.createdByName, occurredAt: item.createdAt })),
      ...documents.map((item) => ({ id: `document-${item.id}`, type: "document" as const, title: `Document: ${item.fileName}`, detail: item.description ?? `${item.mimeType} · ${item.sizeBytes} bytes`, actorName: item.uploadedByName, occurredAt: item.createdAt })),
      ...messages.rows.map((row) => ({ id: `message-${row.id}`, type: "message" as const, title: `${row.direction === "inbound" ? "Received" : "Sent"} WhatsApp ${row.message_type === "audio" ? "voice note" : "message"}`, detail: row.message_type === "audio" ? "Voice note" : row.body, actorName: null, occurredAt: row.created_at, direction: row.direction })),
    ];
    return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 100);
  }
}
