/**
 * DEV VERSION — src/components/BarScreen.dev.tsx
 * Phase 4: Bar Screen — Main Display Component
 *
 * Manages all bar screen states:
 *   idle         — QR code, room code, leaderboard, next round countdown
 *   trivia-q     — Question active with countdown timer
 *   trivia-rev   — Answer revealed with crowd % bars and fun fact
 *   predictor-q  — Live Pick — crowd picking OVER/UNDER
 *   predictor-w  — Live Tracking — picks locked, tug-of-war stat tracker
 *   predictor-r  — Result — OVER or UNDER won
 *   intel-alert  — Odds alert overlay (15 seconds, overlays any state)
 *
 * Design system — matches existing sportsiq-frontend dashboard:
 *   Font:       Lexend (TV-optimized wide humanist sans, must be loaded)
 *   Bg outer:   #0B2230
 *   Bg panel:   #110E2A (dark navy-purple)
 *   Bg deep:    #0A0718 (near-black)
 *   Brand:      #5545D3 (indigo)
 *   Teal:       #228C88
 *   Live green: #22C55E
 *   Text:       #F8FAFC
 *   Muted:      #94A3B8 / #64748B
 *   Signature:  dual team-color radial gradient (team colors from corners)
 *
 * Design principles:
 *   - All text must be readable at 20 feet on a 1080p display
 *   - High contrast backgrounds only
 *   - Animations must be visible from across the room
 *   - Designed for 1920×1080 landscape only (no mobile responsiveness)
 *
 * Dependencies: npm install qrcode @types/qrcode socket.io-client
 * To ship: rename to BarScreen.tsx
 */

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  getBarTriviaSocket,
  getBarMoreLessSocket,
  getIntelligenceSocket,
} from "../lib/socket";

// ─── Design tokens (mirrors sportsiq-frontend dashboard) ──────────────────────

const C = {
  bgOuter:    "#0B2230",
  bgPanel:    "#110E2A",
  bgDeep:     "#0A0718",
  brand:      "#5545D3",
  brandAlpha: "rgba(85,69,211,0.25)",
  teal:       "#228C88",
  tealAlpha:  "rgba(34,140,136,0.25)",
  green:      "#22C55E",
  greenAlpha: "rgba(34,197,94,0.15)",
  red:        "#EF4444",
  redAlpha:   "rgba(239,68,68,0.15)",
  orange:     "#F97316",
  amber:      "#F59E0B",
  text:       "#F8FAFC",
  muted:      "#94A3B8",
  faint:      "#64748B",
  border:     "rgba(85,69,211,0.35)",
  cardBorder: "rgba(255,255,255,0.07)",
} as const;

const FONT = "'Lexend', 'Lexend Deca', sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenState =
  | "idle"
  | "trivia-q"
  | "trivia-rev"
  | "predictor-q"  // Live Pick — crowd picking OVER/UNDER
  | "predictor-w"  // Live Tracking — picks locked, tug-of-war stat tracker
  | "predictor-r"; // Result — OVER or UNDER won

interface TriviaQuestion {
  questionId: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  questionNumber: number;
  totalQuestions: number;
  durationMs: number;
}

interface TriviaReveal {
  questionId: string;
  correctAnswer: "A" | "B" | "C" | "D";
  answerCounts: { A: number; B: number; C: number; D: number };
  totalAnswers: number;
  funFact: string | null;
  leaderboard: { rank: number; displayName: string; totalPoints: number }[];
}

interface PredictorQuestion {
  questionId: string;
  playerName: string;
  teamName: string;
  teamColorHome?: string; // hex, e.g. "#003594"
  teamColorAway?: string; // hex, e.g. "#FFB612"
  statLabel: string;
  statLine: number;
  sportsiqProbability: number;
  locksAt: string;
}

interface PredictorCrowdSplit {
  more: number;
  less: number;
  morePercent: number;
  lessPercent: number;
}

interface PredictorResolved {
  questionId: string;
  result: "more" | "less";
  finalStat: number;
  crowdSplit: PredictorCrowdSplit;
  wiseGuyPoints: number;
  heatCheckPoints: number;
  chalkPoints: number;
}

interface IntelligenceAlert {
  question: string;
  teamName?: string;
  from: number;
  to: number;
  direction: "up" | "down";
  movePct: number;
}

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalPoints: number;
}

interface Props {
  token: string;
  barId: string;
  roomCode: string;
  joinUrl: string; // deep link encoded in QR
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

/** Dual team-color radial gradient — signature dashboard aesthetic */
function teamGradient(colorA: string = C.brand, colorB: string = C.teal): string {
  return `radial-gradient(ellipse at top left, ${colorA}55 0%, transparent 55%),
          radial-gradient(ellipse at bottom right, ${colorB}55 0%, transparent 55%),
          ${C.bgOuter}`;
}

// ─── Inline keyframes injected once ───────────────────────────────────────────

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&display=swap');

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes slideDown {
  from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
  to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bar-knot-sway {
  0%, 100% { transform: translateX(-5px); }
  50%      { transform: translateX(5px); }
}
@keyframes bar-rope-fill {
  from { width: 0%; }
  to   { width: var(--rope-fill-pct); }
}
`;

function InjectStyles() {
  return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BarScreen({ token, barId, roomCode, joinUrl }: Props) {
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [triviaQ, setTriviaQ] = useState<TriviaQuestion | null>(null);
  const [triviaRev, setTriviaRev] = useState<TriviaReveal | null>(null);
  const [answerCounts, setAnswerCounts] = useState<{ A: number; B: number; C: number; D: number } | null>(null);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [predQ, setPredQ] = useState<PredictorQuestion | null>(null);
  const [predCrowd, setPredCrowd] = useState<PredictorCrowdSplit | null>(null);
  const [predResolved, setPredResolved] = useState<PredictorResolved | null>(null);
  const [predCurrentStat, setPredCurrentStat] = useState<number | null>(null);
  const [predProbability, setPredProbability] = useState<number | null>(null);
  const [intelAlert, setIntelAlert] = useState<IntelligenceAlert | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── QR code (matches dashboard dark theme palette) ─────────────────────────
  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#F8FAFC", light: "#0B2230" },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [joinUrl]);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const trivia   = getBarTriviaSocket(token, barId);
    const moreless = getBarMoreLessSocket(token, barId);
    const intel    = getIntelligenceSocket(token);

    // ── Trivia events ────────────────────────────────────────────────────────
    trivia.on("trivia:question", (q: TriviaQuestion) => {
      setTriviaQ(q);
      setTriviaRev(null);
      setAnswerCounts({ A: 0, B: 0, C: 0, D: 0 });
      setTotalAnswers(0);
      setScreen("trivia-q");
      startCountdown(q.durationMs / 1000);
    });

    trivia.on("trivia:answer_counts", (counts: { A: number; B: number; C: number; D: number }) => {
      setAnswerCounts(counts);
      setTotalAnswers(Object.values(counts).reduce((a, b) => a + b, 0));
    });

    trivia.on("trivia:reveal", (rev: TriviaReveal) => {
      setTriviaRev(rev);
      setAnswerCounts(rev.answerCounts);
      setTotalAnswers(rev.totalAnswers);
      setLeaderboard(rev.leaderboard ?? []);
      setScreen("trivia-rev");
      clearCountdown();
    });

    trivia.on("trivia:leaderboard", (entries: LeaderboardEntry[]) => {
      setLeaderboard(entries);
    });

    // ── More/Less predictor events ────────────────────────────────────────────
    // Note: socket event names (moreless:*) are internal and unchanged
    moreless.on("moreless:question", (q: PredictorQuestion) => {
      setPredQ(q);
      setPredCrowd(null);
      setPredResolved(null);
      setPredCurrentStat(null);
      setPredProbability(q.sportsiqProbability);
      setScreen("predictor-q");
      startCountdown(secondsUntil(q.locksAt));
    });

    // moreless:crowd_update — internal event name kept as-is
    moreless.on("moreless:crowd_update", (split: PredictorCrowdSplit) => {
      setPredCrowd(split);
    });

    moreless.on("moreless:stat_update", (u: { currentStat: number; probability: number }) => {
      setPredCurrentStat(u.currentStat);
      setPredProbability(u.probability);
    });

    moreless.on("moreless:locked", (locked: { crowdSplit: PredictorCrowdSplit }) => {
      setPredCrowd(locked.crowdSplit);
      setScreen("predictor-w");
      clearCountdown();
    });

    moreless.on("moreless:resolved", (res: PredictorResolved) => {
      setPredResolved(res);
      setPredCrowd(res.crowdSplit);
      setScreen("predictor-r");
    });

    // ── Intelligence alerts ────────────────────────────────────────────────────
    intel.on("intelligence:alert", (alert: IntelligenceAlert) => {
      setIntelAlert(alert);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => {
        setIntelAlert(null);
        alertTimeoutRef.current = null;
      }, 15_000);
    });

    trivia.connect();
    moreless.connect();
    intel.connect();
    trivia.emit("barscreen:join", { barId });
    moreless.emit("barscreen:join", { barId });

    return () => {
      trivia.off("trivia:question"); trivia.off("trivia:answer_counts");
      trivia.off("trivia:reveal");   trivia.off("trivia:leaderboard");
      moreless.off("moreless:question"); moreless.off("moreless:crowd_update");
      moreless.off("moreless:stat_update"); moreless.off("moreless:locked");
      moreless.off("moreless:resolved");
      intel.off("intelligence:alert");
      clearCountdown();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [token, barId]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  function startCountdown(seconds: number) {
    clearCountdown();
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
  }

  function clearCountdown() {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }

  // ── Shared sub-components ─────────────────────────────────────────────────

  /** Crowd % bar — teal highlight for correct answer (matches dashboard teal cells) */
  const PctBar = ({
    label, count, total, highlight,
  }: { label: string; count: number; total: number; highlight: boolean }) => {
    const p = pct(count, total);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div style={{ width: 52, color: C.faint, fontSize: 30, fontWeight: 800, fontFamily: FONT }}>{label}</div>
        <div style={{ flex: 1, height: 48, background: C.bgPanel, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.cardBorder}` }}>
          <div style={{
            height: "100%",
            width: `${p}%`,
            background: highlight
              ? `linear-gradient(90deg, ${C.teal}, ${C.green})`
              : "rgba(255,255,255,0.08)",
            borderRadius: 10,
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <div style={{
          width: 88, textAlign: "right",
          color: highlight ? C.green : C.text,
          fontSize: 34, fontWeight: 900, fontFamily: FONT,
          fontVariantNumeric: "tabular-nums",
        }}>{p}%</div>
      </div>
    );
  };

  /** Leaderboard panel — styled to match dashboard's indigo-border rows */
  const LeaderboardPanel = ({ entries }: { entries: LeaderboardEntry[] }) => (
    <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{
        color: C.faint, fontSize: 18, fontWeight: 700, letterSpacing: 3,
        fontFamily: FONT, marginBottom: 16, textTransform: "uppercase",
      }}>Today's Leaders</div>
      {entries.slice(0, 5).map((e, i) => (
        <div key={e.rank} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px",
          background: i === 0 ? `rgba(85,69,211,0.18)` : "rgba(255,255,255,0.04)",
          border: `1px solid ${i === 0 ? C.border : C.cardBorder}`,
          borderRadius: 12,
          marginBottom: 8,
          fontFamily: FONT,
        }}>
          <span style={{ color: i === 0 ? C.text : C.muted, fontSize: 24, fontWeight: i === 0 ? 800 : 600 }}>
            <span style={{ color: C.faint, marginRight: 10, fontSize: 20 }}>#{e.rank}</span>
            {e.displayName}
          </span>
          <span style={{ color: i === 0 ? C.brand : C.muted, fontWeight: 900, fontSize: 26, fontVariantNumeric: "tabular-nums" }}>
            {e.totalPoints.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );

  /** Pulsing live badge — matches dashboard animate-ping green dot */
  const LiveBadge = ({ label = "LIVE" }: { label?: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 14, height: 14 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: C.green,
          animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
        }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.green }} />
      </div>
      <span style={{ color: C.green, fontSize: 22, fontWeight: 800, letterSpacing: 2, fontFamily: FONT }}>{label}</span>
    </div>
  );

  // ── IDLE ───────────────────────────────────────────────────────────────────
  const IdleScreen = () => (
    <div style={{
      display: "grid",
      gridTemplateColumns: "440px 860px 1fr",
      gridTemplateRows: "auto 1fr",
      height: "100vh",
      background: `radial-gradient(ellipse at top left, rgba(85,69,211,0.30) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(34,140,136,0.24) 0%, transparent 50%), #060d1c`,
      fontFamily: FONT,
      overflow: "hidden",
    }}>

      {/* TOP HEADER — spans all 3 columns */}
      <div style={{
        gridColumn: "1 / -1",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.3)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "16px 48px",
      }}>
        {/* Logo */}
        <div style={{ fontSize: 38, fontWeight: 900, color: C.text, fontFamily: FONT, letterSpacing: -1 }}>
          Sports<span style={{ color: C.brand }}>IQ</span>
        </div>

        {/* Stats row */}
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

      {/* LEFT COL — QR + room code + "Download the app" */}
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

        {/* Room code */}
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

        {/* App store badges row */}
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
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 800, letterSpacing: 3, fontFamily: FONT }}>
            TONIGHT'S LEADERBOARD
          </div>
          <div style={{ width: 80, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.teal})`, marginTop: 8, borderRadius: 2 }} />
        </div>

        {leaderboard.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leaderboard.slice(0, 8).map((e, i) => {
              const isGold   = i === 0;
              const isSilver = i === 1;
              const isBronze = i === 2;
              const rowBg = isGold
                ? "linear-gradient(90deg, rgba(255,193,7,0.18), rgba(255,193,7,0.06))"
                : isSilver
                  ? "rgba(148,163,184,0.08)"
                  : isBronze
                    ? "rgba(205,127,50,0.08)"
                    : "rgba(255,255,255,0.03)";
              const rowBorder = isGold
                ? "rgba(255,193,7,0.35)"
                : isSilver
                  ? "rgba(148,163,184,0.2)"
                  : isBronze
                    ? "rgba(205,127,50,0.2)"
                    : "rgba(255,255,255,0.06)";
              const rankColor = isGold ? "#fbbf24" : isBronze ? "#cd7f32" : C.faint;
              return (
                <div key={e.rank} style={{
                  display: "grid", gridTemplateColumns: "40px 1fr auto",
                  alignItems: "center",
                  padding: "14px 20px",
                  background: rowBg,
                  border: `1px solid ${rowBorder}`,
                  borderRadius: 12,
                  fontFamily: FONT,
                  animation: "fadeIn 0.4s ease both",
                  animationDelay: `${i * 0.06}s`,
                }}>
                  <span style={{ color: rankColor, fontSize: 20, fontWeight: 800 }}>#{e.rank}</span>
                  <span style={{ color: isGold ? C.text : C.muted, fontSize: 24, fontWeight: isGold ? 800 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.displayName}
                  </span>
                  <span style={{ color: isGold ? "#fbbf24" : C.muted, fontWeight: 900, fontSize: 24, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                    {e.totalPoints.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600 }}>IQ PTS</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
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

  // ── TRIVIA QUESTION ────────────────────────────────────────────────────────
  const TriviaQuestionScreen = () => {
    if (!triviaQ) return null;
    const total = totalAnswers;
    const urgent = countdown <= 5;
    return (
      <div style={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        background: C.bgOuter,
      }}>
        {/* Full-width header bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(0,0,0,0.25)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "18px 64px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <LiveBadge label="LIVE TRIVIA" />
            <div style={{ color: C.faint, fontSize: 24, fontFamily: FONT }}>
              Q{triviaQ.questionNumber} of {triviaQ.totalQuestions}
            </div>
          </div>

          {/* Countdown */}
          <div style={{
            background: urgent ? C.redAlpha : C.bgPanel,
            border: `2px solid ${urgent ? C.red : C.border}`,
            borderRadius: 18, padding: "10px 32px",
            transition: "all 0.3s ease",
          }}>
            <span style={{
              color: urgent ? C.red : C.text,
              fontSize: 64, fontWeight: 900, fontFamily: FONT,
              fontVariantNumeric: "tabular-nums",
              animation: urgent ? "pulse 0.8s ease infinite" : "none",
            }}>{countdown}</span>
          </div>

          <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT }}>
            {total} players answered
          </div>
        </div>

        {/* Question */}
        <div style={{ display: "flex", alignItems: "center", padding: "32px 80px" }}>
          <div style={{
            fontSize: 60, fontWeight: 800, color: C.text,
            lineHeight: 1.25, fontFamily: FONT,
          }}>{triviaQ.question}</div>
        </div>

        {/* Options — horizontal fill bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 80px 48px" }}>
          {(["A", "B", "C", "D"] as const).map((opt) => {
            const p = total > 0 && answerCounts ? pct(answerCounts[opt], total) : 0;
            return (
              <div key={opt} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* Label */}
                <div style={{ width: 52, color: C.faint, fontSize: 32, fontWeight: 800, fontFamily: FONT, flexShrink: 0 }}>{opt}</div>
                {/* Answer text + fill bar stacked */}
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 26, fontWeight: 600, fontFamily: FONT, marginBottom: 6 }}>
                    {triviaQ.options[opt]}
                  </div>
                  <div style={{ height: 10, background: C.bgPanel, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.cardBorder}` }}>
                    <div style={{
                      height: "100%",
                      width: `${p}%`,
                      background: "rgba(255,255,255,0.18)",
                      borderRadius: 6,
                      transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                    }} />
                  </div>
                </div>
                {/* Percentage */}
                <div style={{
                  width: 88, textAlign: "right",
                  color: total > 0 ? C.text : C.faint,
                  fontSize: 32, fontWeight: 900, fontFamily: FONT,
                  fontVariantNumeric: "tabular-nums", flexShrink: 0,
                }}>{p}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── TRIVIA REVEAL ──────────────────────────────────────────────────────────
  const TriviaRevealScreen = () => {
    if (!triviaRev || !triviaQ) return null;
    const total = triviaRev.totalAnswers;
    return (
      <div style={{ padding: "64px 80px", height: "100vh", display: "flex", gap: 60, background: C.bgOuter }}>
        {/* Left: question + bars */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ color: C.muted, fontSize: 32, fontFamily: FONT, lineHeight: 1.35 }}>
            {triviaQ.question}
          </div>

          {/* Correct answer highlight — bigger and more dramatic */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20,
            background: `linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.08) 100%)`,
            border: `2px solid ${C.green}`,
            borderRadius: 20, padding: "28px 40px",
            boxShadow: `0 0 40px rgba(34,197,94,0.15)`,
          }}>
            <span style={{ fontSize: 52 }}>✅</span>
            <span style={{ color: C.green, fontSize: 48, fontWeight: 900, fontFamily: FONT, lineHeight: 1.2 }}>
              {triviaQ.options[triviaRev.correctAnswer]}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            {(["A", "B", "C", "D"] as const).map((opt) => (
              <PctBar
                key={opt}
                label={opt}
                count={triviaRev.answerCounts[opt]}
                total={total}
                highlight={opt === triviaRev.correctAnswer}
              />
            ))}
          </div>

          {triviaRev.funFact && (
            <div style={{
              background: C.bgPanel, border: `1px solid ${C.cardBorder}`,
              borderRadius: 14, padding: "18px 26px",
              color: C.muted, fontSize: 22, fontStyle: "italic", fontFamily: FONT,
              lineHeight: 1.5,
            }}>
              💡 {triviaRev.funFact}
            </div>
          )}
        </div>

        {/* Right: leaderboard with gold/silver/bronze */}
        {leaderboard.length > 0 && (
          <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{
              color: C.faint, fontSize: 18, fontWeight: 700, letterSpacing: 3,
              fontFamily: FONT, marginBottom: 16, textTransform: "uppercase",
            }}>Tonight's Leaders</div>
            {leaderboard.slice(0, 5).map((e, i) => {
              const isGold   = i === 0;
              const isSilver = i === 1;
              const isBronze = i === 2;
              const rowBg = isGold
                ? "linear-gradient(90deg, rgba(255,193,7,0.18), rgba(255,193,7,0.06))"
                : isSilver
                  ? "rgba(148,163,184,0.08)"
                  : isBronze
                    ? "rgba(205,127,50,0.08)"
                    : "rgba(255,255,255,0.03)";
              const rowBorder = isGold
                ? "rgba(255,193,7,0.35)"
                : isSilver
                  ? "rgba(148,163,184,0.2)"
                  : isBronze
                    ? "rgba(205,127,50,0.2)"
                    : C.cardBorder;
              const rankColor = isGold ? "#fbbf24" : isBronze ? "#cd7f32" : C.faint;
              return (
                <div key={e.rank} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 20px",
                  background: rowBg,
                  border: `1px solid ${rowBorder}`,
                  borderRadius: 12,
                  marginBottom: 8,
                  fontFamily: FONT,
                }}>
                  <span style={{ color: isGold ? C.text : C.muted, fontSize: 24, fontWeight: isGold ? 800 : 600 }}>
                    <span style={{ color: rankColor, marginRight: 10, fontSize: 20 }}>#{e.rank}</span>
                    {e.displayName}
                  </span>
                  <span style={{ color: isGold ? "#fbbf24" : C.muted, fontWeight: 900, fontSize: 26, fontVariantNumeric: "tabular-nums" }}>
                    {e.totalPoints.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── PREDICTOR PICK ACTIVE ──────────────────────────────────────────────────
  // predictor-q: crowd picking OVER/UNDER while countdown runs
  const PredictorQuestionScreen = () => {
    if (!predQ) return null;
    const crowd = predCrowd;
    const probPct = Math.round(predQ.sportsiqProbability * 100);
    const colorA = predQ.teamColorHome ?? C.brand;
    const colorB = predQ.teamColorAway ?? C.teal;

    // Circular countdown ring
    const circumference = 2 * Math.PI * 44; // ≈ 276
    const totalSeconds = 60; // default pick window; ring resets each new question
    const dashOffset = circumference * (1 - countdown / totalSeconds);

    // Over percentage for tug bar
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
          {/* Live badge */}
          <div style={{ marginBottom: 8 }}>
            <LiveBadge label="LIVE NOW" />
          </div>

          {/* Team name */}
          <div style={{
            color: "#64748b", fontSize: 18, fontWeight: 700,
            letterSpacing: 2, textTransform: "uppercase", fontFamily: FONT,
          }}>
            {predQ.teamName}
          </div>

          {/* Player name — hero text */}
          <div style={{
            color: C.text, fontSize: 88, fontWeight: 900, fontFamily: FONT,
            letterSpacing: -3, lineHeight: 0.92,
          }}>
            {predQ.playerName}
          </div>

          {/* Stat line */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
            <span style={{
              color: "#6366f1", fontSize: 72, fontWeight: 900,
              fontFamily: FONT, fontVariantNumeric: "tabular-nums",
            }}>{predQ.statLine}</span>
            <span style={{ color: "#94a3b8", fontSize: 26, fontFamily: FONT }}>
              {predQ.statLabel}
            </span>
          </div>

          {/* Context card */}
          <div style={{
            borderLeft: "4px solid #6366f1",
            background: "rgba(99,102,241,0.08)",
            borderRadius: "0 12px 12px 0",
            padding: "14px 20px",
            color: "#94a3b8", fontSize: 20, fontFamily: FONT, lineHeight: 1.5,
          }}>
            Has cleared this line in {probPct} of recent games
          </div>

          {/* SportsIQ Signal */}
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
          {/* Label */}
          <div style={{
            color: C.faint, fontSize: 26, fontWeight: 700,
            letterSpacing: 3, textTransform: "uppercase", fontFamily: FONT,
            textAlign: "center",
          }}>
            {overIsWinning ? "OVER" : "UNDER"} leading
          </div>

          {/* Two big cards */}
          <div style={{ display: "flex", gap: 16 }}>
            {/* OVER card */}
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

            {/* UNDER card */}
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

          {/* Tug-of-war bar */}
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

          {/* CTA */}
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
          {/* LOCKS IN label */}
          <div style={{
            color: C.faint, fontSize: 14, fontWeight: 800,
            letterSpacing: 3, textTransform: "uppercase", fontFamily: FONT,
          }}>LOCKS IN</div>

          {/* Circular countdown */}
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

          {/* Divider */}
          <div style={{ width: "80%", height: 1, background: "rgba(255,255,255,0.08)" }} />

          {/* SCAN TO JOIN label */}
          <div style={{
            color: C.faint, fontSize: 13, fontWeight: 800,
            letterSpacing: 3, textTransform: "uppercase", fontFamily: FONT,
          }}>SCAN TO JOIN</div>

          {/* QR code */}
          {qrDataUrl && (
            <div style={{
              background: C.bgOuter, borderRadius: 16, padding: 12,
              border: `2px solid ${C.border}`,
            }}>
              <img src={qrDataUrl} alt="Join" style={{ width: 120, height: 120, display: "block", borderRadius: 6 }} />
            </div>
          )}

          {/* Room code */}
          <div style={{
            color: C.text, fontSize: 28, fontWeight: 900,
            letterSpacing: 8, fontFamily: FONT, fontVariantNumeric: "tabular-nums",
          }}>{roomCode}</div>
        </div>
      </div>
    );
  };

  // ── PREDICTOR LIVE TRACKING (TUG OF WAR) ───────────────────────────────────
  // predictor-w: picks locked, watching live stat vs target — dramatic rope display
  const PredictorWaitingScreen = () => {
    if (!predQ || !predCrowd) return null;
    const colorA  = predQ.teamColorHome ?? C.brand;
    const colorB  = predQ.teamColorAway ?? C.teal;

    // Rope fill: ratio of currentStat to statLine, capped at 100%
    const current = predCurrentStat ?? 0;
    const target  = predQ.statLine;
    const fillPct = Math.min(100, Math.round((current / target) * 100));
    const remaining = Math.max(0, target - current);

    // Game time placeholder — server would push this in a real integration
    const gameTime = "Q2 8:34";

    return (
      <div style={{
        height: "100vh",
        display: "flex", flexDirection: "column",
        background: teamGradient(colorA, colorB),
      }}>

        {/* ── ROW 1: Header ─────────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          padding: "56px 80px 0",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          {/* Left: live badge + game time */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <LiveBadge label="LIVE TRACKING" />
            <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT }}>{gameTime}</div>
          </div>

          {/* Center: player name + stat category */}
          <div style={{ textAlign: "center", flex: 1, padding: "0 40px" }}>
            <div style={{ color: C.text, fontSize: 64, fontWeight: 900, fontFamily: FONT, lineHeight: 1 }}>
              {predQ.playerName}
            </div>
            <div style={{ color: C.muted, fontSize: 24, fontFamily: FONT, marginTop: 6 }}>
              {predQ.statLabel}
            </div>
          </div>

          {/* Right: quarter + needs X more */}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT, marginBottom: 4 }}>{gameTime}</div>
            <div style={{ color: C.orange, fontSize: 26, fontWeight: 700, fontFamily: FONT }}>
              needs {remaining} more to go OVER
            </div>
          </div>
        </div>

        {/* ── ROW 2: Main content ────────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex", flexDirection: "row",
          padding: "0 60px",
          alignItems: "center",
          gap: 0,
        }}>

          {/* Left column: UNDER crowd */}
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

            {/* Current stat → target */}
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
              {/* Rope track */}
              <div style={{
                width: "100%", height: 22,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 11,
                overflow: "visible",
                position: "relative",
              }}>
                {/* Teal fill — animates from 0 to fillPct on mount */}
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

                {/* Glowing knot at fill position */}
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

                {/* Stat bubble above the knot */}
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

                {/* Target marker — white vertical line at right edge */}
                <div style={{
                  position: "absolute",
                  top: -8, right: 0,
                  width: 4, height: 38,
                  background: C.text,
                  borderRadius: 2,
                }} />
              </div>
            </div>

            {/* Caption below rope */}
            <div style={{ color: C.orange, fontSize: 28, fontWeight: 700, fontFamily: FONT, textAlign: "center" }}>
              {remaining} more {predQ.statLabel.toLowerCase()} needed for OVER
            </div>
          </div>

          {/* Right column: OVER crowd */}
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

        {/* ── ROW 3: Footer ─────────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          padding: "0 80px 52px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        }}>
          {/* Left: info text */}
          <div style={{ color: C.faint, fontSize: 22, fontFamily: FONT, lineHeight: 1.6 }}>
            Open SportsIQ to join future rounds · Picks are locked · Bar plays count 2×
          </div>

          {/* Right: QR + room code */}
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
  };

  // ── PREDICTOR RESULT ───────────────────────────────────────────────────────
  const PredictorResultScreen = () => {
    if (!predResolved || !predQ) return null;
    const res       = predResolved;
    const isMore    = res.result === "more";
    const colorA    = predQ.teamColorHome ?? C.brand;
    const colorB    = predQ.teamColorAway ?? C.teal;
    const winColor  = isMore ? C.brand : C.teal;

    return (
      <div style={{
        padding: "64px 80px", height: "100vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", gap: 36,
        textAlign: "center",
        background: teamGradient(colorA, colorB),
        animation: "fadeIn 0.6s ease",
      }}>
        <div style={{ fontSize: 96 }}>{isMore ? "📈" : "📉"}</div>

        <div>
          <div style={{
            color: winColor, fontSize: 88, fontWeight: 900, fontFamily: FONT,
            lineHeight: 1, marginBottom: 12,
          }}>
            {isMore ? "OVER" : "UNDER"} WINS
          </div>
          <div style={{ color: C.muted, fontSize: 40, fontFamily: FONT }}>
            {predQ.playerName} — {res.finalStat} {predQ.statLabel}
          </div>
        </div>

        {/* Points earned by difficulty */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "🤙 Wise Guy",   pts: res.wiseGuyPoints,   color: C.orange },
            { label: "🔥 Heat Check", pts: res.heatCheckPoints,  color: C.red    },
            { label: "🧱 Chalk",      pts: res.chalkPoints,      color: C.muted  },
          ].map(({ label, pts, color }) => (
            <div key={label} style={{
              background: C.bgPanel,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 20, padding: "24px 48px", textAlign: "center",
              minWidth: 200,
            }}>
              <div style={{ color, fontSize: 24, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>{label}</div>
              <div style={{ color: C.text, fontSize: 44, fontWeight: 900, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                +{pts.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Crowd moment */}
        {predCrowd && (
          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "16px 36px",
          }}>
            <span style={{ color: C.faint, fontSize: 28, fontFamily: FONT }}>
              <span style={{ color: C.text, fontWeight: 800 }}>
                {isMore ? predCrowd.morePercent : predCrowd.lessPercent}%
              </span>{" "}
              of players called it right
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── INTELLIGENCE ALERT OVERLAY ─────────────────────────────────────────────
  // Fixed position — overlays any screen state for 15 seconds
  const IntelAlertOverlay = () => {
    if (!intelAlert) return null;
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
          {intelAlert.teamName ?? intelAlert.question}
        </div>
        <div style={{ color: C.muted, fontSize: 26, fontFamily: FONT }}>
          {Math.round(intelAlert.from * 100)}%
          <span style={{ color: C.faint, margin: "0 8px" }}>→</span>
          {Math.round(intelAlert.to * 100)}%
          <span style={{
            color: intelAlert.direction === "up" ? C.green : C.red,
            marginLeft: 16, fontWeight: 800,
          }}>
            {intelAlert.direction === "up" ? "▲" : "▼"} {intelAlert.movePct}pts
          </span>
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: C.bgOuter,
      minHeight: "100vh",
      fontFamily: FONT,
      color: C.text,
      position: "relative",
      overflow: "hidden",
    }}>
      <InjectStyles />
      <IntelAlertOverlay />

      {screen === "idle"        && <IdleScreen />}
      {screen === "trivia-q"    && <TriviaQuestionScreen />}
      {screen === "trivia-rev"  && <TriviaRevealScreen />}
      {screen === "predictor-q" && <PredictorQuestionScreen />}
      {screen === "predictor-w" && <PredictorWaitingScreen />}
      {screen === "predictor-r" && <PredictorResultScreen />}

      {/* Always-visible mini QR + room code in bottom-right corner */}
      {screen !== "idle" && screen !== "predictor-w" && (
        <div style={{
          position: "fixed", bottom: 28, right: 36,
          display: "flex", alignItems: "center", gap: 14,
          background: "rgba(11,34,48,0.85)",
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 14, padding: "10px 18px",
          backdropFilter: "blur(8px)",
        }}>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Join" style={{ width: 56, height: 56, borderRadius: 6 }} />
          )}
          <div>
            <div style={{ color: C.faint, fontSize: 13, fontFamily: FONT, letterSpacing: 1 }}>JOIN</div>
            <div style={{ color: C.text, fontSize: 22, fontWeight: 900, fontFamily: FONT, letterSpacing: 5, fontVariantNumeric: "tabular-nums" }}>
              {roomCode}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
