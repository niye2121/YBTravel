import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
import { RemindersService, type ReminderState } from "./reminders.service";

const listStateSchema = z.enum(["active", "all", "pending", "due", "overdue", "escalated", "acknowledged", "resolved"]);
const listScopeSchema = z.enum(["mine", "all"]);
const assignmentSchema = z.object({ assignedUserId: z.number().int().positive() });

@Controller("reminders")
@UseGuards(AuthGuard, PermissionGuard)
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  @AllowedPermissions("notifications.read")
  list(
    @Req() request: AuthenticatedRequest,
    @Query("state") stateValue?: string,
    @Query("scope") scopeValue?: string,
  ) {
    const state = listStateSchema.catch("active").parse(stateValue) as ReminderState | "active" | "all";
    const scope = listScopeSchema.catch("mine").parse(scopeValue);
    return this.reminders.list(request.user.id, request.user.permissions, state, scope);
  }

  @Post(":id/acknowledge")
  @AllowedPermissions("notifications.read")
  acknowledge(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.reminders.acknowledge(id, request.user.id, request.user.permissions);
  }

  @Patch(":id/assignment")
  @AllowedPermissions("requests.assign_any")
  reassign(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      const input = assignmentSchema.parse(body);
      return this.reminders.reassign(id, input.assignedUserId, request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post("process")
  @AllowedPermissions("settings.manage")
  process() {
    return this.reminders.runCycle();
  }
}
