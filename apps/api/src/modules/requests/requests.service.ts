import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type TravelRequestRecord = {
  id: number;
  requestNumber: string;
  clientId: number;
  clientName: string;
  tripSummary: string;
  status: string;
  createdAt: string;
};

type RequestRow = {
  id: number;
  request_number: string;
  client_id: number;
  client_name: string;
  trip_summary: string;
  status: string;
  created_at: string;
};

function toRequest(row: RequestRow): TravelRequestRecord {
  return {
    id: row.id,
    requestNumber: row.request_number,
    clientId: row.client_id,
    clientName: row.client_name,
    tripSummary: row.trip_summary,
    status: row.status,
    createdAt: row.created_at,
  };
}

const SELECT_REQUESTS = `
  SELECT r.id, r.request_number, r.client_id, c.name AS client_name,
         r.trip_summary, r.status, r.created_at
  FROM travel_requests r
  JOIN clients c ON c.id = r.client_id
`;

@Injectable()
export class RequestsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(): Promise<TravelRequestRecord[]> {
    const result = await this.pool.query<RequestRow>(
      `${SELECT_REQUESTS} ORDER BY r.created_at DESC, r.id DESC`,
    );
    return result.rows.map(toRequest);
  }

  async create(clientId: number, tripSummary: string, actorUserId: number): Promise<TravelRequestRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const clientExists = await client.query("SELECT 1 FROM clients WHERE id = $1", [clientId]);
      if ((clientExists.rowCount ?? 0) === 0) throw new BadRequestException("Client not found");

      const inserted = await client.query<{ id: number }>(
        `INSERT INTO travel_requests (client_id, trip_summary, created_by)
         VALUES ($1, $2, $3) RETURNING id`,
        [clientId, tripSummary, actorUserId],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error("Failed to create travel request");
      const loaded = await client.query<RequestRow>(`${SELECT_REQUESTS} WHERE r.id = $1`, [id]);
      const row = loaded.rows[0];
      if (!row) throw new Error("Failed to load travel request");
      const created = toRequest(row);
      await recordAudit(
        client,
        actorUserId,
        "travel_request.created",
        "travel_request",
        id,
        null,
        created,
      );
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
