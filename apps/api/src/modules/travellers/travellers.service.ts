import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { createHmac } from "node:crypto";
import type { CreateTravellerInput, PassportStatus, Traveller, TravellerClientLink } from "@yb-travel/shared";
import { PG_POOL } from "../../database/database.module";
import { loadEnv } from "../../config/env";

export type SensitiveAccessEvent = {
  id: number; actorUserId: number; actorName: string; action: string;
  fieldsAccessed: string[]; purpose: string; createdAt: string;
};

type TravellerRow = {
  id: number;
  name: string;
  dob: string | null;
  title: string | null;
  gender: string | null;
  nationality: string | null;
  passport_status: string;
  passport_number: string | null;
  passport_issuing_country: string | null;
  passport_expires_on: string | null;
  created_at: string;
  is_demo: boolean;
  clients: TravellerClientLink[];
};

/**
 * json_agg + json_build_object assembles each traveller's linked-client
 * list in one query instead of N+1 lookups — pg parses the json column
 * into a plain JS array automatically. The FILTER clause keeps a
 * traveller with zero links from getting a one-element array of nulls.
 */
const SELECT_TRAVELLER = `
  SELECT t.id, t.name, to_char(t.dob, 'YYYY-MM-DD') AS dob, t.title, t.gender, t.nationality,
         t.passport_status, t.passport_number, t.passport_issuing_country,
         to_char(t.passport_expires_on, 'YYYY-MM-DD') AS passport_expires_on,
         t.created_at, t.is_demo,
         COALESCE(
           json_agg(
             json_build_object('clientId', c.id, 'clientName', c.name, 'relationship', ta.relationship)
           ) FILTER (WHERE c.id IS NOT NULL),
           '[]'
         ) AS clients
  FROM travellers t
  LEFT JOIN traveller_accounts ta ON ta.traveller_id = t.id
  LEFT JOIN clients c ON c.id = ta.client_id
    AND (NOT c.is_demo OR COALESCE((SELECT demo_data_enabled FROM system_settings WHERE id = 1), false))
`;

function toTraveller(row: TravellerRow): Traveller {
  return {
    id: row.id,
    name: row.name,
    dob: row.dob,
    title: row.title,
    gender: row.gender,
    nationality: row.nationality,
    passportStatus: row.passport_status as PassportStatus,
    passportNumber: row.passport_number,
    passportIssuingCountry: row.passport_issuing_country,
    passportExpiresOn: row.passport_expires_on,
    createdAt: row.created_at,
    isDemo: row.is_demo,
    clients: row.clients,
  };
}

@Injectable()
export class TravellersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private ipHash(ipAddress: string | undefined): string | null {
    if (!ipAddress) return null;
    return createHmac("sha256", loadEnv().JWT_SECRET).update(ipAddress).digest("hex");
  }

  private async recordSensitiveAccess(
    client: import("pg").PoolClient,
    actorUserId: number,
    travellerId: number,
    action: "view" | "create" | "update" | "download",
    fields: string[],
    purpose: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO sensitive_access_events
         (actor_user_id, resource_type, resource_id, action, fields_accessed, purpose, ip_hash, user_agent)
       VALUES ($1, 'traveller_passport', $2, $3, $4, $5, $6, $7)`,
      [actorUserId, String(travellerId), action, fields, purpose, this.ipHash(ipAddress), userAgent?.slice(0, 500) ?? null],
    );
  }

  async list(): Promise<Traveller[]> {
    const result = await this.pool.query<TravellerRow>(
      `${SELECT_TRAVELLER}
       WHERE NOT t.is_demo
          OR COALESCE((SELECT demo_data_enabled FROM system_settings WHERE id = 1), false)
       GROUP BY t.id ORDER BY t.name ASC`,
    );
    return result.rows.map((row) => ({
      ...toTraveller(row),
      passportNumber: null,
      passportIssuingCountry: null,
      passportExpiresOn: null,
    }));
  }

  async getById(id: number, actorUserId: number, ipAddress?: string, userAgent?: string): Promise<Traveller> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<TravellerRow>(
      `${SELECT_TRAVELLER}
       WHERE t.id = $1
         AND (NOT t.is_demo
           OR COALESCE((SELECT demo_data_enabled FROM system_settings WHERE id = 1), false))
       GROUP BY t.id`,
      [id],
    );
      const row = result.rows[0];
      if (!row) throw new NotFoundException("Traveller not found");
      await this.recordSensitiveAccess(client, actorUserId, id, "view",
        ["passportStatus", "passportNumber", "passportIssuingCountry", "passportExpiresOn"],
        "traveller_profile_view", ipAddress, userAgent);
      await client.query("COMMIT");
      return toTraveller(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async create(input: CreateTravellerInput, actorUserId: number, ipAddress?: string, userAgent?: string): Promise<Traveller> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const link of input.links) {
        const clientResult = await client.query<{ is_demo: boolean }>(
          "SELECT is_demo FROM clients WHERE id = $1",
          [link.clientId],
        );
        if (clientResult.rows[0]?.is_demo) {
          throw new BadRequestException("Demo clients are read-only");
        }
      }
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO travellers
           (name, dob, title, gender, nationality, passport_status, passport_number,
            passport_issuing_country, passport_expires_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.name, input.dob, input.title ?? null, input.gender ?? null,
          input.nationality ?? null, input.passportStatus, input.passportNumber ?? null,
          input.passportIssuingCountry ?? null, input.passportExpiresOn ?? null,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error("Failed to create traveller");

      for (const link of input.links) {
        await client.query(
          `INSERT INTO traveller_accounts (client_id, traveller_id, relationship)
           VALUES ($1, $2, $3)
           ON CONFLICT (client_id, traveller_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
          [link.clientId, id, link.relationship ?? null],
        );
      }

      const result = await client.query<TravellerRow>(
        `${SELECT_TRAVELLER} WHERE t.id = $1 GROUP BY t.id`,
        [id],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to load created traveller");
      await this.recordSensitiveAccess(client, actorUserId, id, "create",
        ["passportStatus", "passportNumber", "passportIssuingCountry", "passportExpiresOn"],
        "traveller_profile_creation", ipAddress, userAgent);
      await client.query("COMMIT");
      return toTraveller(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getSensitiveAccessHistory(travellerId: number): Promise<SensitiveAccessEvent[]> {
    const result = await this.pool.query<{
      id: number; actor_user_id: number; actor_name: string; action: string;
      fields_accessed: string[]; purpose: string; created_at: string;
    }>(
      `SELECT e.id, e.actor_user_id, u.name AS actor_name, e.action,
              e.fields_accessed, e.purpose, e.created_at
       FROM sensitive_access_events e JOIN users u ON u.id = e.actor_user_id
       WHERE e.resource_type = 'traveller_passport' AND e.resource_id = $1
       ORDER BY e.created_at DESC, e.id DESC LIMIT 200`,
      [String(travellerId)],
    );
    return result.rows.map((row) => ({ id: row.id, actorUserId: row.actor_user_id,
      actorName: row.actor_name, action: row.action, fieldsAccessed: row.fields_accessed,
      purpose: row.purpose, createdAt: row.created_at }));
  }
}
