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
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
import {
  BookingFeesService,
  type BookingFeeGroup,
  type BookingFeeGroupInput,
} from "./booking-fees.service";

const bookingFeeGroupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Code is required")
      .max(40)
      .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers, and underscores"),
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a non-negative amount with at most 2 decimals"),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code such as USD"),
    calculationBasis: z.enum(["per_passenger", "per_booking"]),
    chargeAdults: z.boolean(),
    chargeChildren: z.boolean(),
    chargeInfants: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      input.calculationBasis === "per_passenger" &&
      !input.chargeAdults &&
      !input.chargeChildren &&
      !input.chargeInfants
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chargeAdults"],
        message: "Select at least one charged passenger category",
      });
    }
  });
const requestPassengersSchema = z.object({ passengers: z.array(z.object({
  travellerId: z.number().int().positive(), category: z.enum(["adult", "child", "infant"]),
})).min(1).max(100) });

function parseInput(body: unknown): BookingFeeGroupInput {
  try {
    return bookingFeeGroupSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}

@Controller("booking-fees")
@UseGuards(AuthGuard, PermissionGuard)
export class BookingFeesController {
  constructor(private readonly bookingFeesService: BookingFeesService) {}

  /** Active groups are available to logged-in intake staff for client assignment. */
  @Get()
  @AllowedPermissions("fees.read")
  listActive(): Promise<BookingFeeGroup[]> {
    return this.bookingFeesService.list(true);
  }

  /** Administrators need inactive records too, so they can reactivate or edit them. */
  @Get("admin")
  @AllowedPermissions("settings.manage")
  listAll(): Promise<BookingFeeGroup[]> {
    return this.bookingFeesService.list(false);
  }

  @Post()
  @AllowedPermissions("settings.manage")
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<BookingFeeGroup> {
    return this.bookingFeesService.create(parseInput(body), request.user.id);
  }

  @Patch(":id")
  @AllowedPermissions("settings.manage")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<BookingFeeGroup> {
    return this.bookingFeesService.update(id, parseInput(body), request.user.id);
  }

  @Get("requests/:requestId")
  @AllowedPermissions("fees.read")
  requestFee(@Param("requestId", ParseIntPipe) requestId: number) {
    return this.bookingFeesService.getRequestFee(requestId);
  }

  @Post("requests/:requestId")
  @AllowedPermissions("fees.calculate")
  saveRequestFee(@Param("requestId", ParseIntPipe) requestId: number, @Req() request: AuthenticatedRequest, @Body() body: unknown) {
    try {
      const input = requestPassengersSchema.parse(body);
      return this.bookingFeesService.saveRequestFee(
        requestId,
        input.passengers,
        request.user.id,
        request.user.permissions,
      );
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }
}
