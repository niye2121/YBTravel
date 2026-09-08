import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { StaffPermission } from "@yb-travel/shared";
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
export type PassengerCategory = "adult" | "child" | "infant";
export type RequestBookingFee = {
  requestId: number;
  feeGroup: BookingFeeGroup;
  availableTravellers: Array<{ id: number; name: string; dob: string | null }>;
  passengers: Array<{ travellerId: number; name: string; category: PassengerCategory; charged: boolean; feeAmount: string }>;
  chargedUnits: number;
  totalAmount: string;
  currency: string;
  calculatedAt: string | null;
};

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

  async getRequestFee(requestId: number): Promise<RequestBookingFee> {
    const context = await this.requestContext(requestId);
    const selected = await this.pool.query<{ traveller_id: number; name: string; passenger_category: PassengerCategory }>(
      `SELECT rt.traveller_id, t.name, rt.passenger_category
       FROM travel_request_travellers rt JOIN travellers t ON t.id = rt.traveller_id
       WHERE rt.travel_request_id = $1 ORDER BY t.name, t.id`, [requestId]);
    const latest = await this.pool.query<{ line_items: any[]; charged_units: number; total_amount: string; calculated_at: string;
      fee_group_name: string; fee_group_code: string; amount: string; currency: string; calculation_basis: CalculationBasis }>(
      `SELECT line_items, charged_units, total_amount::text, calculated_at, fee_group_name,
              fee_group_code, amount::text, currency, calculation_basis
       FROM request_booking_fee_quotes WHERE travel_request_id = $1
       ORDER BY calculated_at DESC, id DESC LIMIT 1`, [requestId]);
    const latestRow = latest.rows[0];
    const quoted = new Map((latestRow?.line_items ?? []).map((item) => [Number(item.travellerId), item]));
    return {
      requestId,
      feeGroup: latestRow ? { ...context.feeGroup, name: latestRow.fee_group_name, code: latestRow.fee_group_code,
        amount: latestRow.amount, currency: latestRow.currency, calculationBasis: latestRow.calculation_basis } : context.feeGroup,
      availableTravellers: context.travellers,
      passengers: selected.rows.map((item) => ({ travellerId: item.traveller_id, name: item.name,
        category: item.passenger_category, charged: Boolean(quoted.get(item.traveller_id)?.charged),
        feeAmount: String(quoted.get(item.traveller_id)?.feeAmount ?? "0.00") })),
      chargedUnits: latestRow?.charged_units ?? 0,
      totalAmount: latestRow?.total_amount ?? "0.00",
      currency: context.feeGroup.currency,
      calculatedAt: latestRow?.calculated_at ?? null,
    };
  }

  async saveRequestFee(
    requestId: number,
    passengers: Array<{ travellerId: number; category: PassengerCategory }>,
    actorUserId: number,
    actorPermissions: readonly StaffPermission[],
  ): Promise<RequestBookingFee> {
    if (passengers.length === 0) throw new BadRequestException("Select at least one traveller");
    if (new Set(passengers.map((item) => item.travellerId)).size !== passengers.length) throw new BadRequestException("A traveller can be selected only once");
    const ownership = await this.pool.query<{ assigned_user_id: number | null }>(
      "SELECT assigned_user_id FROM travel_requests WHERE id = $1",
      [requestId],
    );
    if (!ownership.rows[0]) throw new NotFoundException("Travel request not found");
    if (!actorPermissions.includes("requests.assign_any") && ownership.rows[0].assigned_user_id !== actorUserId) {
      throw new ForbiddenException("You can calculate fees only for requests assigned to you");
    }
    const context = await this.requestContext(requestId);
    const available = new Map(context.travellers.map((item) => [item.id, item]));
    for (const passenger of passengers) if (!available.has(passenger.travellerId)) throw new BadRequestException("Every selected traveller must belong to this client");
    const group = context.feeGroup;
    const isCharged = (category: PassengerCategory) => category === "adult" ? group.chargeAdults : category === "child" ? group.chargeChildren : group.chargeInfants;
    const chargedUnits = group.calculationBasis === "per_booking" ? 1 : passengers.filter((item) => isCharged(item.category)).length;
    const amountCents = Math.round(Number(group.amount) * 100);
    const totalAmount = ((amountCents * chargedUnits) / 100).toFixed(2);
    const lineItems = passengers.map((item) => {
      const charged = group.calculationBasis === "per_passenger" && isCharged(item.category);
      return { travellerId: item.travellerId, name: available.get(item.travellerId)!.name,
        category: item.category, charged, feeAmount: charged ? Number(group.amount).toFixed(2) : "0.00" };
    });
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("DELETE FROM travel_request_travellers WHERE travel_request_id = $1", [requestId]);
      for (const item of passengers) await db.query(
        `INSERT INTO travel_request_travellers (travel_request_id, traveller_id, passenger_category, added_by)
         VALUES ($1,$2,$3,$4)`, [requestId, item.travellerId, item.category, actorUserId]);
      const quote = (await db.query(
        `INSERT INTO request_booking_fee_quotes
           (travel_request_id, booking_fee_group_id, fee_group_name, fee_group_code, amount, currency,
            calculation_basis, passenger_count, charged_units, total_amount, line_items, calculated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12) RETURNING id`,
        [requestId, group.id, group.name, group.code, group.amount, group.currency, group.calculationBasis,
         passengers.length, chargedUnits, totalAmount, JSON.stringify(lineItems), actorUserId])).rows[0];
      await db.query("UPDATE travel_requests SET passenger_count = $2, updated_at = now() WHERE id = $1", [requestId, passengers.length]);
      await recordAudit(db, actorUserId, "travel_request.booking_fee_calculated", "travel_request", requestId, null,
        { quoteId: String(quote.id), feeGroupId: group.id, passengerCount: passengers.length, chargedUnits, totalAmount, currency: group.currency });
      await db.query("COMMIT");
      return this.getRequestFee(requestId);
    } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
  }

  private async requestContext(requestId: number): Promise<{ feeGroup: BookingFeeGroup; travellers: Array<{ id: number; name: string; dob: string | null }> }> {
    const result = await this.pool.query<BookingFeeGroupRow & { client_id: number }>(
      `SELECT b.id, b.name, b.code, b.amount::text, b.currency, b.calculation_basis,
              b.charge_adults, b.charge_children, b.charge_infants, b.active, b.created_at, b.updated_at,
              r.client_id
       FROM travel_requests r JOIN clients c ON c.id = r.client_id
       JOIN booking_fee_groups b ON b.id = c.booking_fee_group_id WHERE r.id = $1`, [requestId]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Request or client booking-fee group not found");
    const travellers = await this.pool.query<{ id: number; name: string; dob: string | null }>(
      `SELECT t.id, t.name, to_char(t.dob, 'YYYY-MM-DD') AS dob
       FROM travellers t JOIN traveller_accounts a ON a.traveller_id = t.id
       WHERE a.client_id = $1 ORDER BY t.name, t.id`, [row.client_id]);
    return { feeGroup: toBookingFeeGroup(row), travellers: travellers.rows };
  }
}
