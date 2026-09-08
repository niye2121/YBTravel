import { BadRequestException, Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
import { SystemSettingsService, type SystemSettings } from "./system-settings.service";

const demoDataSchema = z.object({ demoDataEnabled: z.boolean() });
const testDataDeletionSchema = z.object({ testDataDeletionEnabled: z.boolean() });
const resetTestDataSchema = z.object({ confirmation: z.literal("DELETE ALL TEST DATA") });

@Controller("system-settings")
@UseGuards(AuthGuard, PermissionGuard)
@AllowedPermissions("settings.manage")
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

  @Patch("test-data-deletion")
  updateTestDataDeletion(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<SystemSettings> {
    try {
      const input = testDataDeletionSchema.parse(body);
      return this.systemSettingsService.updateTestDataDeletion(input.testDataDeletionEnabled, request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post("test-data/reset")
  @AllowedPermissions("test_data.delete")
  resetTestData(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      resetTestDataSchema.parse(body);
      return this.systemSettingsService.resetTestData(request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }
}
