import { type Socket, io } from "socket.io-client";
import { getToken } from "./session";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = getToken();
  if (!token) {
    throw new Error("Sign in before connecting to messaging updates");
  }

  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"],
      auth: { token },
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
