import { BadRequestException, Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AssignmentRoutingService } from "./assignment-routing.service";

const roleSchema = z.enum(["offshore_intake_employee", "travel_agent", "supervisor_manager", "ticketing_agent", "finance_user", "system_administrator"]);
const updateSchema = z.object({
  assignmentMode: z.enum(["recommend_only", "automatic"]),
  teamStrategy: z.enum(["lowest_workload", "round_robin"]),
  eligibleRoles: z.array(roleSchema).min(1),
  escalationRoles: z.array(roleSchema).min(1),
  continuityEnabled: z.boolean(),
  workingHoursEnabled: z.boolean(),
  urgencyPolicies: z.array(z.object({ urgencyLevelId: z.number().int().positive(), preferredWaitMinutes: z.number().int().min(0).max(1440), secondaryWaitMinutes: z.number().int().min(0).max(1440), escalationWaitMinutes: z.number().int().min(0).max(10080) })),
  staffProfiles: z.array(z.object({
    userId: z.number().int().positive(), active: z.boolean(),
    availabilityStatus: z.enum(["available", "unavailable", "absent"]),
    capacityLimit: z.number().int().min(1).max(500), highPriorityCapacityLimit: z.number().int().min(1).max(500),
    timezone: z.string().trim().min(1).max(80), workdays: z.array(z.number().int().min(0).max(6)).min(1),
    workdayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), workdayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    eligibleRequestTypeIds: z.array(z.number().int().positive()),
  })),
});

@Controller("assignment-settings")
@UseGuards(AuthGuard, AdminGuard)
export class AssignmentRoutingController {
  constructor(private readonly routing: AssignmentRoutingService) {}
  @Get() get() { return this.routing.getSettings(); }
  @Put() update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    try { return this.routing.updateSettings(updateSchema.parse(body), request.user.id); }
    catch (error) { if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors); throw error; }
  }
}
