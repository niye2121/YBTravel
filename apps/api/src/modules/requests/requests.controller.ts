import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AllowedRoles } from "../auth/allowed-roles.decorator";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { RoleGuard } from "../auth/role.guard";
import { RequestsService, type TravelRequestRecord } from "./requests.service";

const createRequestSchema = z.object({
  clientId: z.number().int().positive(),
  tripSummary: z.string().trim().min(3, "Trip summary is required").max(200),
});

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

  @Post()
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<TravelRequestRecord> {
    try {
      const input = createRequestSchema.parse(body);
      return this.requests.create(input.clientId, input.tripSummary, request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }
}
