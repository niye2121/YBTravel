import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { AuditHistoryService } from "./audit-history.service";

/** Confirms that a YYYY-MM-DD value represents a real calendar date. */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const calendarDateSchema = z.string().refine(isCalendarDate, "Enter a valid date in YYYY-MM-DD format");

const auditQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  actorUserId: z.coerce.number().int().positive().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(160).optional(),
  dateFrom: calendarDateSchema.optional(),
  dateTo: calendarDateSchema.optional(),
  importantOnly: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  page: z.coerce.number().int().positive().default(1),
}).superRefine((value, context) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    context.addIssue({ code: "custom", path: ["dateTo"], message: "End date must be on or after start date" });
  }
});

@Controller("audit-history")
@UseGuards(AuthGuard, PermissionGuard)
export class AuditHistoryController {
  constructor(private readonly auditHistory: AuditHistoryService) {}

  /** Returns a filtered page of mutation and protected-access history. */
  @Get()
  @AllowedPermissions("audit.read")
  list(@Query() query: unknown) {
    try {
      return this.auditHistory.list(auditQuerySchema.parse(query));
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }
}
