/**
 * sportsiq-barscreen — App entry point
 *
 * Reads barId from URL query string: ?bar=kincades-001
 * Connects to the SportsIQ backend socket and renders BarScreen.
 *
 * Authored at 1920×1080. JS transform scales for any preview width.
 * On a real 4K Yodeck TV, Chromium renders natively at full resolution.
 */

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import BarScreen from "./components/BarScreen";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";

function getBarId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("bar") ?? "default";
}

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const barId = getBarId();
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 15_000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("barscreen:join", { barId });
    });

    socket.on("disconnect", () => setConnected(false));

    return () => { socket.disconnect(); };
  }, []);

  return (
    <BarScreen
      socket={socketRef.current}
      barId={getBarId()}
      connected={connected}
    />
  );
}
