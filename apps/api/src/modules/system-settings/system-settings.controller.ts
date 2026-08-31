import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { SystemSettingsService, type SystemSettings } from "./system-settings.service";

const demoDataSchema = z.object({ demoDataEnabled: z.boolean() });

@Controller("system-settings")
@UseGuards(AuthGuard, AdminGuard)
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  get(): Promise<SystemSettings> {
    return this.systemSettingsService.get();
  }

  @Patch("demo-data")
  updateDemoData(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<SystemSettings> {
    try {
      const input = demoDataSchema.parse(body);
      return this.systemSettingsService.updateDemoData(input.demoDataEnabled, request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }
}
