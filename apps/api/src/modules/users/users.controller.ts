import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z, ZodError } from "zod";
import type { EmployeeDetail, EmployeeSummary } from "@yb-travel/shared";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { UsersService } from "./users.service";

/**
 * Defined locally rather than imported from @yb-travel/shared — see the
 * comment in auth.controller.ts. New assignments are limited to the three
 * approved Phase 1 launch roles; historical role values remain readable.
 */
const staffProfileSchema = z.object({
  active: z.boolean().default(true),
  availabilityStatus: z.enum(["available", "unavailable", "absent"]).default("available"),
  capacityLimit: z.number().int().min(1).max(500).default(10),
  highPriorityCapacityLimit: z.number().int().min(1).max(500).default(12),
  timezone: z.string().trim().min(1).max(80).default("America/New_York"),
  workdays: z.array(z.number().int().min(0).max(6)).min(1).default([1, 2, 3, 4, 5]),
  workdayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("08:00"),
  workdayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("18:00"),
  eligibleRequestTypeIds: z.array(z.number().int().positive()).default([]),
});

const identitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use international format, for example +251911234567"),
  roles: z
    .array(
      z.enum([
        "offshore_intake_employee",
        "travel_agent",
        "system_administrator",
      ]),
    )
    .min(1, "Select at least one role"),
});

const createUserSchema = identitySchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
}).merge(staffProfileSchema);

const updateEmployeeSchema = identitySchema.merge(staffProfileSchema);

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
  list(): Promise<EmployeeSummary[]> {
    return this.usersService.list();
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number): Promise<EmployeeDetail> {
    return this.usersService.get(id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<EmployeeDetail> {
    try {
      return this.usersService.create(createUserSchema.parse(body), request.user.id);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<EmployeeDetail> {
    try {
      return this.usersService.update(id, updateEmployeeSchema.parse(body), request.user.id);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }
}
