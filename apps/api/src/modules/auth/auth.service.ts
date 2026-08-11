import { Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import type { StaffRole, User } from "@yb-travel/shared";
import { PG_POOL } from "../../database/database.module";
import { loadEnv } from "../../config/env";

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  roles: string[];
  created_at: string;
};

function toSafeUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles as StaffRole[],
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

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const row = result.rows[0];
    if (!row) return null;

    const matches = await bcrypt.compare(password, row.password_hash);
    if (!matches) return null;

    return toSafeUser(row);
  }

  signToken(user: User): string {
    return jwt.sign({ sub: user.id }, loadEnv().JWT_SECRET, { expiresIn: "7d" });
  }

  async getUserFromToken(token: string): Promise<User | null> {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, loadEnv().JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return null;
    }

    const id = typeof payload.sub === "string" ? Number.parseInt(payload.sub, 10) : payload.sub;
    if (!id || Number.isNaN(id)) return null;

    const result = await this.pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? toSafeUser(row) : null;
  }
}
