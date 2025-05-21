// src/io.js
import { Server } from "socket.io";

let io;

export function initIO(httpServer) {
  io = new Server(httpServer, { path: "/ws" });
  return io;
}

export function getIO() {
  if (!io) throw new Error("call initIO() first");
  return io;
}
