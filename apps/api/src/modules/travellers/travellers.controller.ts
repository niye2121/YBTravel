import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import type { Traveller } from "@yb-travel/shared";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
import { TravellersService } from "./travellers.service";

/**
 * Defined locally rather than imported from @yb-travel/shared — see the
 * comment at the top of packages/shared/src/client.ts. Keep in sync with
 * createTravellerInput there.
 */
const relationshipSchema = z.enum([
  "self", "spouse_partner", "child", "parent_guardian", "sibling", "other_relative",
  "employee", "employer", "colleague", "friend", "guest", "group_member", "other",
]);

const createTravellerSchema = z
  .object({
    name: z.string().trim().min(1, "Legal name is required").max(160),
    dob: z.string().min(1, "Date of birth is required"),
    title: z.enum(["mr", "mrs", "ms", "miss", "master", "dr"]).nullable().optional(),
    gender: z.enum(["female", "male", "unspecified"]).nullable().optional(),
    nationality: z.string().trim().max(80).nullable().optional(),
    passportStatus: z.enum(["on_file", "missing", "expiring_soon"]).default("missing"),
    passportNumber: z.string().trim().max(40).nullable().optional(),
    passportIssuingCountry: z.string().trim().max(80).nullable().optional(),
    passportExpiresOn: z.string().nullable().optional(),
    links: z
      .array(z.object({ clientId: z.number(), relationship: relationshipSchema.nullable().optional() }))
      .default([]),
  })
  .superRefine((value, context) => {
    if (value.passportStatus !== "on_file") return;
    for (const [field, message] of [
      ["passportNumber", "Passport number is required when passport is on file"],
      ["passportIssuingCountry", "Issuing country is required when passport is on file"],
      ["passportExpiresOn", "Passport expiry is required when passport is on file"],
    ] as const) {
      if (!value[field]) context.addIssue({ code: "custom", path: [field], message });
    }
  });

@Controller("travellers")
@UseGuards(AuthGuard, PermissionGuard)
export class TravellersController {
  constructor(private readonly travellersService: TravellersService) {}

  @Get()
  @AllowedPermissions("travellers.read")
  list(): Promise<Traveller[]> {
    return this.travellersService.list();
  }

  @Get(":id")
  @AllowedPermissions("travellers.read")
  getById(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Traveller> {
    return this.travellersService.getById(id, request.user.id, request.ip, request.headers["user-agent"]);
  }

  @Get(":id/sensitive-access-history")
  @AllowedPermissions("audit.read")
  accessHistory(@Param("id", ParseIntPipe) id: number) {
    return this.travellersService.getSensitiveAccessHistory(id);
  }

  @Post()
  @AllowedPermissions("travellers.create")
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<Traveller> {
    try {
      const input = createTravellerSchema.parse(body);
      if (input.links.length > 0 && !request.user.permissions.includes("travellers.link")) {
        throw new ForbiddenException("Linking a traveller to a client requires travellers.link permission");
      }
      return this.travellersService.create(
        input,
        request.user.id,
        request.ip,
        request.headers["user-agent"],
      );
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestException(err.flatten().fieldErrors);
      throw err;
    }
  }
}
