import { BadRequestException, Body, Controller, Get, Patch, Post, Query, Req, UseGuards, Param } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { SupervisorService } from "./supervisor.service";

const reviewStatusSchema = z.enum(["unreviewed", "reviewed", "all"]);
const reviewTypeSchema = z.enum(["pricing_override", "markup_change", "waiver", "assignment_override", "operational_exception"]);
const reviewOutcomeSchema = z.enum(["approved", "rejected", "noted", "coaching_required"]);
const moneySchema = z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/);
const recordReviewSchema = z.object({
  requestId: z.number().int().positive().nullable(),
  type: reviewTypeSchema,
  summary: z.string().trim().min(1).max(240),
  overriddenRule: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(2000),
  valueAmount: moneySchema.nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable(),
});
const completeReviewSchema = z.object({ outcome: reviewOutcomeSchema, comment: z.string().trim().min(1).max(2000) });
const settingsSchema = z.object({
  markupAmountThreshold: moneySchema,
  markupPercentageThreshold: z.string().trim().regex(/^\d{1,3}(?:\.\d{1,2})?$/),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
});

/**
 * Parses a request body with Zod and exposes field-level errors through the
 * API's established BadRequest shape instead of leaking validation internals.
 */
function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}

@Controller("supervisor")
@UseGuards(AuthGuard, PermissionGuard)
export class SupervisorController {
  constructor(private readonly supervisor: SupervisorService) {}

  /** Returns the current cross-team workload snapshot. */
  @Get("workload")
  @AllowedPermissions("workloads.manage")
  workload(@Query("showAll") showAll?: string) {
    return this.supervisor.workload(showAll === "true");
  }

  /** Returns pending or historical after-the-fact review items. */
  @Get("reviews")
  @AllowedPermissions("exceptions.approve")
  reviews(@Query("status") status?: string) {
    return this.supervisor.reviews(reviewStatusSchema.catch("unreviewed").parse(status));
  }

  /** Records a completed operational exception without creating a gate. */
  @Post("reviews")
  @AllowedPermissions("requests.update", "exceptions.approve")
  recordReview(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.supervisor.recordReview(parseBody(recordReviewSchema, body), request.user.id);
  }

  /** Appends the supervisor's review decision to one completed action. */
  @Patch("reviews/:id")
  @AllowedPermissions("exceptions.approve")
  completeReview(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseBody(completeReviewSchema, body);
    return this.supervisor.review(id, input.outcome, input.comment, request.user.id);
  }

  /** Returns the non-blocking review thresholds. */
  @Get("settings")
  @AllowedPermissions("workloads.manage")
  settings() {
    return this.supervisor.settings();
  }

  /** Changes the thresholds that route completed markup changes for review. */
  @Patch("settings")
  @AllowedPermissions("workloads.manage")
  updateSettings(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.supervisor.updateSettings(parseBody(settingsSchema, body), request.user.id);
  }
}
