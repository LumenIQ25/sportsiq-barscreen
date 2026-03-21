/**
 * MarketMoverOverlay — Bar Screen Phase 4, Task 11
 *
 * Slides in from the bottom when an intel:market_mover event fires.
 * Auto-dismisses after 8 seconds.
 *
 * Usage in BarScreen.tsx:
 *   import { MarketMoverOverlay } from "./MarketMoverOverlay";
 *   // Add to state:
 *   const [marketMover, setMarketMover] = useState<MarketMoverAlert | null>(null);
 *   // Add to socket listener:
 *   intel.on("intel:market_mover", (alert: MarketMoverAlert) => {
 *     setMarketMover(alert);
 *     setTimeout(() => setMarketMover(null), 8_000);
 *   });
 *   // Add to JSX (after the main screen content):
 *   {marketMover && <MarketMoverOverlay alert={marketMover} />}
 */

import React, { useEffect, useRef } from "react";

export interface MarketMoverAlert {
  playerName:       string;
  teamName?:        string;
  statLabel:        string;
  shiftDirection:   "up" | "down";
  shiftAmount:      number;      // percentage points (e.g., 14)
  newProbability:   number;      // 0–1
  timeWindowSeconds: number;     // e.g., 240 (4 minutes)
}

interface Props {
  alert: MarketMoverAlert;
}

const FONT = "'Lexend', 'Arial', sans-serif";

export function MarketMoverOverlay({ alert }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  // Animate the progress bar down over 8 seconds
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "100%";
    // Force reflow before starting the transition
    void el.offsetWidth;
    el.style.transition = "width 8s linear";
    el.style.width = "0%";
  }, [alert]);

  const isUp      = alert.shiftDirection === "up";
  const arrowIcon = isUp ? "⚡" : "⚠️";
  const signalWord = isUp ? "SURGED" : "DROPPED";
  const accent    = isUp ? "#22c55e" : "#ef4444";
  const bgAccent  = isUp ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)";
  const minutes   = Math.round(alert.timeWindowSeconds / 60);
  const newPct    = Math.round(alert.newProbability * 100);

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Countdown bar at top of overlay */}
      <div style={{
        height: 4,
        background: "rgba(255,255,255,0.1)",
        overflow: "hidden",
      }}>
        <div ref={barRef} style={{
          height: "100%",
          background: accent,
          width: "100%",
        }} />
      </div>

      {/* Main overlay body */}
      <div style={{
        background: `linear-gradient(135deg, #0a0f1a 0%, #0d1829 100%)`,
        borderTop: `2px solid ${accent}`,
        padding: "20px 80px",
        display: "flex",
        alignItems: "center",
        gap: 32,
        background: bgAccent,
        backdropFilter: "blur(20px)",
      }}>
        {/* Icon */}
        <div style={{
          fontSize: 48,
          flexShrink: 0,
          filter: `drop-shadow(0 0 12px ${accent})`,
        }}>
          {arrowIcon}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: accent,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 3,
            fontFamily: FONT,
            marginBottom: 6,
          }}>
            MARKET MOVER
          </div>
          <div style={{
            color: "#F8FAFC",
            fontSize: 28,
            fontWeight: 900,
            fontFamily: FONT,
            lineHeight: 1.2,
          }}>
            {alert.playerName} {alert.statLabel} probability&nbsp;
            <span style={{ color: accent }}>
              {signalWord} +{alert.shiftAmount}%
            </span>
            &nbsp;in {minutes} min
          </div>
          {alert.teamName && (
            <div style={{
              color: "#64748B",
              fontSize: 16,
              fontFamily: FONT,
              marginTop: 4,
            }}>
              {alert.teamName} · Now at {newPct}%
            </div>
          )}
        </div>

        {/* New probability pill */}
        <div style={{
          background: `rgba(255,255,255,0.06)`,
          border: `2px solid ${accent}`,
          borderRadius: 16,
          padding: "12px 28px",
          textAlign: "center",
          flexShrink: 0,
        }}>
          <div style={{ color: "#64748B", fontSize: 12, fontWeight: 700, letterSpacing: 2, fontFamily: FONT }}>NOW AT</div>
          <div style={{ color: accent, fontSize: 40, fontWeight: 900, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
            {newPct}%
          </div>
        </div>
      </div>
    </div>
  );
}
