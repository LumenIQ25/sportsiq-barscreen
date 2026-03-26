/**
 * sportsiq-barscreen — App entry point
 *
 * Reads config from URL query string:
 *   ?bar=kincades-001   → barId
 *   ?token=xxx          → auth token (falls back to VITE_BAR_TOKEN env var)
 *
 * BarScreen manages its own /trivia, /moreless, and root socket connections
 * internally. App.tsx only needs to provide the four props below.
 *
 * Authored at 1920×1080. JS transform scales for any preview width.
 * On a real 4K Yodeck TV, Chromium renders natively at full resolution.
 */

import { useEffect, useState } from "react";
import { BarScreen } from "./components/BarScreen";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";

function getBarId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("bar") ?? "default";
}

function getToken(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? import.meta.env.VITE_BAR_TOKEN ?? "";
}

export default function App() {
  const barId   = getBarId();
  const token   = getToken();
  const joinUrl = `https://apps.apple.com/us/app/sports-iq/id6759401599`;

  const [roomCode, setRoomCode] = useState<string>("-----");

  // Fetch the room code from the backend.
  // Falls back gracefully — BarScreen still works without it (shows "-----").
  useEffect(() => {
    if (!barId || barId === "default") return;

    fetch(`${BACKEND_URL}/bar/${barId}/room-code`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ roomCode: string }>;
      })
      .then((data) => {
        if (data.roomCode) setRoomCode(data.roomCode);
      })
      .catch(() => {
        // Non-fatal — bar screen still displays, just shows "-----" code
        console.warn("[App] Could not fetch room code for bar:", barId);
      });
  }, [barId]);

  return (
    <BarScreen
      token={token}
      barId={barId}
      roomCode={roomCode}
      joinUrl={joinUrl}
    />
  );
}
