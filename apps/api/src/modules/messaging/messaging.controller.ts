import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z, ZodError } from "zod";
import { AllowedRoles } from "../auth/allowed-roles.decorator";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import { RoleGuard } from "../auth/role.guard";
import { MessagingService } from "./messaging.service";
import {
  WhatsAppGroupsService,
  type WhatsAppGroupOptions,
  type WhatsAppGroupRecord,
} from "./whatsapp-groups.service";

const participantSchema = z.object({
  id: z.number().int().positive(),
  phoneNumber: z.string().trim().min(8).max(30),
});

const createGroupSchema = z
  .object({
    clientId: z.number().int().positive(),
    travelRequestId: z.number().int().positive(),
    name: z.string().trim().min(1, "Group name is required").max(100),
    travellers: z.array(participantSchema).max(100),
    staff: z.array(participantSchema).max(100),
  })
  .superRefine((input, context) => {
    if (input.travellers.length + input.staff.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["travellers"],
        message: "Select at least one participant",
      });
    }
    const travellerIds = input.travellers.map((item) => item.id);
    const staffIds = input.staff.map((item) => item.id);
    if (new Set(travellerIds).size !== travellerIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["travellers"], message: "Duplicate traveller" });
    }
    if (new Set(staffIds).size !== staffIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["staff"], message: "Duplicate staff member" });
    }
  });

@Controller("messaging")
@UseGuards(AuthGuard)
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly groups: WhatsAppGroupsService,
  ) {}

  @Get("status")
  getStatus() {
    return this.messaging.getStatus();
  }

  @Get("conversations")
  listConversations() {
    return this.messaging.listConversations();
  }

  @Get("conversations/:id/messages")
  listMessages(@Param("id", ParseIntPipe) id: number) {
    return this.messaging.listMessages(id);
  }

  @Get("groups/options")
  groupOptions(): Promise<WhatsAppGroupOptions> {
    return this.groups.getOptions();
  }

  @Get("groups")
  listGroups(): Promise<WhatsAppGroupRecord[]> {
    return this.groups.list();
  }

  @Post("groups")
  @UseGuards(RoleGuard)
  @AllowedRoles("travel_agent", "system_administrator")
  createGroup(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<WhatsAppGroupRecord> {
    try {
      return this.groups.create(createGroupSchema.parse(body), request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post("conversations/:id/messages")
  async sendMessage(@Param("id", ParseIntPipe) id: number, @Body("text") text: string) {
    await this.messaging.sendReply(id, text);
    return { ok: true };
  }
}
