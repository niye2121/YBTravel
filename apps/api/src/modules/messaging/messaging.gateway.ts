import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server } from "socket.io";
import type { ConnectionStatus } from "./messaging-channel.interface";

/**
 * Payloads carry identifiers/small status blobs, not full records — the
 * client refetches through TanStack Query, so authorization (once it
 * exists — see CLAUDE.md, there is none yet) applies consistently on
 * every read rather than trusting what a socket event happened to carry.
 */
@WebSocketGateway({ cors: { origin: true } })
export class MessagingGateway {
  @WebSocketServer()
  server!: Server;

  emitStatus(payload: { status: ConnectionStatus; qr: string | null; phoneNumber: string | null }): void {
    this.server.emit("connection:status", payload);
  }

  emitNewMessage(conversationId: number): void {
    this.server.emit("message:new", { conversationId });
  }
}
