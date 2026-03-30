import { C, FONT } from "../../theme";
import { teamGradient } from "../../utils";
import type { PredictorQuestion, PredictorCrowdSplit } from "../../types";
import { LiveBadge } from "../ui/LiveBadge";

interface Props {
  predQ: PredictorQuestion;
  predCrowd: PredictorCrowdSplit | null;
  countdown: number;
  qrDataUrl: string;
  roomCode: string;
}

export function PredictorQuestionScreen({ predQ, predCrowd, countdown, qrDataUrl, roomCode }: Props) {
  const crowd = predCrowd;
  const probPct = Math.round(predQ.sportsiqProbability * 100);
  const colorA = predQ.teamColorHome ?? C.brand;
  const colorB = predQ.teamColorAway ?? C.teal;

  const circumference = 2 * Math.PI * 44;
  const totalSeconds = 60;
  const dashOffset = circumference * (1 - countdown / totalSeconds);

  const overPct = crowd ? crowd.morePercent : 68;
  const totalPicks = crowd ? crowd.more + crowd.less : 0;
  const overIsWinning = (crowd?.morePercent ?? 68) >= 50;

  return (
    <div style={{
      height: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1.4fr 320px",
      background: teamGradient(colorA, colorB),
      fontFamily: FONT,
      overflow: "hidden",
    }}>
      {/* LEFT COL — player identity */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "56px 48px", gap: 20,
      }}>
        <div style={{ marginBottom: 8 }}>
          <LiveBadge label="LIVE NOW" />
        </div>
        <div style={{
          color: "#64748b", fontSize: 18, fontWeight: 700,
          letterSpacing: 2, textTransform: "uppercase", fontFamily: FONT,
        }}>
          {predQ.teamName}
        </div>
        <div style={{
          color: C.text, fontSize: 88, fontWeight: 900, fontFamily: FONT,
          letterSpacing: -3, lineHeight: 0.92,
        }}>
          {predQ.playerName}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
          <span style={{
            color: "#6366f1", fontSize: 72, fontWeight: 900,
            fontFamily: FONT, fontVariantNumeric: "tabular-nums",
          }}>{predQ.statLine}</span>
          <span style={{ color: "#94a3b8", fontSize: 26, fontFamily: FONT }}>
            {predQ.statLabel}
          </span>
        </div>
        <div style={{
          borderLeft: "4px solid #6366f1",
          background: "rgba(99,102,241,0.08)",
          borderRadius: "0 12px 12px 0",
          padding: "14px 20px",
          color: "#94a3b8", fontSize: 20, fontFamily: FONT, lineHeight: 1.5,
        }}>
          Has cleared this line in {probPct} of recent games
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: C.amber, boxShadow: `0 0 8px ${C.amber}`,
          }} />
          <span style={{ color: C.amber, fontSize: 18, fontWeight: 700, fontFamily: FONT }}>
            SportsIQ Signal:{" "}
            <span style={{ fontWeight: 500 }}>
              Moderate Lean {probPct >= 50 ? "OVER" : "UNDER"}
            </span>
          </span>
        </div>
      </div>

      {/* CENTER COL — crowd split hero */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "56px 48px", gap: 28,
      }}>
        <div style={{
          color: C.faint, fontSize: 26, fontWeight: 700,
          letterSpacing: 3, textTransform: "uppercase", fontFamily: FONT,
          textAlign: "center",
        }}>
          {overIsWinning ? "OVER" : "UNDER"} leading
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{
            flex: 1,
            background: "linear-gradient(160deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))",
            border: "2px solid rgba(99,102,241,0.5)",
            borderRadius: 24, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ color: "#818cf8", fontSize: 32, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
              OVER ↑
            </div>
            <div style={{
              color: C.text, fontSize: 96, fontWeight: 900, fontFamily: FONT,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {crowd ? crowd.morePercent : "—"}%
            </div>
            <div style={{ color: "#64748b", fontSize: 20, fontFamily: FONT, marginTop: 8 }}>
              {crowd ? crowd.more : 0} players
            </div>
          </div>
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "2px solid rgba(255,255,255,0.1)",
            borderRadius: 24, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ color: C.muted, fontSize: 32, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>
              UNDER ↓
            </div>
            <div style={{
              color: C.text, fontSize: 96, fontWeight: 900, fontFamily: FONT,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {crowd ? crowd.lessPercent : "—"}%
            </div>
            <div style={{ color: "#64748b", fontSize: 20, fontFamily: FONT, marginTop: 8 }}>
              {crowd ? crowd.less : 0} players
            </div>
          </div>
        </div>

        <div>
          <div style={{
            height: 16, borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${overPct}%`,
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
              borderRadius: 8,
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 8, fontFamily: FONT,
          }}>
            <span style={{ color: "#818cf8", fontSize: 18, fontWeight: 700 }}>
              OVER {overIsWinning ? "winning" : ""}
            </span>
            <span style={{ color: C.faint, fontSize: 18 }}>
              {totalPicks} total picks
            </span>
          </div>
        </div>

        <div style={{
          textAlign: "center", color: C.faint, fontSize: 20, fontFamily: FONT,
          background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "14px",
        }}>
          Scan to pick from your phone · Free to play
        </div>
      </div>

      {/* RIGHT COL — timer + QR */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 32, padding: "48px 28px",
      }}>
        <div style={{
          color: C.faint, fontSize: 14, fontWeight: 800,
          letterSpacing: 3, textTransform: "uppercase", fontFamily: FONT,
        }}>LOCKS IN</div>

        <div style={{ position: "relative", width: 160, height: 160 }}>
          <svg width="160" height="160" style={{ position: "absolute", top: 0, left: 0 }}>
            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="80" cy="80" r="70" fill="none"
              stroke="#ef4444" strokeWidth="8"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${dashOffset}`}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              color: "#ef4444", fontSize: 42, fontWeight: 900,
              fontFamily: FONT, fontVariantNumeric: "tabular-nums",
            }}>{countdown}</span>
          </div>
        </div>

        <div style={{ width: "80%", height: 1, background: "rgba(255,255,255,0.08)" }} />

        <div style={{
          color: C.faint, fontSize: 13, fontWeight: 800,
          letterSpacing: 3, textTransform: "uppercase", fontFamily: FONT,
        }}>SCAN TO JOIN</div>

        {qrDataUrl && (
          <div style={{
            background: C.bgOuter, borderRadius: 16, padding: 12,
            border: `2px solid ${C.border}`,
          }}>
            <img src={qrDataUrl} alt="Join" style={{ width: 120, height: 120, display: "block", borderRadius: 6 }} />
          </div>
        )}

        <div style={{
          color: C.text, fontSize: 28, fontWeight: 900,
          letterSpacing: 8, fontFamily: FONT, fontVariantNumeric: "tabular-nums",
        }}>{roomCode}</div>
      </div>
    </div>
  );
}
