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
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
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
 * Client and onboarding endpoints use action-specific permissions after
 * AuthGuard. Roles supply defaults, while database overrides can grant or
 * revoke each action for an individual employee.
 */
@Controller("clients")
@UseGuards(AuthGuard, PermissionGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Get()
  @AllowedPermissions("clients.read")
  list(): Promise<Client[]> {
    return this.clientsService.list();
  }

  @Get("reps")
  @AllowedPermissions("clients.read")
  listReps(): Promise<{ id: number; name: string }[]> {
    return this.clientsService.listReps();
  }

  @Post()
  @AllowedPermissions("clients.create")
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<Client> {
    try {
      return this.clientsService.create(createClientSchema.parse(body), request.user.id);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }

  @Patch(":id")
  @AllowedPermissions("clients.update")
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
  @AllowedPermissions("onboarding.read")
  getOnboardingStatus(@Param("id", ParseIntPipe) id: number) {
    return this.onboarding.getClientStatus(id);
  }

  @Post(":id/information/review")
  @AllowedPermissions("onboarding.manage")
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
  @AllowedPermissions("onboarding.manage")
  completeOnboardingTask(
    @Param("id", ParseIntPipe) id: number,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.onboarding.completeTask(id, taskId, request.user.id);
  }

  @Get(":id/travellers")
  @AllowedPermissions("travellers.read")
  listTravellers(@Param("id", ParseIntPipe) id: number): Promise<ClientTravellerRow[]> {
    return this.clientsService.listTravellers(id);
  }

  @Post(":id/travellers")
  @AllowedPermissions("travellers.link")
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
