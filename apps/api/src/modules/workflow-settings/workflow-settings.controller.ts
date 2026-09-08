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
  WorkflowSettingsService,
  type OnboardingStage,
  type OnboardingStageInput,
  type RequiredInformationField,
  type RequiredInformationFieldInput,
  type WorkflowSettings,
} from "./workflow-settings.service";

const setupRoleSchema = z.enum([
  "offshore_intake_employee",
  "travel_agent",
  "system_administrator",
]);

const stageSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Code is required")
      .max(50)
      .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers, and underscores"),
    name: z.string().trim().min(1, "Name is required").max(80),
    description: z.string().trim().max(300),
    position: z.number().int().min(0).max(10000),
    active: z.boolean(),
    completionStage: z.boolean(),
    blocksCompletionUntilReviewed: z.boolean(),
    generatesTask: z.boolean(),
    responsibleRole: setupRoleSchema.nullable(),
    taskPriority: z.enum(["low", "normal", "high", "urgent"]),
    expectedDurationMinutes: z.number().int().positive().max(525600).nullable(),
  })
  .superRefine((input, context) => {
    if (input.generatesTask && input.responsibleRole === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["responsibleRole"],
        message: "Select the role responsible for the generated task",
      });
    }
    if (input.generatesTask && input.expectedDurationMinutes === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedDurationMinutes"],
        message: "Enter the expected task duration",
      });
    }
  });

const fieldSchema = z.object({
  entityType: z.enum(["client", "traveller", "request"]),
  fieldKey: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Field key is required")
    .max(60)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers, and underscores"),
  label: z.string().trim().min(1, "Label is required").max(100),
  required: z.boolean(),
  requiresReview: z.boolean(),
  position: z.number().int().min(0).max(10000),
  active: z.boolean(),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}

@Controller("workflow-settings")
@UseGuards(AuthGuard, PermissionGuard)
export class WorkflowSettingsController {
  constructor(private readonly service: WorkflowSettingsService) {}

  @Get()
  @AllowedPermissions("onboarding.read")
  listActive(): Promise<WorkflowSettings> {
    return this.service.get(true);
  }

  @Get("admin")
  @AllowedPermissions("settings.manage")
  listAll(): Promise<WorkflowSettings> {
    return this.service.get(false);
  }

  @Post("stages")
  @AllowedPermissions("settings.manage")
  createStage(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<OnboardingStage> {
    return this.service.createStage(parse(stageSchema, body) as OnboardingStageInput, request.user.id);
  }

  @Patch("stages/:id")
  @AllowedPermissions("settings.manage")
  updateStage(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<OnboardingStage> {
    return this.service.updateStage(id, parse(stageSchema, body) as OnboardingStageInput, request.user.id);
  }

  @Post("required-fields")
  @AllowedPermissions("settings.manage")
  createField(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<RequiredInformationField> {
    return this.service.createField(
      parse(fieldSchema, body) as RequiredInformationFieldInput,
      request.user.id,
    );
  }

  @Patch("required-fields/:id")
  @AllowedPermissions("settings.manage")
  updateField(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<RequiredInformationField> {
    return this.service.updateField(
      id,
      parse(fieldSchema, body) as RequiredInformationFieldInput,
      request.user.id,
    );
  }
}
