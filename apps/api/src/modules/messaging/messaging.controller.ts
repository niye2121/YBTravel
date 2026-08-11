import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { MessagingService } from "./messaging.service";

@Controller("messaging")
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

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

  @Post("conversations/:id/messages")
  async sendMessage(@Param("id", ParseIntPipe) id: number, @Body("text") text: string) {
    await this.messaging.sendReply(id, text);
    return { ok: true };
  }
}
