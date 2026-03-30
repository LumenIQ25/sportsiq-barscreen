import { C, FONT } from "../../theme";
import { teamGradient } from "../../utils";
import type { PredictorQuestion, PredictorCrowdSplit } from "../../types";
import { LiveBadge } from "../ui/LiveBadge";

interface Props {
  predQ: PredictorQuestion;
  predCrowd: PredictorCrowdSplit;
  predCurrentStat: number | null;
  qrDataUrl: string;
  roomCode: string;
}

export function PredictorWaitingScreen({ predQ, predCrowd, predCurrentStat, qrDataUrl, roomCode }: Props) {
  const colorA = predQ.teamColorHome ?? C.brand;
  const colorB = predQ.teamColorAway ?? C.teal;

  const current = predCurrentStat ?? 0;
  const target = predQ.statLine;
  const fillPct = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  const gameTime = "Q2 8:34";

  return (
    <div style={{
      height: "100vh",
      display: "flex", flexDirection: "column",
      background: teamGradient(colorA, colorB),
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: "56px 80px 0",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <LiveBadge label="LIVE TRACKING" />
          <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT }}>{gameTime}</div>
        </div>
        <div style={{ textAlign: "center", flex: 1, padding: "0 40px" }}>
          <div style={{ color: C.text, fontSize: 64, fontWeight: 900, fontFamily: FONT, lineHeight: 1 }}>
            {predQ.playerName}
          </div>
          <div style={{ color: C.muted, fontSize: 24, fontFamily: FONT, marginTop: 6 }}>
            {predQ.statLabel}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT, marginBottom: 4 }}>{gameTime}</div>
          <div style={{ color: C.orange, fontSize: 26, fontWeight: 700, fontFamily: FONT }}>
            needs {remaining} more to go OVER
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "row",
        padding: "0 60px",
        alignItems: "center",
        gap: 0,
      }}>
        {/* UNDER crowd */}
        <div style={{
          width: 260,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <div style={{ color: C.teal, fontSize: 52, fontWeight: 900, fontFamily: FONT }}>UNDER ↓</div>
          <div style={{ color: C.text, fontSize: 96, fontWeight: 900, fontFamily: FONT, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {predCrowd.lessPercent}%
          </div>
          <div style={{ color: C.faint, fontSize: 24, fontFamily: FONT }}>{predCrowd.less} players</div>
        </div>

        {/* Center: big numbers + rope */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{
              color: C.text, fontSize: 128, fontWeight: 900, fontFamily: FONT,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {current}
            </div>
            <div style={{ color: C.faint, fontSize: 64, fontWeight: 300 }}>→</div>
            <div style={{
              color: C.muted, fontSize: 128, fontWeight: 900, fontFamily: FONT,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {target}
            </div>
          </div>

          {/* The rope */}
          <div style={{ width: "100%", position: "relative" }}>
            <div style={{
              width: "100%", height: 22,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 11,
              overflow: "visible",
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0,
                height: "100%",
                width: `${fillPct}%`,
                background: `linear-gradient(90deg, ${C.teal}, ${C.green})`,
                borderRadius: 11,
                // @ts-ignore CSS custom property for animation
                "--rope-fill-pct": `${fillPct}%`,
                animation: "bar-rope-fill 1.2s cubic-bezier(0.4,0,0.2,1) both",
              }} />
              <div style={{
                position: "absolute",
                top: "50%",
                left: `${fillPct}%`,
                transform: "translate(-50%, -50%)",
                width: 60, height: 60,
                borderRadius: "50%",
                background: C.green,
                boxShadow: `0 0 24px 8px ${C.green}88, 0 0 48px 16px ${C.green}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "bar-knot-sway 2.4s ease-in-out infinite",
                zIndex: 2,
              }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff" }} />
              </div>
              <div style={{
                position: "absolute",
                bottom: 40,
                left: `${fillPct}%`,
                transform: "translateX(-50%)",
                background: C.bgPanel,
                border: `2px solid ${C.green}`,
                borderRadius: 10, padding: "4px 14px",
                color: C.green, fontSize: 24, fontWeight: 900, fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                zIndex: 3,
              }}>
                {current}
              </div>
              <div style={{
                position: "absolute",
                top: -8, right: 0,
                width: 4, height: 38,
                background: C.text,
                borderRadius: 2,
              }} />
            </div>
          </div>

          <div style={{ color: C.orange, fontSize: 28, fontWeight: 700, fontFamily: FONT, textAlign: "center" }}>
            {remaining} more {predQ.statLabel.toLowerCase()} needed for OVER
          </div>
        </div>

        {/* OVER crowd */}
        <div style={{
          width: 260,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <div style={{ color: C.brand, fontSize: 52, fontWeight: 900, fontFamily: FONT }}>OVER ↑</div>
          <div style={{ color: C.text, fontSize: 96, fontWeight: 900, fontFamily: FONT, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {predCrowd.morePercent}%
          </div>
          <div style={{ color: C.faint, fontSize: 24, fontFamily: FONT }}>{predCrowd.more} players</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: "0 80px 52px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT, lineHeight: 1.6 }}>
          Open SportsIQ to join future rounds · Picks are locked · Bar plays count 2×
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "rgba(11,34,48,0.85)",
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, padding: "14px 22px",
          backdropFilter: "blur(8px)",
        }}>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Join" style={{ width: 72, height: 72, borderRadius: 8 }} />
          )}
          <div>
            <div style={{ color: C.faint, fontSize: 13, fontFamily: FONT, letterSpacing: 1 }}>JOIN</div>
            <div style={{ color: C.text, fontSize: 26, fontWeight: 900, fontFamily: FONT, letterSpacing: 5, fontVariantNumeric: "tabular-nums" }}>
              {roomCode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
