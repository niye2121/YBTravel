import { ConflictException, Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import type { CreateUserInput, StaffRole, User } from "@yb-travel/shared";
import { PG_POOL } from "../../database/database.module";

type UserRow = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  created_at: string;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles as StaffRole[],
    createdAt: row.created_at,
  };
}

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(): Promise<User[]> {
    const result = await this.pool.query<UserRow>(
      "SELECT id, name, email, roles, created_at FROM users ORDER BY name ASC",
    );
    return result.rows.map(toUser);
  }

  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.pool.query("SELECT 1 FROM users WHERE email = $1", [input.email]);
    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, roles)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, roles, created_at`,
      [input.name, input.email, passwordHash, input.roles],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to create user");
    return toUser(row);
  }
}
