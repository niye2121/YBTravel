import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AllowedRoles } from "../auth/allowed-roles.decorator";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { RoleGuard } from "../auth/role.guard";
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
@UseGuards(AuthGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get("ping")
  ping() {
    return { module: "requests" };
  }

  @Get()
  list(): Promise<TravelRequestRecord[]> {
    return this.requests.list();
  }

  @Get("assignable-staff")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "system_administrator")
  listAssignableStaff() {
    return this.requests.listAssignableStaff();
  }

  @Get(":id/assignment-recommendation")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  assignmentRecommendation(@Param("id", ParseIntPipe) id: number) {
    return this.requests.getAssignmentRecommendation(id);
  }

  @Get(":id/assignment-history")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  assignmentHistory(@Param("id", ParseIntPipe) id: number) {
    return this.requests.getAssignmentHistory(id);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number): Promise<TravelRequestRecord> {
    return this.requests.getById(id);
  }

  @Get(":id/information-status")
  informationStatus(@Param("id", ParseIntPipe) id: number) {
    return this.requests.getInformationStatus(id);
  }

  @Patch(":id/details")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  updateDetails(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      return this.requests.updateDetails(id, requestDetailsSchema.parse(body), request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post(":id/information/review")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  reviewInformation(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      const input = reviewRequestInformationSchema.parse(body);
      return this.requests.reviewInformation(id, input.requirementFieldId, request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post(":id/assignment")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  assign(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<TravelRequestRecord> {
    try {
      const input = assignRequestSchema.parse(body);
      return this.requests.assign(id, input.assignedUserId, request.user.id, request.user.roles);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post()
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
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
