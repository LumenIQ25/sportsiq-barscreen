import { C, FONT } from "../../theme";
import type { IntelligenceAlert } from "../../types";

export function IntelAlertOverlay({ alert }: { alert: IntelligenceAlert }) {
  return (
    <div style={{
      position: "fixed", top: 36, left: "50%",
      transform: "translateX(-50%)",
      background: C.bgOuter,
      border: `2px solid ${C.amber}`,
      borderRadius: 20, padding: "28px 56px",
      textAlign: "center", zIndex: 100, minWidth: 640,
      boxShadow: `0 0 80px ${C.amber}30`,
      animation: "slideDown 0.4s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{
        color: C.amber, fontSize: 20, fontWeight: 800,
        letterSpacing: 3, fontFamily: FONT, marginBottom: 8,
      }}>
        ⚡ SPORTSIQ INTELLIGENCE ALERT
      </div>
      <div style={{ color: C.text, fontSize: 34, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
        {alert.teamName ?? alert.question}
      </div>
      <div style={{ color: C.muted, fontSize: 26, fontFamily: FONT }}>
        {Math.round(alert.from * 100)}%
        <span style={{ color: C.faint, margin: "0 8px" }}>→</span>
        {Math.round(alert.to * 100)}%
        <span style={{
          color: alert.direction === "up" ? C.green : C.red,
          marginLeft: 16, fontWeight: 800,
        }}>
          {alert.direction === "up" ? "▲" : "▼"} {alert.movePct}pts
        </span>
      </div>
    </div>
  );
}
