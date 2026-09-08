import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowedPermissions } from "../auth/allowed-permissions.decorator";
import { PermissionGuard } from "../auth/permission.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard, PermissionGuard)
@AllowedPermissions("notifications.read")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.user.id, request.user.permissions.includes("whatsapp.read"));
  }

  @Post("read-all")
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(request.user.id);
  }

  @Post(":id/read")
  markRead(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.notifications.markRead(id, request.user.id, request.user.permissions.includes("whatsapp.read"));
  }

  @Post("conversations/:conversationId/read/:throughMessageId")
  @AllowedPermissions("notifications.read", "whatsapp.read")
  readConversation(@Param("conversationId", ParseIntPipe) conversationId: number,
    @Param("throughMessageId", ParseIntPipe) throughMessageId: number, @Req() request: AuthenticatedRequest) {
    if (!request.user.permissions.includes("whatsapp.read") || !request.user.permissions.includes("notifications.read")) {
      throw new ForbiddenException("Inbox and notification access are required");
    }
    return this.notifications.readConversation(request.user.id, conversationId, throughMessageId);
  }
}
