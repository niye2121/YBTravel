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
import type { Client } from "@yb-travel/shared";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedRoles } from "../auth/allowed-roles.decorator";
import { RoleGuard } from "../auth/role.guard";
import { ClientsService, type ClientTravellerRow } from "./clients.service";
import { OnboardingService } from "./onboarding.service";

/**
 * Defined locally rather than imported from @yb-travel/shared — see the
 * comment at the top of packages/shared/src/client.ts. Keep in sync with
 * createClientSchema there.
 */
const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientType: z.enum(["household", "company", "individual"]).default("household"),
  phoneNumber: z.string().trim().min(7).max(32).nullable().optional(),
  preferredRepId: z.number().nullable().optional(),
  secondaryRepId: z.number().nullable().optional(),
  bookingFeeGroupId: z.number().int().positive(),
  conversationId: z.number().int().positive().optional(),
});

const linkTravellerSchema = z.object({
  travellerId: z.number(),
  relationship: z.string().nullable().optional(),
});

const updateClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  clientType: z.enum(["household", "company", "individual"]),
  phoneNumber: z.string().trim().min(7).max(32).nullable(),
  preferredRepId: z.number().int().positive().nullable(),
  secondaryRepId: z.number().int().positive().nullable(),
  bookingFeeGroupId: z.number().int().positive(),
  stage: z.string().trim().min(1, "Onboarding stage is required").max(50),
  onboardingTransitionReason: z.string().trim().max(500).nullable().optional(),
});

const reviewInformationSchema = z.object({
  requirementFieldId: z.number().int().positive(),
  entityType: z.enum(["client", "traveller"]),
  entityId: z.number().int().positive(),
});

/**
 * Client creation and editing belongs to Offshore Intake Employees and
 * Travel Agents (P1-13/14), not just admins — AuthGuard only, no
 * AdminGuard. Fine-grained per-role permission checks (P1-19) aren't built
 * yet, same scope boundary as the Users feature: anyone logged in can act.
 */
@Controller("clients")
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Get()
  list(): Promise<Client[]> {
    return this.clientsService.list();
  }

  @Get("reps")
  listReps(): Promise<{ id: number; name: string }[]> {
    return this.clientsService.listReps();
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<Client> {
    try {
      return this.clientsService.create(createClientSchema.parse(body), request.user.id);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }

  @Patch(":id")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<Client> {
    try {
      return this.clientsService.update(id, updateClientSchema.parse(body), request.user.id);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }

  @Get(":id/onboarding-status")
  getOnboardingStatus(@Param("id", ParseIntPipe) id: number) {
    return this.onboarding.getClientStatus(id);
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
      const input = reviewInformationSchema.parse(body);
      return this.onboarding.reviewClientField(
        id, input.requirementFieldId, input.entityType, input.entityId, request.user.id,
      );
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post(":id/onboarding-tasks/:taskId/complete")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  completeOnboardingTask(
    @Param("id", ParseIntPipe) id: number,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.onboarding.completeTask(id, taskId, request.user.id);
  }

  @Get(":id/travellers")
  listTravellers(@Param("id", ParseIntPipe) id: number): Promise<ClientTravellerRow[]> {
    return this.clientsService.listTravellers(id);
  }

  @Post(":id/travellers")
  async linkTraveller(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<{ ok: boolean }> {
    let input;
    try {
      input = linkTravellerSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
    await this.clientsService.linkTraveller(id, input.travellerId, input.relationship ?? null);
    return { ok: true };
  }
}
