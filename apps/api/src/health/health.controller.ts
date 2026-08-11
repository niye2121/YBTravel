import { Controller, Get, HttpException, HttpStatus, Inject } from "@nestjs/common";
import type { HealthResponse } from "@yb-travel/shared";
import type { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

@Controller("health")
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.pool.query("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch {
      const body: HealthResponse = { status: "error", db: "unreachable" };
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
