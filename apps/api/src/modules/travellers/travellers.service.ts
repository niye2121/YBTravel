import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type { CreateTravellerInput, PassportStatus, Traveller, TravellerClientLink } from "@yb-travel/shared";
import { PG_POOL } from "../../database/database.module";

type TravellerRow = {
  id: number;
  name: string;
  dob: string | null;
  passport_status: string;
  created_at: string;
  clients: TravellerClientLink[];
};

/**
 * json_agg + json_build_object assembles each traveller's linked-client
 * list in one query instead of N+1 lookups — pg parses the json column
 * into a plain JS array automatically. The FILTER clause keeps a
 * traveller with zero links from getting a one-element array of nulls.
 */
const SELECT_TRAVELLER = `
  SELECT t.id, t.name, t.dob, t.passport_status, t.created_at,
         COALESCE(
           json_agg(
             json_build_object('clientId', c.id, 'clientName', c.name, 'relationship', ta.relationship)
           ) FILTER (WHERE c.id IS NOT NULL),
           '[]'
         ) AS clients
  FROM travellers t
  LEFT JOIN traveller_accounts ta ON ta.traveller_id = t.id
  LEFT JOIN clients c ON c.id = ta.client_id
`;

function toTraveller(row: TravellerRow): Traveller {
  return {
    id: row.id,
    name: row.name,
    dob: row.dob,
    passportStatus: row.passport_status as PassportStatus,
    createdAt: row.created_at,
    clients: row.clients,
  };
}

@Injectable()
export class TravellersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(): Promise<Traveller[]> {
    const result = await this.pool.query<TravellerRow>(
      `${SELECT_TRAVELLER} GROUP BY t.id ORDER BY t.name ASC`,
    );
    return result.rows.map(toTraveller);
  }

  async create(input: CreateTravellerInput): Promise<Traveller> {
    const inserted = await this.pool.query<{ id: number }>(
      `INSERT INTO travellers (name, dob, passport_status) VALUES ($1, $2, $3) RETURNING id`,
      [input.name, input.dob ?? null, input.passportStatus],
    );
    const id = inserted.rows[0]?.id;
    if (!id) throw new Error("Failed to create traveller");

    for (const link of input.links) {
      await this.pool.query(
        `INSERT INTO traveller_accounts (client_id, traveller_id, relationship)
         VALUES ($1, $2, $3)
         ON CONFLICT (client_id, traveller_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
        [link.clientId, id, link.relationship ?? null],
      );
    }

    const result = await this.pool.query<TravellerRow>(
      `${SELECT_TRAVELLER} WHERE t.id = $1 GROUP BY t.id`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to load created traveller");
    return toTraveller(row);
  }
}
