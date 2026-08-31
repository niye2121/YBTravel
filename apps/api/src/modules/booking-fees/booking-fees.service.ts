import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { recordAudit } from "../../database/audit";

export type CalculationBasis = "per_passenger" | "per_booking";

export type BookingFeeGroup = {
  id: number;
  name: string;
  code: string;
  amount: string;
  currency: string;
  calculationBasis: CalculationBasis;
  chargeAdults: boolean;
  chargeChildren: boolean;
  chargeInfants: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingFeeGroupInput = Omit<BookingFeeGroup, "id" | "createdAt" | "updatedAt">;

type BookingFeeGroupRow = {
  id: number;
  name: string;
  code: string;
  amount: string;
  currency: string;
  calculation_basis: CalculationBasis;
  charge_adults: boolean;
  charge_children: boolean;
  charge_infants: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toBookingFeeGroup(row: BookingFeeGroupRow): BookingFeeGroup {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    amount: row.amount,
    currency: row.currency,
    calculationBasis: row.calculation_basis,
    chargeAdults: row.charge_adults,
    chargeChildren: row.charge_children,
    chargeInfants: row.charge_infants,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_FEE_GROUP = `
  SELECT id, name, code, amount::text, currency, calculation_basis,
         charge_adults, charge_children, charge_infants, active,
         created_at, updated_at
  FROM booking_fee_groups
`;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

@Injectable()
export class BookingFeesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(activeOnly: boolean): Promise<BookingFeeGroup[]> {
    await this.ensureDemoDefaults();
    const where = activeOnly ? "WHERE active = true" : "";
    const result = await this.pool.query<BookingFeeGroupRow>(
      `${SELECT_FEE_GROUP} ${where} ORDER BY name ASC`,
    );
    return result.rows.map(toBookingFeeGroup);
  }

  /**
   * Provide safe, editable starter records for a fresh Phase 1 deployment.
   * The empty-table guard and unique constraints make this idempotent: it
   * never replaces administrator changes and never duplicates the records.
   * Amounts are demonstration values and must be confirmed before live use.
   */
  private async ensureDemoDefaults(): Promise<void> {
    await this.pool.query(`
      INSERT INTO booking_fee_groups
        (name, code, amount, currency, calculation_basis,
         charge_adults, charge_children, charge_infants, active)
      SELECT seed.*
      FROM (VALUES
        ('Standard', 'standard', 50.00::numeric, 'USD', 'per_passenger', true, true, false, true),
        ('Belev Echad', 'belev_echad', 25.00::numeric, 'USD', 'per_passenger', true, true, false, true),
        ('Scheiman', 'scheiman', 75.00::numeric, 'USD', 'per_booking', true, true, false, true)
      ) AS seed(name, code, amount, currency, calculation_basis,
                charge_adults, charge_children, charge_infants, active)
      WHERE NOT EXISTS (SELECT 1 FROM booking_fee_groups)
      ON CONFLICT DO NOTHING
    `);
  }

  async create(input: BookingFeeGroupInput, actorUserId: number): Promise<BookingFeeGroup> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<BookingFeeGroupRow>(
        `INSERT INTO booking_fee_groups
           (name, code, amount, currency, calculation_basis,
            charge_adults, charge_children, charge_infants, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name, code, amount::text, currency, calculation_basis,
                   charge_adults, charge_children, charge_infants, active,
                   created_at, updated_at`,
        [
          input.name,
          input.code,
          input.amount,
          input.currency,
          input.calculationBasis,
          input.chargeAdults,
          input.chargeChildren,
          input.chargeInfants,
          input.active,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create booking fee group");
      const created = toBookingFeeGroup(row);
      await recordAudit(
        client,
        actorUserId,
        "booking_fee_group.created",
        "booking_fee_group",
        created.id,
        null,
        created,
      );
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new ConflictException("A booking fee group with this name or code already exists");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: number, input: BookingFeeGroupInput, actorUserId: number): Promise<BookingFeeGroup> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query<BookingFeeGroupRow>(
        `${SELECT_FEE_GROUP} WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const existingRow = existingResult.rows[0];
      if (!existingRow) throw new NotFoundException("Booking fee group not found");

      const result = await client.query<BookingFeeGroupRow>(
        `UPDATE booking_fee_groups
         SET name = $2,
             code = $3,
             amount = $4,
             currency = $5,
             calculation_basis = $6,
             charge_adults = $7,
             charge_children = $8,
             charge_infants = $9,
             active = $10,
             updated_at = now()
         WHERE id = $1
         RETURNING id, name, code, amount::text, currency, calculation_basis,
                   charge_adults, charge_children, charge_infants, active,
                   created_at, updated_at`,
        [
          id,
          input.name,
          input.code,
          input.amount,
          input.currency,
          input.calculationBasis,
          input.chargeAdults,
          input.chargeChildren,
          input.chargeInfants,
          input.active,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException("Booking fee group not found");
      const updated = toBookingFeeGroup(row);
      await recordAudit(
        client,
        actorUserId,
        "booking_fee_group.updated",
        "booking_fee_group",
        updated.id,
        toBookingFeeGroup(existingRow),
        updated,
      );
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new ConflictException("A booking fee group with this name or code already exists");
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
