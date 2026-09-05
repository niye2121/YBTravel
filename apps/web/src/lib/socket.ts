import { type Socket, io } from "socket.io-client";
import { getToken } from "./session";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const SOCKET_URL = API_URL.startsWith("/") && typeof window !== "undefined"
  ? window.location.origin
  : API_URL;

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = getToken();
  if (!token) {
    throw new Error("Sign in before connecting to messaging updates");
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
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
