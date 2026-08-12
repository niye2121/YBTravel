import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import type { Traveller } from "@yb-travel/shared";
import { AuthGuard } from "../auth/auth.guard";
import { TravellersService } from "./travellers.service";

/**
 * Defined locally rather than imported from @yb-travel/shared — see the
 * comment at the top of packages/shared/src/client.ts. Keep in sync with
 * createTravellerInput there.
 */
const createTravellerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().nullable().optional(),
  passportStatus: z.enum(["on_file", "missing", "expiring_soon"]).default("missing"),
  links: z
    .array(z.object({ clientId: z.number(), relationship: z.string().nullable().optional() }))
    .default([]),
});

@Controller("travellers")
@UseGuards(AuthGuard)
export class TravellersController {
  constructor(private readonly travellersService: TravellersService) {}

  @Get()
  list(): Promise<Traveller[]> {
    return this.travellersService.list();
  }

  @Post()
  create(@Body() body: unknown): Promise<Traveller> {
    try {
      return this.travellersService.create(createTravellerSchema.parse(body));
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }
}
