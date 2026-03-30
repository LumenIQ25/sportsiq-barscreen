import { C, FONT } from "../../theme";
import type { LeaderboardEntry } from "../../types";
import { LiveBadge } from "../ui/LiveBadge";
import { LeaderboardRow } from "../ui/LeaderboardRow";

interface Props {
  leaderboard: LeaderboardEntry[];
  qrDataUrl: string;
  roomCode: string;
}

export function IdleScreen({ leaderboard, qrDataUrl, roomCode }: Props) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "440px 860px 1fr",
      gridTemplateRows: "auto 1fr",
      height: "100vh",
      background: `radial-gradient(ellipse at top left, rgba(85,69,211,0.30) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(34,140,136,0.24) 0%, transparent 50%), #060d1c`,
      fontFamily: FONT,
      overflow: "hidden",
    }}>
      {/* TOP HEADER */}
      <div style={{
        gridColumn: "1 / -1",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.3)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "16px 48px",
      }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: C.text, fontFamily: FONT, letterSpacing: -1 }}>
          Sports<span style={{ color: C.brand }}>IQ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.faint, fontSize: 13, fontWeight: 700, letterSpacing: 2, fontFamily: FONT }}>PLAYING TONIGHT</div>
            <div style={{ color: C.text, fontSize: 28, fontWeight: 900, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
              {leaderboard.length > 0 ? leaderboard.length : "—"}
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.faint, fontSize: 13, fontWeight: 700, letterSpacing: 2, fontFamily: FONT }}>NEXT TRIVIA</div>
            <div style={{ color: C.teal, fontSize: 28, fontWeight: 900, fontFamily: FONT }}>SOON</div>
          </div>
          <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />
          <LiveBadge />
        </div>
      </div>

      {/* LEFT COL — QR + room code */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 28, padding: "48px 36px",
      }}>
        <div style={{
          color: C.faint, fontSize: 14, fontWeight: 800, letterSpacing: 3,
          fontFamily: FONT, textTransform: "uppercase",
        }}>JOIN THE GAME</div>

        {qrDataUrl && (
          <div style={{
            background: C.bgOuter, borderRadius: 20, padding: 14,
            border: `2px solid ${C.border}`,
          }}>
            <img src={qrDataUrl} alt="Scan to join" style={{ width: 180, height: 180, display: "block", borderRadius: 8 }} />
          </div>
        )}

        <div style={{
          border: `2px solid ${C.border}`,
          borderRadius: 16, padding: "16px 32px", textAlign: "center",
          background: "rgba(85,69,211,0.1)", width: "100%",
        }}>
          <div style={{ color: C.faint, fontSize: 13, fontFamily: FONT, letterSpacing: 1, marginBottom: 4 }}>ROOM CODE</div>
          <div style={{
            color: C.text, fontSize: 44, fontWeight: 900,
            letterSpacing: 10, fontFamily: FONT, fontVariantNumeric: "tabular-nums",
          }}>{roomCode}</div>
        </div>

        <div style={{ color: C.faint, fontSize: 16, fontFamily: FONT, textAlign: "center", lineHeight: 1.5 }}>
          sportsiq.app/join<br />
          <span style={{ color: C.teal, fontSize: 14 }}>Free to play · Win IQ Points</span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {["App Store", "Google Play"].map((s) => (
            <div key={s} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "8px 16px",
              color: C.muted, fontSize: 13, fontFamily: FONT, fontWeight: 700,
            }}>{s}</div>
          ))}
        </div>
      </div>

      {/* CENTER COL — leaderboard */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column",
        padding: "48px 48px",
        overflow: "hidden",
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 800, letterSpacing: 3, fontFamily: FONT }}>
            TONIGHT'S LEADERBOARD
          </div>
          <div style={{ width: 80, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.teal})`, marginTop: 8, borderRadius: 2 }} />
        </div>

        {leaderboard.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leaderboard.slice(0, 8).map((e, i) => (
              <LeaderboardRow key={e.rank} entry={e} index={i} size="large" />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: C.faint, fontSize: 28, fontFamily: FONT, textAlign: "center" }}>
              Be the first on the board tonight
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COL — CTA panel */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 24, padding: "48px 40px", textAlign: "center",
      }}>
        <div style={{
          color: C.teal, fontSize: 14, fontWeight: 800, letterSpacing: 3,
          fontFamily: FONT, textTransform: "uppercase",
        }}>FREE TO PLAY</div>

        <div style={{
          color: C.text, fontSize: 52, fontWeight: 900, fontFamily: FONT,
          lineHeight: 1.1, letterSpacing: -1,
        }}>
          Win IQ points<br />
          <span style={{ color: C.teal }}>at this bar</span><br />
          tonight
        </div>

        <div style={{
          background: "rgba(34,140,136,0.12)",
          border: "1px solid rgba(34,140,136,0.3)",
          borderRadius: 16, padding: "18px 28px",
          color: C.muted, fontSize: 18, fontFamily: FONT, lineHeight: 1.6,
        }}>
          Answer trivia questions &amp; predict<br />
          player stats to climb the leaderboard
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          color: C.faint, fontSize: 16, fontFamily: FONT,
        }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          Top players earn prizes &amp; bragging rights
        </div>
      </div>
    </div>
  );
}
