/**
 * Bar Screen Socket Connection
 * Connects to the same backend as the mobile app via socket.io.
 * Role: "barscreen" — receives all game events, emits nothing except join.
 */

import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8081";

let triviaSocket: Socket | null = null;
let morelessSocket: Socket | null = null;
let intelligenceSocket: Socket | null = null;

export function getBarTriviaSocket(token: string, barId: string): Socket {
  if (!triviaSocket) {
    triviaSocket = io(`${SOCKET_URL}/trivia`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token, role: "barscreen", barId },
    });
  }
  return triviaSocket;
}

export function getBarMoreLessSocket(token: string, barId: string): Socket {
  if (!morelessSocket) {
    morelessSocket = io(`${SOCKET_URL}/moreless`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token, role: "barscreen", barId },
    });
  }
  return morelessSocket;
}

export function getIntelligenceSocket(token: string): Socket {
  if (!intelligenceSocket) {
    intelligenceSocket = io(`${SOCKET_URL}`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token, role: "barscreen" },
    });
  }
  return intelligenceSocket;
}

export function disconnectAll(): void {
  triviaSocket?.disconnect(); triviaSocket = null;
  morelessSocket?.disconnect(); morelessSocket = null;
  intelligenceSocket?.disconnect(); intelligenceSocket = null;
}
