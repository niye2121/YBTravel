import { Global, Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { loadEnv } from "../config/env";

export const PG_POOL = "PG_POOL";

/**
 * Wraps a raw pg Pool rather than an ORM — ORM choice (Drizzle vs Prisma)
 * is an open decision per docs/05-open-decisions.md #12, deferred until
 * both are tried against the hardest reporting queries. This module only
 * needs to prove connectivity for the health check.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: loadEnv().DATABASE_URL }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
