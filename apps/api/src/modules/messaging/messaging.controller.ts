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
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z, ZodError } from "zod";
import { AllowedRoles } from "../auth/allowed-roles.decorator";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import { RoleGuard } from "../auth/role.guard";
import { MessagingService } from "./messaging.service";
import { DraftIntakesService } from "./draft-intakes.service";
import {
  WhatsAppGroupsService,
  type WhatsAppGroupOptions,
  type WhatsAppGroupRecord,
} from "./whatsapp-groups.service";

const participantSchema = z.object({
  id: z.number().int().positive(),
  phoneNumber: z.string().trim().min(8).max(30),
});

const startConversationSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(30),
  accountId: z.number().int().positive().optional(),
});

const createAccountSchema = z.object({ label: z.string().trim().min(2).max(80) });

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Reply message is required").max(2000),
  travelRequestId: z.number().int().positive().optional(),
});

type UploadedAudio = {
  buffer: Buffer;
  size: number;
};

const updateDraftIntakeSchema = z.object({
  requestTypeId: z.number().int().positive(),
  urgencyLevelId: z.number().int().positive(),
  summary: z.string().trim().min(3).max(200),
  passengerCount: z.number().int().min(1).max(100).nullable(),
  origin: z.string().trim().max(100).nullable(),
  destination: z.string().trim().max(100).nullable(),
  departureDateText: z.string().trim().max(100).nullable(),
  returnDateText: z.string().trim().max(100).nullable(),
  missingInformation: z.array(z.string().trim().min(1).max(200)).max(20),
  suggestedReply: z.string().trim().max(2000).nullable(),
});

const createGroupSchema = z
  .object({
    accountId: z.number().int().positive(),
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
    private readonly draftIntakes: DraftIntakesService,
  ) {}

  @Get("status")
  getStatus() {
    return this.messaging.getStatus();
  }

  @Get("accounts")
  listAccounts() {
    return this.messaging.listAccounts();
  }

  @Post("accounts")
  @UseGuards(RoleGuard)
  @AllowedRoles("system_administrator")
  createAccount(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    try {
      const input = createAccountSchema.parse(body);
      return this.messaging.createAccount(input.label, request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post("accounts/:id/reconnect")
  @UseGuards(RoleGuard)
  @AllowedRoles("system_administrator")
  reconnectAccount(@Param("id", ParseIntPipe) id: number) {
    return this.messaging.reconnect(id);
  }

  @Post("accounts/:id/disconnect")
  @UseGuards(RoleGuard)
  @AllowedRoles("system_administrator")
  disconnectAccount(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.messaging.disconnect(request.user.id, id);
  }

  @Post("reconnect")
  @UseGuards(RoleGuard)
  @AllowedRoles("system_administrator")
  reconnect() {
    return this.messaging.reconnect();
  }

  @Post("disconnect")
  @UseGuards(RoleGuard)
  @AllowedRoles("system_administrator")
  disconnect(@Req() request: AuthenticatedRequest) {
    return this.messaging.disconnect(request.user.id);
  }

  @Get("conversations")
  listConversations() {
    return this.messaging.listConversations();
  }

  @Post("conversations")
  startConversation(@Body() body: unknown): Promise<{ id: number }> {
    try {
      const input = startConversationSchema.parse(body);
      return this.messaging.startDirectConversation(input.phoneNumber, input.accountId);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Get("conversations/:id/messages")
  listMessages(@Param("id", ParseIntPipe) id: number) {
    return this.messaging.listMessages(id);
  }

  @Get("delivery-failures")
  @UseGuards(RoleGuard)
  @AllowedRoles("system_administrator")
  listDeliveryFailures() {
    return this.messaging.listDeliveryFailures();
  }

  @Get("messages/:id/audio")
  async getMessageAudio(@Param("id", ParseIntPipe) id: number): Promise<StreamableFile> {
    const audio = await this.messaging.getMessageAudio(id);
    return new StreamableFile(audio.data, {
      type: audio.mimeType,
      length: audio.sizeBytes,
      disposition: `inline; filename="voice-note-${id}"`,
    });
  }

  @Post("messages/:id/retry")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  async retryFailedMessage(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.messaging.retryFailedMessage(id, request.user.id);
    return { ok: true };
  }

  @Get("conversations/:id/draft-intakes")
  listDraftIntakes(@Param("id", ParseIntPipe) id: number) {
    return this.draftIntakes.list(id);
  }

  @Post("conversations/:id/draft-intakes/analyze-latest")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  analyzeLatestDraft(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.draftIntakes.analyzeLatest(id, request.user.id);
  }

  @Patch("draft-intakes/:id")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  updateDraftIntake(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      return this.draftIntakes.update(id, updateDraftIntakeSchema.parse(body), request.user.id);
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post("draft-intakes/:id/reject")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  rejectDraftIntake(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.draftIntakes.reject(id, request.user.id);
  }

  @Post("draft-intakes/:id/create-request")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  createRequestFromDraft(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.draftIntakes.createRequest(id, request.user.id);
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
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  async sendMessage(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    try {
      const input = sendMessageSchema.parse(body);
      await this.messaging.sendReply(id, input.text, request.user.id, input.travelRequestId);
      return { ok: true };
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
      throw error;
    }
  }

  @Post("conversations/:id/voice-notes")
  @UseGuards(RoleGuard)
  @AllowedRoles("offshore_intake_employee", "travel_agent", "system_administrator")
  @UseInterceptors(FileInterceptor("audio", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async sendVoiceNote(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedAudio | undefined,
    @Body("durationSeconds") rawDuration: string | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException("Select or record a voice note");
    const parsedDuration = rawDuration === undefined || rawDuration === "" ? null : Number(rawDuration);
    await this.messaging.sendVoiceNote(id, file.buffer, parsedDuration, request.user.id);
    return { ok: true };
  }
}
