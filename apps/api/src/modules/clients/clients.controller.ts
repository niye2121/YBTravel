import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z, ZodError } from "zod";
import type { Client } from "@yb-travel/shared";
import { AuthGuard } from "../auth/auth.guard";
import { ClientsService, type ClientTravellerRow } from "./clients.service";

/**
 * Defined locally rather than imported from @yb-travel/shared — see the
 * comment at the top of packages/shared/src/client.ts. Keep in sync with
 * createClientSchema there.
 */
const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  preferredRepId: z.number().nullable().optional(),
  secondaryRepId: z.number().nullable().optional(),
  feeGroup: z.enum(["standard", "belev_echad", "scheiman"]).default("standard"),
});

const linkTravellerSchema = z.object({
  travellerId: z.number(),
  relationship: z.string().nullable().optional(),
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
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  list(): Promise<Client[]> {
    return this.clientsService.list();
  }

  @Get("reps")
  listReps(): Promise<{ id: number; name: string }[]> {
    return this.clientsService.listReps();
  }

  @Post()
  create(@Body() body: unknown): Promise<Client> {
    try {
      return this.clientsService.create(createClientSchema.parse(body));
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
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
