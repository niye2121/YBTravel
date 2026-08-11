import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import type { User } from "@yb-travel/shared";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { UsersService } from "./users.service";

/**
 * Defined locally rather than imported from @yb-travel/shared — see the
 * comment in auth.controller.ts. Keep this role list in sync with
 * STAFF_ROLES in packages/shared/src/roles.ts.
 */
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roles: z
    .array(
      z.enum([
        "offshore_intake_employee",
        "travel_agent",
        "supervisor_manager",
        "ticketing_agent",
        "finance_user",
        "system_administrator",
      ]),
    )
    .min(1, "Select at least one role"),
});

/**
 * Every route here requires a logged-in System Administrator — P1-18 in
 * docs/03-deliverables.md. AuthGuard must run before AdminGuard so
 * req.user is populated by the time AdminGuard checks the role.
 */
@Controller("users")
@UseGuards(AuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(): Promise<User[]> {
    return this.usersService.list();
  }

  @Post()
  create(@Body() body: unknown): Promise<User> {
    try {
      return this.usersService.create(createUserSchema.parse(body));
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }
}
