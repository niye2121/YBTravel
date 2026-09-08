import { BadRequestException, Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Post, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z, ZodError } from "zod";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { EntityRecordsService } from "./entity-records.service";

const noteSchema = z.object({ body: z.string().trim().min(1).max(5000) });
type Upload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

function parseNote(body: unknown) { try { return noteSchema.parse(body); } catch (error) { if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors); throw error; } }

@Controller("clients/:clientId/records")
@UseGuards(AuthGuard, PermissionGuard)
export class ClientRecordsController {
  constructor(private readonly records: EntityRecordsService) {}
  @Get("notes") @AllowedPermissions("records.read") notes(@Param("clientId", ParseIntPipe) clientId: number) { return this.records.listNotes(clientId, null); }
  @Post("notes") @AllowedPermissions("records.write") addNote(@Param("clientId", ParseIntPipe) clientId: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.records.addNote(clientId, null, parseNote(body).body, req.user.id); }
  @Get("documents") @AllowedPermissions("records.read") documents(@Param("clientId", ParseIntPipe) clientId: number) { return this.records.listDocuments(clientId, null); }
  @Post("documents") @AllowedPermissions("records.write") @UseInterceptors(FileInterceptor("document", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@Param("clientId", ParseIntPipe) clientId: number, @Req() req: AuthenticatedRequest, @UploadedFile() file: Upload | undefined, @Body("description") description?: string) {
    if (!file) throw new BadRequestException("Select a document"); return this.records.addDocument(clientId, null, file, description ?? null, req.user.id);
  }
  @Get("activity") @AllowedPermissions("records.read") activity(@Param("clientId", ParseIntPipe) clientId: number) { return this.records.activity(clientId, null); }
}

@Controller("requests/:requestId/records")
@UseGuards(AuthGuard, PermissionGuard)
export class RequestRecordsController {
  constructor(private readonly records: EntityRecordsService) {}
  private clientId(requestId: number, req: AuthenticatedRequest) { return this.records.clientIdForRequest(requestId, req.user.id, req.user.permissions); }
  @Get("notes") @AllowedPermissions("records.read") async notes(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest) { return this.records.listNotes(await this.clientId(requestId, req), requestId); }
  @Post("notes") @AllowedPermissions("records.write") async addNote(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest, @Body() body: unknown) { return this.records.addNote(await this.clientId(requestId, req), requestId, parseNote(body).body, req.user.id); }
  @Get("documents") @AllowedPermissions("records.read") async documents(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest) { return this.records.listDocuments(await this.clientId(requestId, req), requestId); }
  @Post("documents") @AllowedPermissions("records.write") @UseInterceptors(FileInterceptor("document", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async upload(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest, @UploadedFile() file: Upload | undefined, @Body("description") description?: string) {
    if (!file) throw new BadRequestException("Select a document"); return this.records.addDocument(await this.clientId(requestId, req), requestId, file, description ?? null, req.user.id);
  }
  @Get("activity") @AllowedPermissions("records.read") async activity(@Param("requestId", ParseIntPipe) requestId: number, @Req() req: AuthenticatedRequest) { return this.records.activity(await this.clientId(requestId, req), requestId); }
}

@Controller("record-documents")
@UseGuards(AuthGuard, PermissionGuard)
export class RecordDocumentsController {
  constructor(private readonly records: EntityRecordsService) {}
  @Get(":id/download") @Header("Cache-Control", "no-store") @Header("X-Content-Type-Options", "nosniff") @AllowedPermissions("records.read") async download(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    const file = await this.records.downloadDocument(id, req.user.id, req.user.permissions);
    return new StreamableFile(file.content, { type: file.mimeType, disposition: `attachment; filename="${file.fileName.replace(/["\r\n]/g, "_")}"` });
  }
  @Get(":id/preview") @Header("Cache-Control", "no-store") @Header("X-Content-Type-Options", "nosniff") @AllowedPermissions("records.read") async preview(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    const file = await this.records.downloadDocument(id, req.user.id, req.user.permissions, "view");
    return new StreamableFile(file.content, { type: file.mimeType, disposition: "inline" });
  }
  @Delete(":id") @AllowedPermissions("records.write") delete(@Param("id", ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.records.deleteDocument(id, req.user.id, req.user.permissions);
  }
}
