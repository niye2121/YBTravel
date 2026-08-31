import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { RequestWorkflowSettingsService, type RequestSettingInput, type UrgencyLevelInput } from "./request-workflow-settings.service";

const settingSchema = z.object({
  code: z.string().trim().toLowerCase().min(1).max(60).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers, and underscores"),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(300),
  position: z.number().int().min(0).max(10000),
  active: z.boolean(),
});
function parse(body: unknown): RequestSettingInput {
  try { return settingSchema.parse(body); }
  catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}
const urgencySchema = settingSchema.extend({
  responseDeadlineMinutes: z.number().int().positive().max(5256000).nullable(),
  serviceDeadlineMinutes: z.number().int().positive().max(5256000).nullable(),
}).superRefine((input, context) => {
  if (
    input.responseDeadlineMinutes !== null &&
    input.serviceDeadlineMinutes !== null &&
    input.serviceDeadlineMinutes < input.responseDeadlineMinutes
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["serviceDeadlineMinutes"],
      message: "Service deadline must be equal to or later than the response deadline",
    });
  }
});
function parseUrgency(body: unknown): UrgencyLevelInput {
  try { return urgencySchema.parse(body); }
  catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}

@Controller("request-workflow-settings")
@UseGuards(AuthGuard)
export class RequestWorkflowSettingsController {
  constructor(private readonly service: RequestWorkflowSettingsService) {}
  @Get() listActive() { return this.service.get(true); }
  @Get("admin") @UseGuards(AdminGuard) listAll() { return this.service.get(false); }
  @Post("types") @UseGuards(AdminGuard) createType(@Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.service.createType(parse(body), req.user.id); }
  @Patch("types/:id") @UseGuards(AdminGuard) updateType(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.service.updateType(id, parse(body), req.user.id); }
  @Post("statuses") @UseGuards(AdminGuard) createStatus(@Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.service.createStatus(parse(body), req.user.id); }
  @Patch("statuses/:id") @UseGuards(AdminGuard) updateStatus(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.service.updateStatus(id, parse(body), req.user.id); }
  @Post("urgency-levels") @UseGuards(AdminGuard) createUrgency(@Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.service.createUrgency(parseUrgency(body), req.user.id); }
  @Patch("urgency-levels/:id") @UseGuards(AdminGuard) updateUrgency(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.service.updateUrgency(id, parseUrgency(body), req.user.id); }
}
