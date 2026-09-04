import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z, ZodError } from "zod";
import { AllowedRoles } from "../auth/allowed-roles.decorator";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { RoleGuard } from "../auth/role.guard";
import { EntityRecordsService } from "./entity-records.service";

const roles = ["offshore_intake_employee", "travel_agent", "system_administrator"] as const;
const noteSchema = z.object({ body: z.string().trim().min(1).max(5000) });
type Upload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

function parseNote(body: unknown) { try { return noteSchema.parse(body); } catch (error) { if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors); throw error; } }

@Controller("clients/:clientId/records")
@UseGuards(AuthGuard, RoleGuard)
@AllowedRoles(...roles)
export class ClientRecordsController {
  constructor(private readonly records: EntityRecordsService) {}
  @Get("notes") notes(@Param("clientId", ParseIntPipe) clientId: number) { return this.records.listNotes(clientId, null); }
  @Post("notes") addNote(@Param("clientId", ParseIntPipe) clientId: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.records.addNote(clientId, null, parseNote(body).body, req.user.id); }
  @Get("documents") documents(@Param("clientId", ParseIntPipe) clientId: number) { return this.records.listDocuments(clientId, null); }
  @Post("documents") @UseInterceptors(FileInterceptor("document", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@Param("clientId", ParseIntPipe) clientId: number, @Req() req: AuthenticatedRequest, @UploadedFile() file: Upload | undefined, @Body("description") description?: string) {
    if (!file) throw new BadRequestException("Select a document"); return this.records.addDocument(clientId, null, file, description ?? null, req.user.id);
  }
  @Get("activity") activity(@Param("clientId", ParseIntPipe) clientId: number) { return this.records.activity(clientId, null); }
}

@Controller("requests/:requestId/records")
@UseGuards(AuthGuard, RoleGuard)
@AllowedRoles(...roles)
export class RequestRecordsController {
  constructor(private readonly records: EntityRecordsService) {}
  private clientId(requestId: number) { return this.records.clientIdForRequest(requestId); }
  @Get("notes") async notes(@Param("requestId", ParseIntPipe) requestId: number) { return this.records.listNotes(await this.clientId(requestId), requestId); }
  @Post("notes") async addNote(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.records.addNote(await this.clientId(requestId), requestId, parseNote(body).body, req.user.id); }
  @Get("documents") async documents(@Param("requestId", ParseIntPipe) requestId: number) { return this.records.listDocuments(await this.clientId(requestId), requestId); }
  @Post("documents") @UseInterceptors(FileInterceptor("document", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async upload(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest, @UploadedFile() file: Upload | undefined, @Body("description") description?: string) {
    if (!file) throw new BadRequestException("Select a document"); return this.records.addDocument(await this.clientId(requestId), requestId, file, description ?? null, req.user.id);
  }
  @Get("activity") async activity(@Param("requestId", ParseIntPipe) requestId: number) { return this.records.activity(await this.clientId(requestId), requestId); }
}

@Controller("record-documents")
@UseGuards(AuthGuard, RoleGuard)
@AllowedRoles(...roles)
export class RecordDocumentsController {
  constructor(private readonly records: EntityRecordsService) {}
  @Get(":id/download") async download(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    const file = await this.records.downloadDocument(id, req.user.id);
    return new StreamableFile(file.content, { type: file.mimeType, disposition: `attachment; filename="${file.fileName.replace(/["\r\n]/g, "_")}"` });
  }
}
