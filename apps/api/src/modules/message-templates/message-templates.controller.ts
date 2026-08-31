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
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import {
  MessageTemplatesService,
  type MessageTemplate,
  type MessageTemplateInput,
} from "./message-templates.service";

const messageTemplateSchema = z.object({
  code: z.string().trim().toLowerCase().min(1, "Code is required").max(80)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers, and underscores"),
  name: z.string().trim().min(1, "Name is required").max(120),
  purpose: z.string().trim().min(1, "Purpose is required").max(120),
  languageCode: z.string().trim().toLowerCase().min(2).max(12)
    .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/, "Use a language code such as en, he, or yi")
    .refine((value) => value !== "am", "Amharic is not supported by this desk"),
  languageName: z.string().trim().min(1, "Language name is required").max(80)
    .refine((value) => value.toLowerCase() !== "amharic", "Amharic is not supported by this desk"),
  messageBody: z.string().trim().min(1, "Message text is required").max(5000),
  active: z.boolean(),
});

function parseInput(body: unknown): MessageTemplateInput {
  try {
    return messageTemplateSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}

@Controller("message-templates")
@UseGuards(AuthGuard)
export class MessageTemplatesController {
  constructor(private readonly messageTemplatesService: MessageTemplatesService) {}

  @Get()
  listActive(): Promise<MessageTemplate[]> {
    return this.messageTemplatesService.list(true);
  }

  @Get("admin")
  @UseGuards(AdminGuard)
  listAll(): Promise<MessageTemplate[]> {
    return this.messageTemplatesService.list(false);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<MessageTemplate> {
    return this.messageTemplatesService.create(parseInput(body), request.user.id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<MessageTemplate> {
    return this.messageTemplatesService.update(id, parseInput(body), request.user.id);
  }
}
