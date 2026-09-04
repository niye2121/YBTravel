import { Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.user.id);
  }

  @Post("read-all")
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(request.user.id);
  }

  @Post(":id/read")
  markRead(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.notifications.markRead(id, request.user.id);
  }
}
