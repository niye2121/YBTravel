import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHmac } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { StaffRole, User } from "@yb-travel/shared";
import { PG_POOL } from "../../database/database.module";
import { loadEnv } from "../../config/env";
import { backendEffectivePermissions, isImplementedPermission } from "./permissions";

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  roles: string[];
  active: boolean;
  created_at: string;
};

const dummyPasswordHash = bcrypt.hash("yb-travel-invalid-login-sentinel", 12);

type PermissionOverrideRow = { permission_code: string; granted: boolean };

function toSafeUser(row: UserRow, overrides: PermissionOverrideRow[]): User {
  const validOverrides = overrides.flatMap((override) => {
    return isImplementedPermission(override.permission_code)
      ? [{ permission: override.permission_code, granted: override.granted }]
      : [];
  });
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles as StaffRole[],
    permissions: backendEffectivePermissions(row.roles as StaffRole[], validOverrides),
    createdAt: row.created_at,
  };
}

/**
 * Handles password verification and JWT issuing/verification. The token
 * only carries the user's id (`sub`) — roles are re-read from the database
 * on every request in AuthGuard rather than trusted from the token, per
 * CLAUDE.md's "re-check high-risk permissions at execution time against
 * the database, never trust a token claim minted minutes earlier."
 */
@Injectable()
export class AuthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Reads the explicit permission differences for one employee from the same
   * database connection as the surrounding authentication operation.
   */
  private async getPermissionOverrides(db: Pool | PoolClient, userId: number): Promise<PermissionOverrideRow[]> {
    const result = await db.query<PermissionOverrideRow>(
      "SELECT permission_code, granted FROM user_permission_overrides WHERE user_id = $1",
      [userId],
    );
    return result.rows;
  }

  private loginKey(email: string, ipAddress: string): string {
    return createHmac("sha256", loadEnv().JWT_SECRET)
      .update(`${email.trim().toLowerCase()}|${ipAddress}`)
      .digest("hex");
  }

  private async assertLoginAllowed(client: PoolClient, keyHash: string): Promise<void> {
    const result = await client.query<{ locked_until: string | null }>(
      "SELECT locked_until FROM auth_login_attempts WHERE key_hash = $1 FOR UPDATE",
      [keyHash],
    );
    const lockedUntil = result.rows[0]?.locked_until;
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      throw new HttpException("Too many failed sign-in attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordFailedLogin(client: PoolClient, keyHash: string): Promise<void> {
    const env = loadEnv();
    const existing = await client.query<{ failure_count: number; window_started_at: string }>(
      "SELECT failure_count, window_started_at FROM auth_login_attempts WHERE key_hash = $1 FOR UPDATE",
      [keyHash],
    );
    const row = existing.rows[0];
    const windowExpired = !row || Date.now() - new Date(row.window_started_at).getTime() > env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60_000;
    const failureCount = windowExpired ? 1 : row.failure_count + 1;
    const lockedUntil = failureCount >= env.LOGIN_RATE_LIMIT_MAX_FAILURES
      ? new Date(Date.now() + env.LOGIN_RATE_LIMIT_LOCK_MINUTES * 60_000)
      : null;
    await client.query(
      `INSERT INTO auth_login_attempts
         (key_hash, failure_count, window_started_at, locked_until, last_attempt_at)
       VALUES ($1, $2, now(), $3, now())
       ON CONFLICT (key_hash) DO UPDATE SET
         failure_count = EXCLUDED.failure_count,
         window_started_at = CASE WHEN $4 THEN now() ELSE auth_login_attempts.window_started_at END,
         locked_until = EXCLUDED.locked_until,
         last_attempt_at = now()`,
      [keyHash, failureCount, lockedUntil, windowExpired],
    );
  }

  async validateCredentials(email: string, password: string, ipAddress = "unknown"): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const keyHash = this.loginKey(normalizedEmail, ipAddress);
    const client = await this.pool.connect();
    await client.query("BEGIN");
    try {
      await this.assertLoginAllowed(client, keyHash);
      const result = await client.query<UserRow>("SELECT * FROM users WHERE lower(email) = $1", [normalizedEmail]);
      const row = result.rows[0];
      const matches = await bcrypt.compare(password, row?.password_hash ?? await dummyPasswordHash);
      if (!row || !matches || !row.active) {
        await this.recordFailedLogin(client, keyHash);
        await client.query("COMMIT");
        return null;
      }
      await client.query("DELETE FROM auth_login_attempts WHERE key_hash = $1", [keyHash]);
      await client.query("DELETE FROM auth_login_attempts WHERE last_attempt_at < now() - interval '24 hours'");
      await client.query("COMMIT");
      return toSafeUser(row, await this.getPermissionOverrides(client, row.id));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  signToken(user: User): string {
    return jwt.sign({ sub: user.id }, loadEnv().JWT_SECRET, { expiresIn: "7d" });
  }

  async getUserFromToken(token: string): Promise<User | null> {
    let payload: jwt.JwtPayload;
    try {
      const env = loadEnv();
      const secrets = [env.JWT_SECRET, ...(env.JWT_SECRET_PREVIOUS ?? "").split(",").map((item) => item.trim()).filter(Boolean)];
      let verified: jwt.JwtPayload | null = null;
      for (const secret of secrets) {
        try {
          verified = jwt.verify(token, secret) as jwt.JwtPayload;
          break;
        } catch {
          // Continue through the bounded rotation grace list.
        }
      }
      if (!verified) return null;
      payload = verified;
    } catch {
      return null;
    }

    const id = typeof payload.sub === "string" ? Number.parseInt(payload.sub, 10) : payload.sub;
    if (!id || Number.isNaN(id)) return null;

    const result = await this.pool.query<UserRow>("SELECT * FROM users WHERE id = $1 AND active = true", [id]);
    const row = result.rows[0];
    return row ? toSafeUser(row, await this.getPermissionOverrides(this.pool, row.id)) : null;
  }
}
