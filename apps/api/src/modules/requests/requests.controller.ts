import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
import { RequestsService, type TravelRequestRecord } from "./requests.service";

const createRequestSchema = z.object({
  clientId: z.number().int().positive(),
  tripSummary: z.string().trim().min(3, "Trip summary is required").max(200),
  requestTypeId: z.number().int().positive().optional(),
});
const assignRequestSchema = z.object({ assignedUserId: z.number().int().positive() });
const requestDetailsSchema = z.object({
  passengerCount: z.number().int().min(1).max(100).nullable(),
  origin: z.string().trim().max(100).nullable(),
  destination: z.string().trim().max(100).nullable(),
  departureDateText: z.string().trim().max(100).nullable(),
  returnDateText: z.string().trim().max(100).nullable(),
  cabinClass: z.string().trim().max(80).nullable(),
  flexibility: z.string().trim().max(500).nullable(),
  specialRequests: z.string().trim().max(1000).nullable(),
});
const reviewRequestInformationSchema = z.object({ requirementFieldId: z.number().int().positive() });

@Controller("requests")
@UseGuards(AuthGuard, PermissionGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get("ping")
  @AllowedPermissions("requests.read")
  ping() {
    return { module: "requests" };
  }

  @Get()
  @AllowedPermissions("requests.read")
  list(): Promise<TravelRequestRecord[]> {
    return this.requests.list();
  }

  @Get("assignable-staff")
  @AllowedPermissions("requests.assign_any")
  listAssignableStaff() {
    return this.requests.listAssignableStaff();
  }

  @Get(":id/assignment-recommendation")
  @AllowedPermissions("requests.assign_self", "requests.assign_any")
  assignmentRecommendation(@Param("id", ParseIntPipe) id: number) {
    return this.requests.getAssignmentRecommendation(id);
  }

  @Get(":id/assignment-history")
  @AllowedPermissions("requests.read")
  assignmentHistory(@Param("id", ParseIntPipe) id: number) {
    return this.requests.getAssignmentHistory(id);
  }

  @Get(":id")
  @AllowedPermissions("requests.read")
  getById(@Param("id", ParseIntPipe) id: number): Promise<TravelRequestRecord> {
    return this.requests.getById(id);
  }

  @Get(":id/information-status")
  @AllowedPermissions("requests.read")
  informationStatus(@Param("id", ParseIntPipe) id: number) {
    return this.requests.getInformationStatus(id);
  }

  @Patch(":id/details")
  @AllowedPermissions("requests.update")
  updateDetails(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      return this.requests.updateDetails(
        id,
        requestDetailsSchema.parse(body),
        request.user.id,
        request.user.permissions,
      );
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post(":id/information/review")
  @AllowedPermissions("requests.update")
  reviewInformation(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      const input = reviewRequestInformationSchema.parse(body);
      return this.requests.reviewInformation(
        id,
        input.requirementFieldId,
        request.user.id,
        request.user.permissions,
      );
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post(":id/assignment")
  @AllowedPermissions("requests.assign_self", "requests.assign_any")
  assign(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<TravelRequestRecord> {
    try {
      const input = assignRequestSchema.parse(body);
      return this.requests.assign(id, input.assignedUserId, request.user.id, request.user.permissions);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post()
  @AllowedPermissions("requests.create")
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<TravelRequestRecord> {
    try {
      const input = createRequestSchema.parse(body);
      return this.requests.create(input.clientId, input.tripSummary, request.user.id, input.requestTypeId);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }
}
