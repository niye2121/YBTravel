import { WebSocketGateway, WebSocketServer, type OnGatewayInit } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import type { ConnectionStatus } from "./messaging-channel.interface";

/**
 * Payloads carry identifiers/small status blobs, not full records — the
 * client refetches through TanStack Query, so authorization applies on
 * every read rather than trusting what a socket event happened to carry.
 */
@WebSocketGateway({ cors: { origin: true } })
export class MessagingGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly authService: AuthService) {}

  afterInit(server: Server): void {
    server.use(async (socket: Socket, next) => {
      const handshakeToken = socket.handshake.auth?.token;
      const authorization = socket.handshake.headers.authorization;
      const headerToken = authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : null;
      const token = typeof handshakeToken === "string" ? handshakeToken : headerToken;

      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }

      const user = await this.authService.getUserFromToken(token);
      if (!user) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.user = user;
      next();
    });
  }

  emitStatus(payload: { status: ConnectionStatus; qr: string | null; phoneNumber: string | null }): void {
    this.server.emit("connection:status", payload);
  }

  emitNewMessage(conversationId: number): void {
    this.server.emit("message:new", { conversationId });
  }
}
