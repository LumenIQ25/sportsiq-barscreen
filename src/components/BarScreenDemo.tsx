/**
 * BarScreenDemo.tsx — mark/claude-ui branch
 *
 * SELF-CONTAINED DEMO DRIVER — zero backend required.
 *
 * Purpose (two in one):
 *   1. Isaac (or anyone) can open this and see every bar screen state working
 *      with realistic mock data, no server needed.
 *   2. Every socket event payload is documented here as mock data — this IS
 *      the spec Isaac needs to match in his backend.
 *
 * Usage:
 *   Replace <BarScreen> with <BarScreenDemo> in your entry point.
 *   It auto-cycles through all states every few seconds.
 *
 * To swap in real backend:
 *   Switch back to <BarScreen token={...} barId={...} roomCode={...} joinUrl={...} />
 *   This file can remain as a dev tool / reference spec.
 *
 * Cycle order & durations:
 *   idle         8s  — QR, leaderboard, CTA
 *   trivia-q    12s  — question countdown (IQ points tick down)
 *   trivia-rev   8s  — answer reveal + crowd bars + fun fact
 *   predictor-q  10s — crowd picking OVER/UNDER (split updates live)
 *   predictor-w  10s — picks locked, tug-of-war stat tracker (stat ticks)
 *   predictor-r   8s — result screen (OVER or UNDER won)
 *   → back to idle
 *
 * ─── SOCKET EVENT SPEC FOR ISAAC ──────────────────────────────────────────────
 *
 * Bar screen connects on mount and emits:
 *   barscreen:join  { barId: string }
 *
 * Backend emits to bar screen (namespace: /bar-trivia):
 *   trivia:question       → TriviaQuestion        (triggers trivia-q state)
 *   trivia:answer_counts  → { A,B,C,D: number }   (live vote updates during question)
 *   trivia:reveal         → TriviaReveal           (triggers trivia-rev state)
 *   trivia:leaderboard    → LeaderboardEntry[]     (can update leaderboard anytime)
 *
 * Backend emits to bar screen (namespace: /bar-moreless):
 *   moreless:question     → PredictorQuestion      (triggers predictor-q state)
 *   moreless:crowd_update → PredictorCrowdSplit     (live crowd split during predictor-q)
 *   moreless:stat_update  → { currentStat, probability } (live stat during predictor-w)
 *   moreless:locked       → { crowdSplit }          (triggers predictor-w state)
 *   moreless:resolved     → PredictorResolved       (triggers predictor-r state)
 *
 * Backend emits to bar screen (namespace: /intelligence):
 *   intelligence:alert    → IntelligenceAlert       (15s overlay over any state)
 *
 * Room code: 5-digit numeric string, e.g. "74291"
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Design tokens (identical to BarScreen.tsx) ───────────────────────────────

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

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&display=swap');
@keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
@keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes bar-rope-fill { from{width:0%} to{width:var(--rope-fill-pct)} }
@keyframes slideDown {
  from{transform:translateX(-50%) translateY(-20px);opacity:0}
  to{transform:translateX(-50%) translateY(0);opacity:1}
}
@keyframes demoPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
`;

// ─── Types (Isaac: implement these exact shapes in your backend) ──────────────

type ScreenState = "idle" | "trivia-q" | "trivia-rev" | "predictor-q" | "predictor-w" | "predictor-r";

/** trivia:question payload */
interface TriviaQuestion {
  questionId: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  questionNumber: number;
  totalQuestions: number;
  durationMs: number;
}

/** trivia:reveal payload */
interface TriviaReveal {
  questionId: string;
  correctAnswer: "A" | "B" | "C" | "D";
  answerCounts: { A: number; B: number; C: number; D: number };
  totalAnswers: number;
  funFact: string | null;
  leaderboard: LeaderboardEntry[];
}

/** moreless:question payload */
interface PredictorQuestion {
  questionId: string;
  playerName: string;
  teamName: string;
  teamColorHome?: string;  // hex e.g. "#003594"
  teamColorAway?: string;  // hex e.g. "#FFB612"
  statLabel: string;       // e.g. "Points Tonight"
  statLine: number;        // e.g. 28.5
  sportsiqProbability: number; // 0–100, our model's OVER probability
  locksAt: string;         // ISO timestamp when picks lock
}

/** moreless:crowd_update payload — send every 3–5s during predictor-q */
interface PredictorCrowdSplit {
  more: number;        // raw count OVER picks
  less: number;        // raw count UNDER picks
  morePercent: number; // 0–100
  lessPercent: number; // 0–100
}

/** moreless:locked payload */
interface PredictorLocked {
  crowdSplit: PredictorCrowdSplit;
}

/** moreless:resolved payload */
interface PredictorResolved {
  questionId: string;
  result: "more" | "less";   // who won
  finalStat: number;         // actual stat value e.g. 31
  crowdSplit: PredictorCrowdSplit;
  wiseGuyPoints: number;     // points for going against crowd correctly
  heatCheckPoints: number;   // bonus for being right with high confidence
  chalkPoints: number;       // points for going with crowd correctly
}

/** intelligence:alert payload */
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

// ─── Mock data (Isaac: your backend should emit these shapes exactly) ─────────

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, displayName: "SharpeShooter",  totalPoints: 4_820 },
  { rank: 2, displayName: "MarketMoverMike", totalPoints: 3_915 },
  { rank: 3, displayName: "QuickPickQuinn",  totalPoints: 3_410 },
  { rank: 4, displayName: "OddsWizard",      totalPoints: 2_770 },
  { rank: 5, displayName: "BallparkBob",     totalPoints: 2_550 },
  { rank: 6, displayName: "StatGeek99",      totalPoints: 2_210 },
  { rank: 7, displayName: "LockOfTheDay",    totalPoints: 1_980 },
  { rank: 8, displayName: "NightOwlNate",    totalPoints: 1_640 },
];

/** trivia:question — Isaac emits this to trigger the trivia-q screen */
const MOCK_TRIVIA_QUESTION: TriviaQuestion = {
  questionId: "tq-demo-001",
  question: "In the 2023 NBA Finals, which player won Finals MVP?",
  options: {
    A: "LeBron James",
    B: "Nikola Jokić",
    C: "Jimmy Butler",
    D: "Jamal Murray",
  },
  questionNumber: 3,
  totalQuestions: 10,
  durationMs: 20_000,
};

/** trivia:reveal — Isaac emits this after question closes */
const MOCK_TRIVIA_REVEAL: TriviaReveal = {
  questionId: "tq-demo-001",
  correctAnswer: "B",
  answerCounts: { A: 47, B: 91, C: 23, D: 18 },
  totalAnswers: 179,
  funFact: "Jokić posted 29.8 PPG, 16.8 RPG, and 14.0 APG to claim the award.",
  leaderboard: MOCK_LEADERBOARD,
};

/** moreless:question — Isaac emits this to trigger the predictor-q screen */
const MOCK_PREDICTOR_QUESTION: PredictorQuestion = {
  questionId: "ml-demo-001",
  playerName: "Anthony Edwards",
  teamName: "Timberwolves",
  teamColorHome: "#005083",
  teamColorAway: "#00A94F",
  statLabel: "Points Tonight",
  statLine: 24.5,
  sportsiqProbability: 62,  // our model says 62% chance OVER
  locksAt: new Date(Date.now() + 10_000).toISOString(),
};

/** moreless:crowd_update — Isaac sends these live while picks are open */
const MOCK_CROWD_SPLITS: PredictorCrowdSplit[] = [
  { more: 32, less: 18, morePercent: 64, lessPercent: 36 },
  { more: 55, less: 28, morePercent: 66, lessPercent: 34 },
  { more: 78, less: 47, morePercent: 62, lessPercent: 38 },
];

/** moreless:locked — Isaac emits when pick window closes */
const MOCK_PREDICTOR_LOCKED: PredictorLocked = {
  crowdSplit: { more: 94, less: 61, morePercent: 61, lessPercent: 39 },
};

/** moreless:resolved — Isaac emits when stat is final */
const MOCK_PREDICTOR_RESOLVED: PredictorResolved = {
  questionId: "ml-demo-001",
  result: "more",            // OVER won — Edwards scored 31
  finalStat: 31,
  crowdSplit: { more: 94, less: 61, morePercent: 61, lessPercent: 39 },
  wiseGuyPoints: 350,
  heatCheckPoints: 250,
  chalkPoints: 150,
};

// Demo room info
const DEMO_ROOM_CODE = "74291";
const DEMO_JOIN_URL  = "https://sportsiq.app/join/74291";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function teamGradient(colorA: string = C.brand, colorB: string = C.teal): string {
  return `radial-gradient(ellipse at top left, ${colorA}55 0%, transparent 55%),
          radial-gradient(ellipse at bottom right, ${colorB}55 0%, transparent 55%),
          ${C.bgOuter}`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function InjectStyles() {
  return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}

function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
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
}

/** Right-side QR column — identical on every screen */
function QRColumn() {
  return (
    <div style={{
      flexShrink: 0,
      width: "15%",
      borderLeft: `1px solid rgba(85,69,211,0.22)`,
      background: "rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: "20px 14px",
    }}>
      <div style={{ color: C.faint, fontSize: 11, letterSpacing: 2, fontWeight: 700, textAlign: "center", fontFamily: FONT, textTransform: "uppercase" }}>
        Scan to Join
      </div>
      {/* QR placeholder — real BarScreen.tsx uses qrcode library */}
      <div style={{
        width: 90, height: 90,
        background: C.bgOuter,
        border: `2px solid ${C.border}`,
        borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 42, color: C.brand,
      }}>
        ▦
      </div>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 900, letterSpacing: 5, fontVariantNumeric: "tabular-nums", fontFamily: FONT }}>
        {DEMO_ROOM_CODE}
      </div>
      <div style={{ color: C.faint, fontSize: 11, textAlign: "center", lineHeight: 1.6, fontFamily: FONT }}>
        Free to play<br />Win IQ Points
      </div>
    </div>
  );
}

/** Percent bar — for trivia reveal */
function PctBar({ label, count, total, highlight }: { label: string; count: number; total: number; highlight: boolean }) {
  const p = pct(count, total);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <div style={{ width: 52, color: C.faint, fontSize: 30, fontWeight: 800, fontFamily: FONT }}>{label}</div>
      <div style={{ flex: 1, height: 48, background: C.bgPanel, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.cardBorder}` }}>
        <div style={{
          height: "100%", width: `${p}%`,
          background: highlight ? `linear-gradient(90deg, ${C.teal}, ${C.green})` : "rgba(255,255,255,0.08)",
          borderRadius: 10, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <div style={{
        width: 88, textAlign: "right",
        color: highlight ? C.green : C.text,
        fontSize: 34, fontWeight: 900, fontFamily: FONT, fontVariantNumeric: "tabular-nums",
      }}>{p}%</div>
    </div>
  );
}

/** Demo mode badge — floating in corner so Mark/Isaac always know it's demo */
function DemoBadge({ screen, countdown }: { screen: string; countdown: number }) {
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.75)", border: "1px solid rgba(245,158,11,0.5)",
      borderRadius: 12, padding: "6px 20px",
      display: "flex", alignItems: "center", gap: 12,
      zIndex: 9999,
      animation: "slideDown 0.4s ease",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", background: C.amber,
        animation: "demoPulse 1.5s ease infinite",
      }} />
      <span style={{ color: C.amber, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, fontFamily: FONT }}>
        DEMO MODE
      </span>
      <span style={{ color: C.faint, fontSize: 13, fontFamily: FONT }}>
        {screen} · next in {countdown}s
      </span>
    </div>
  );
}

// ─── IDLE SCREEN ───────────────────────────────────────────────────────────────

function IdleScreen({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  return (
    <div style={{
      display: "flex", height: "100vh",
      background: `radial-gradient(ellipse at top left, rgba(85,69,211,0.30) 0%, transparent 50%),
                   radial-gradient(ellipse at bottom right, rgba(34,140,136,0.24) 0%, transparent 55%),
                   #060d1c`,
      fontFamily: FONT, overflow: "hidden",
    }}>
      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(0,0,0,0.3)", borderBottom: `1px solid ${C.cardBorder}`,
          padding: "18px 48px",
        }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: C.text, fontFamily: FONT, letterSpacing: -1 }}>
            Sports<span style={{ color: C.brand }}>IQ</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: C.faint, fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>PLAYING TONIGHT</div>
              <div style={{ color: C.text, fontSize: 28, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{leaderboard.length}</div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ color: C.faint, fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>NEXT TRIVIA</div>
              <div style={{ color: C.teal, fontSize: 28, fontWeight: 900 }}>SOON</div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />
            <LiveBadge />
          </div>
        </div>

        {/* Body: QR panel + leaderboard + CTA */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "380px 1fr 340px", overflow: "hidden" }}>

          {/* QR panel */}
          <div style={{
            borderRight: `1px solid ${C.cardBorder}`,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 24, padding: "40px 32px",
          }}>
            <div style={{ color: C.faint, fontSize: 13, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>Join the Game</div>
            <div style={{
              background: C.bgOuter, borderRadius: 20, padding: 14,
              border: `2px solid ${C.border}`,
              width: 190, height: 190,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 80, color: C.brand,
            }}>▦</div>
            <div style={{
              border: `2px solid ${C.border}`, borderRadius: 16,
              padding: "14px 28px", textAlign: "center",
              background: "rgba(85,69,211,0.1)", width: "100%",
            }}>
              <div style={{ color: C.faint, fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>ROOM CODE</div>
              <div style={{ color: C.text, fontSize: 46, fontWeight: 900, letterSpacing: 10, fontVariantNumeric: "tabular-nums" }}>
                {DEMO_ROOM_CODE}
              </div>
            </div>
            <div style={{ color: C.faint, fontSize: 15, textAlign: "center", lineHeight: 1.6 }}>
              sportsiq.app/join<br />
              <span style={{ color: C.teal, fontSize: 13 }}>Free to play · Win IQ Points</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ padding: "40px 40px", display: "flex", flexDirection: "column", borderRight: `1px solid ${C.cardBorder}` }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: C.text, fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>
                Tonight's Leaderboard
              </div>
              <div style={{ width: 80, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.teal})`, marginTop: 8, borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.slice(0, 8).map((e, i) => (
                <div key={e.rank} style={{
                  display: "grid", gridTemplateColumns: "42px 1fr auto",
                  alignItems: "center", padding: "14px 20px",
                  background: i === 0 ? "linear-gradient(90deg,rgba(255,193,7,0.18),rgba(255,193,7,0.06))" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${i === 0 ? "rgba(255,193,7,0.35)" : C.cardBorder}`,
                  borderRadius: 12, animation: "fadeIn 0.4s ease both",
                  animationDelay: `${i * 0.06}s`,
                }}>
                  <span style={{ color: i === 0 ? "#fbbf24" : C.faint, fontSize: 20, fontWeight: 800 }}>#{e.rank}</span>
                  <span style={{ color: i === 0 ? C.text : C.muted, fontSize: 22, fontWeight: i === 0 ? 800 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.displayName}
                  </span>
                  <span style={{ color: i === 0 ? "#fbbf24" : C.muted, fontWeight: 900, fontSize: 22, fontVariantNumeric: "tabular-nums" }}>
                    {e.totalPoints.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>IQ</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 20, padding: "40px 32px", textAlign: "center",
          }}>
            <div style={{ color: C.teal, fontSize: 13, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>Free to Play</div>
            <div style={{ color: C.text, fontSize: 48, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1 }}>
              Win IQ points<br /><span style={{ color: C.teal }}>at this bar</span><br />tonight
            </div>
            <div style={{
              background: "rgba(34,140,136,0.12)", border: "1px solid rgba(34,140,136,0.3)",
              borderRadius: 16, padding: "16px 24px",
            }}>
              <div style={{ color: C.muted, fontSize: 14, marginBottom: 6 }}>Pick more or less on live stats</div>
              <div style={{ color: C.teal, fontWeight: 800, fontSize: 18 }}>Answer trivia. Beat the bar.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TRIVIA-Q SCREEN ──────────────────────────────────────────────────────────

function TriviaQScreen({ q, counts, total, countdown }: {
  q: TriviaQuestion;
  counts: { A: number; B: number; C: number; D: number };
  total: number;
  countdown: number;
}) {
  const maxMs  = q.durationMs / 1000;
  const pctLeft = Math.max(0, (countdown / maxMs) * 100);
  const timerColor = countdown > 10 ? C.teal : countdown > 5 ? C.amber : C.red;

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: `radial-gradient(ellipse at top right, rgba(34,140,136,0.25) 0%, transparent 50%), ${C.bgOuter}`,
      fontFamily: FONT, overflow: "hidden",
    }}>
      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Timer bar */}
        <div style={{ height: 8, background: C.bgPanel, flexShrink: 0 }}>
          <div style={{
            height: "100%", width: `${pctLeft}%`,
            background: `linear-gradient(90deg, ${timerColor}, ${timerColor}88)`,
            transition: "width 1s linear, background 0.5s ease",
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px", borderBottom: `1px solid ${C.cardBorder}`,
          background: "rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: -1 }}>
            Sports<span style={{ color: C.brand }}>IQ</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ color: C.faint, fontSize: 18, fontWeight: 700 }}>
              Question {q.questionNumber} of {q.totalQuestions}
            </span>
            <LiveBadge label="TRIVIA" />
          </div>
          {/* Countdown circle */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `conic-gradient(${timerColor} ${pctLeft * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 20px ${timerColor}44`,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: C.bgOuter,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: timerColor, fontSize: 26, fontWeight: 900, fontVariantNumeric: "tabular-nums",
            }}>{countdown}</div>
          </div>
        </div>

        {/* Question */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 48px", gap: 28 }}>
          <div style={{
            background: C.bgPanel, border: `1px solid ${C.border}`,
            borderRadius: 20, padding: "28px 36px",
            color: C.text, fontSize: 36, fontWeight: 700, lineHeight: 1.35,
            boxShadow: `0 0 40px rgba(85,69,211,0.15)`,
          }}>
            {q.question}
          </div>

          {/* Options grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const voteCount = counts[opt];
              const votePct   = pct(voteCount, total);
              return (
                <div key={opt} style={{
                  background: C.bgPanel, border: `1px solid ${C.cardBorder}`,
                  borderRadius: 16, padding: "20px 24px",
                  display: "flex", alignItems: "center", gap: 16,
                  position: "relative", overflow: "hidden",
                  animation: "fadeIn 0.4s ease both",
                }}>
                  {/* Vote fill */}
                  <div style={{
                    position: "absolute", inset: 0,
                    width: `${votePct}%`, background: "rgba(85,69,211,0.12)",
                    transition: "width 0.6s ease",
                  }} />
                  <div style={{
                    flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                    background: C.brandAlpha, border: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.brand, fontSize: 22, fontWeight: 900, position: "relative",
                  }}>{opt}</div>
                  <div style={{ color: C.text, fontSize: 22, fontWeight: 600, flex: 1, position: "relative", lineHeight: 1.3 }}>
                    {q.options[opt]}
                  </div>
                  {total > 0 && (
                    <div style={{ color: C.muted, fontSize: 18, fontWeight: 700, position: "relative", fontVariantNumeric: "tabular-nums" }}>
                      {votePct}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Answers count */}
          <div style={{ textAlign: "center", color: C.faint, fontSize: 18, fontWeight: 600 }}>
            {total.toLocaleString()} answer{total !== 1 ? "s" : ""} in
          </div>
        </div>
      </div>

      <QRColumn />
    </div>
  );
}

// ─── TRIVIA-REV SCREEN ────────────────────────────────────────────────────────

function TriviaRevScreen({ q, rev }: { q: TriviaQuestion; rev: TriviaReveal }) {
  return (
    <div style={{
      display: "flex", height: "100vh",
      background: `radial-gradient(ellipse at top left, rgba(34,197,94,0.18) 0%, transparent 50%), ${C.bgOuter}`,
      fontFamily: FONT, overflow: "hidden",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px", borderBottom: `1px solid ${C.cardBorder}`,
          background: "rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: -1 }}>
            Sports<span style={{ color: C.brand }}>IQ</span>
          </div>
          <div style={{
            background: C.greenAlpha, border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: 24, padding: "8px 24px",
            color: C.green, fontSize: 18, fontWeight: 800, letterSpacing: 2,
          }}>✓ ANSWER REVEALED</div>
          <div style={{ color: C.faint, fontSize: 18 }}>Q {q.questionNumber} of {q.totalQuestions}</div>
        </div>

        <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>

          {/* Left: question + bars */}
          <div style={{ flex: 1, padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24, borderRight: `1px solid ${C.cardBorder}` }}>
            <div style={{
              background: C.bgPanel, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "20px 28px",
              color: C.text, fontSize: 28, fontWeight: 600, lineHeight: 1.4,
            }}>{q.question}</div>

            {(["A", "B", "C", "D"] as const).map((opt) => (
              <PctBar
                key={opt} label={opt}
                count={rev.answerCounts[opt]} total={rev.totalAnswers}
                highlight={opt === rev.correctAnswer}
              />
            ))}

            {rev.funFact && (
              <div style={{
                background: "rgba(34,140,136,0.12)", border: "1px solid rgba(34,140,136,0.3)",
                borderRadius: 14, padding: "16px 24px",
                color: C.teal, fontSize: 20, fontStyle: "italic", lineHeight: 1.5,
              }}>
                💡 {rev.funFact}
              </div>
            )}
          </div>

          {/* Right: mini leaderboard */}
          <div style={{ width: 380, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: C.faint, fontSize: 14, fontWeight: 700, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
              Leaders
            </div>
            {rev.leaderboard.slice(0, 5).map((e, i) => (
              <div key={e.rank} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 18px",
                background: i === 0 ? "rgba(85,69,211,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === 0 ? C.border : C.cardBorder}`,
                borderRadius: 12, animation: "fadeIn 0.4s ease both",
                animationDelay: `${i * 0.07}s`,
              }}>
                <span style={{ color: i === 0 ? C.text : C.muted, fontSize: 20, fontWeight: i === 0 ? 800 : 500 }}>
                  <span style={{ color: C.faint, marginRight: 8, fontSize: 16 }}>#{e.rank}</span>
                  {e.displayName}
                </span>
                <span style={{ color: i === 0 ? C.brand : C.muted, fontWeight: 900, fontSize: 20, fontVariantNumeric: "tabular-nums" }}>
                  {e.totalPoints.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <QRColumn />
    </div>
  );
}

// ─── PREDICTOR-Q SCREEN ───────────────────────────────────────────────────────

function PredictorQScreen({ q, crowd, countdown }: {
  q: PredictorQuestion;
  crowd: PredictorCrowdSplit | null;
  countdown: number;
}) {
  const moreW = crowd?.morePercent ?? 50;
  const lessW = crowd?.lessPercent ?? 50;

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: teamGradient(q.teamColorHome, q.teamColorAway),
      fontFamily: FONT, overflow: "hidden",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px", borderBottom: `1px solid rgba(255,255,255,0.07)`,
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: -1 }}>
            Sports<span style={{ color: C.brand }}>IQ</span>
          </div>
          <LiveBadge label="LIVE PICK" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: C.faint, fontSize: 16 }}>Locks in</span>
            <span style={{
              color: C.amber, fontSize: 32, fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
            }}>{countdown}s</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "32px 64px" }}>

          {/* Player + stat */}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 18, fontWeight: 700, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
              {q.teamName}
            </div>
            <div style={{ color: C.text, fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>
              {q.playerName}
            </div>
          </div>

          {/* Stat line */}
          <div style={{
            background: "rgba(0,0,0,0.4)", border: `2px solid ${C.border}`,
            borderRadius: 24, padding: "20px 48px", textAlign: "center",
          }}>
            <div style={{ color: C.faint, fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>
              {q.statLabel}
            </div>
            <div style={{ color: C.text, fontSize: 72, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {q.statLine}
            </div>
          </div>

          {/* OVER / UNDER buttons */}
          <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 700 }}>
            {[
              { label: "OVER", color: C.green, bg: C.greenAlpha, border: "rgba(34,197,94,0.4)" },
              { label: "UNDER", color: C.red,   bg: C.redAlpha,   border: "rgba(239,68,68,0.4)" },
            ].map(({ label, color, bg, border }) => (
              <div key={label} style={{
                flex: 1, background: bg, border: `2px solid ${border}`,
                borderRadius: 20, padding: "28px 0", textAlign: "center",
              }}>
                <div style={{ color, fontSize: 38, fontWeight: 900, letterSpacing: 3 }}>{label}</div>
                <div style={{ color: `${color}88`, fontSize: 16, marginTop: 6, fontWeight: 600 }}>
                  Pick on your phone
                </div>
              </div>
            ))}
          </div>

          {/* Crowd split tug-of-war */}
          {crowd && (
            <div style={{ width: "100%", maxWidth: 700 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: C.green, fontWeight: 800, fontSize: 20 }}>{moreW}% OVER</span>
                <span style={{ color: C.faint, fontSize: 16 }}>crowd split</span>
                <span style={{ color: C.red, fontWeight: 800, fontSize: 20 }}>UNDER {lessW}%</span>
              </div>
              <div style={{
                height: 16, background: C.bgPanel, borderRadius: 8,
                overflow: "hidden", display: "flex",
              }}>
                <div style={{ width: `${moreW}%`, background: `linear-gradient(90deg, ${C.green}, ${C.teal})`, transition: "width 0.8s ease" }} />
                <div style={{ flex: 1, background: `linear-gradient(90deg, ${C.red}88, ${C.red})`, transition: "flex 0.8s ease" }} />
              </div>
            </div>
          )}

          {/* SportsIQ probability */}
          <div style={{
            background: "rgba(85,69,211,0.12)", border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "12px 32px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ color: C.faint, fontSize: 15, fontWeight: 600 }}>SportsIQ model:</span>
            <span style={{ color: C.brand, fontSize: 22, fontWeight: 900 }}>{q.sportsiqProbability}%</span>
            <span style={{ color: C.muted, fontSize: 15 }}>chance OVER</span>
          </div>
        </div>
      </div>

      <QRColumn />
    </div>
  );
}

// ─── PREDICTOR-W SCREEN (Waiting / Tug-of-war) ────────────────────────────────

function PredictorWScreen({ q, crowd, currentStat, probability }: {
  q: PredictorQuestion;
  crowd: PredictorCrowdSplit;
  currentStat: number | null;
  probability: number | null;
}) {
  const moreW = crowd.morePercent;

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: teamGradient(q.teamColorHome, q.teamColorAway),
      fontFamily: FONT, overflow: "hidden",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px", borderBottom: `1px solid rgba(255,255,255,0.07)`,
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: -1 }}>
            Sports<span style={{ color: C.brand }}>IQ</span>
          </div>
          <div style={{
            background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)",
            borderRadius: 24, padding: "8px 24px",
            color: C.amber, fontSize: 18, fontWeight: 800, letterSpacing: 2,
          }}>🔒 PICKS LOCKED</div>
          <LiveBadge label="TRACKING" />
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: "32px 64px" }}>

          {/* Player + live stat */}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 16, letterSpacing: 3, marginBottom: 6, textTransform: "uppercase" }}>{q.teamName}</div>
            <div style={{ color: C.text, fontSize: 56, fontWeight: 900, letterSpacing: -1 }}>{q.playerName}</div>
            <div style={{ color: C.faint, fontSize: 18, marginTop: 4 }}>{q.statLabel} · Line: {q.statLine}</div>
          </div>

          {/* Live stat display */}
          <div style={{
            background: "rgba(0,0,0,0.5)", border: `2px solid ${C.border}`,
            borderRadius: 24, padding: "20px 64px", textAlign: "center",
          }}>
            <div style={{ color: C.faint, fontSize: 15, letterSpacing: 2, marginBottom: 4 }}>CURRENT</div>
            <div style={{ color: C.text, fontSize: 80, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {currentStat ?? "—"}
            </div>
            <div style={{
              color: currentStat != null
                ? currentStat > q.statLine ? C.green : currentStat < q.statLine ? C.red : C.amber
                : C.faint,
              fontSize: 18, fontWeight: 700, marginTop: 4,
            }}>
              {currentStat != null
                ? currentStat > q.statLine ? `▲ +${(currentStat - q.statLine).toFixed(1)} OVER`
                : currentStat < q.statLine ? `▼ ${(currentStat - q.statLine).toFixed(1)} UNDER`
                : "AT THE LINE"
                : "Waiting for data..."}
            </div>
          </div>

          {/* Tug-of-war rope */}
          <div style={{ width: "100%", maxWidth: 760 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: C.green, fontWeight: 800, fontSize: 22 }}>OVER {moreW}%</span>
              <span style={{ color: C.faint, fontSize: 16 }}>crowd picks locked</span>
              <span style={{ color: C.red, fontWeight: 800, fontSize: 22 }}>UNDER {crowd.lessPercent}%</span>
            </div>
            <div style={{ height: 24, background: C.bgPanel, borderRadius: 12, overflow: "hidden", display: "flex", position: "relative" }}>
              <div style={{ width: `${moreW}%`, background: `linear-gradient(90deg, ${C.green}, ${C.teal})`, borderRadius: 12, transition: "width 1s ease" }} />
              <div style={{ flex: 1, background: `linear-gradient(90deg, ${C.red}88, ${C.red})`, borderRadius: 12 }} />
              {/* Knot indicator at midpoint */}
              <div style={{
                position: "absolute", top: "50%", left: `${moreW}%`,
                transform: "translate(-50%, -50%)",
                width: 20, height: 20, borderRadius: "50%",
                background: C.text, border: "2px solid rgba(0,0,0,0.5)",
                boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                transition: "left 1s ease",
              }} />
            </div>
            <div style={{ textAlign: "center", color: C.faint, fontSize: 14, marginTop: 8 }}>
              {crowd.more + crowd.less} picks locked in
            </div>
          </div>

          {/* Model probability update */}
          {probability != null && (
            <div style={{
              background: "rgba(85,69,211,0.12)", border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "12px 32px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ color: C.faint, fontSize: 15 }}>SportsIQ live model:</span>
              <span style={{ color: C.brand, fontSize: 22, fontWeight: 900 }}>{probability}%</span>
              <span style={{ color: C.muted, fontSize: 15 }}>chance OVER</span>
            </div>
          )}
        </div>
      </div>

      <QRColumn />
    </div>
  );
}

// ─── PREDICTOR-R SCREEN (Result) ──────────────────────────────────────────────

function PredictorRScreen({ q, res }: {
  q: PredictorQuestion;
  res: PredictorResolved;
}) {
  const won = res.result === "more";

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: won
        ? `radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, transparent 60%), ${C.bgOuter}`
        : `radial-gradient(ellipse at center, rgba(239,68,68,0.25) 0%, transparent 60%), ${C.bgOuter}`,
      fontFamily: FONT, overflow: "hidden",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px", borderBottom: `1px solid rgba(255,255,255,0.07)`,
          background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: -1 }}>
            Sports<span style={{ color: C.brand }}>IQ</span>
          </div>
          <div style={{
            background: won ? C.greenAlpha : C.redAlpha,
            border: `1px solid ${won ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
            borderRadius: 24, padding: "8px 24px",
            color: won ? C.green : C.red, fontSize: 18, fontWeight: 800, letterSpacing: 2,
          }}>{won ? "✓ OVER WINS" : "✓ UNDER WINS"}</div>
          <div style={{ color: C.faint, fontSize: 16 }}>{q.teamName}</div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: "32px 64px" }}>

          {/* Result hero */}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 18, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
              {q.playerName} · {q.statLabel}
            </div>
            <div style={{
              fontSize: 96, fontWeight: 900, lineHeight: 1,
              color: won ? C.green : C.red,
              textShadow: `0 0 40px ${won ? C.green : C.red}88`,
            }}>{res.finalStat}</div>
            <div style={{ color: C.faint, fontSize: 24, marginTop: 8 }}>
              Line was {q.statLine} · {won ? `+${(res.finalStat - q.statLine).toFixed(1)} OVER` : `${(res.finalStat - q.statLine).toFixed(1)} UNDER`}
            </div>
          </div>

          {/* Points earned by pick type */}
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Wise Guy", sub: "Against crowd + right", pts: res.wiseGuyPoints, color: C.amber },
              { label: "Heat Check", sub: "High confidence + right", pts: res.heatCheckPoints, color: C.brand },
              { label: "Chalk",     sub: "With crowd + right", pts: res.chalkPoints,    color: C.teal  },
            ].map(({ label, sub, pts, color }) => (
              <div key={label} style={{
                flex: 1, background: "rgba(0,0,0,0.35)", border: `1px solid ${color}44`,
                borderRadius: 16, padding: "20px 24px", textAlign: "center",
              }}>
                <div style={{ color, fontSize: 14, fontWeight: 700, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
                <div style={{ color: C.text, fontSize: 36, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                  +{pts.toLocaleString()}
                </div>
                <div style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Crowd split recap */}
          <div style={{ width: "100%", maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: C.green, fontWeight: 700, fontSize: 18 }}>OVER {res.crowdSplit.morePercent}%</span>
              <span style={{ color: C.faint, fontSize: 15 }}>final crowd split</span>
              <span style={{ color: C.red, fontWeight: 700, fontSize: 18 }}>UNDER {res.crowdSplit.lessPercent}%</span>
            </div>
            <div style={{ height: 14, background: C.bgPanel, borderRadius: 7, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${res.crowdSplit.morePercent}%`, background: `linear-gradient(90deg, ${C.green}, ${C.teal})` }} />
              <div style={{ flex: 1, background: `linear-gradient(90deg, ${C.red}88, ${C.red})` }} />
            </div>
          </div>
        </div>
      </div>

      <QRColumn />
    </div>
  );
}

// ─── INTELLIGENCE ALERT OVERLAY ───────────────────────────────────────────────

function IntelAlertOverlay({ alert }: { alert: IntelligenceAlert }) {
  const up = alert.direction === "up";
  return (
    <div style={{
      position: "fixed", top: 32, left: "50%", transform: "translateX(-50%)",
      background: up ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
      backdropFilter: "blur(20px)",
      border: `2px solid ${up ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
      borderRadius: 20, padding: "20px 40px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      animation: "slideDown 0.4s ease", zIndex: 9000,
    }}>
      <div style={{ color: up ? C.green : C.red, fontSize: 15, fontWeight: 800, letterSpacing: 3, fontFamily: FONT }}>
        ⚡ MARKET MOVE {up ? "▲" : "▼"} {alert.movePct}%
      </div>
      <div style={{ color: C.text, fontSize: 28, fontWeight: 800, fontFamily: FONT, textAlign: "center" }}>
        {alert.question}
      </div>
      <div style={{ color: C.faint, fontFamily: FONT, fontSize: 16 }}>
        {alert.from}% → {alert.to}%{alert.teamName ? ` · ${alert.teamName}` : ""}
      </div>
    </div>
  );
}

// ─── MAIN DEMO COMPONENT ──────────────────────────────────────────────────────

type DemoStep = {
  state: ScreenState;
  duration: number; // seconds
};

const DEMO_STEPS: DemoStep[] = [
  { state: "idle",        duration: 8 },
  { state: "trivia-q",   duration: 12 },
  { state: "trivia-rev", duration: 8 },
  { state: "predictor-q", duration: 10 },
  { state: "predictor-w", duration: 10 },
  { state: "predictor-r", duration: 8 },
];

export function BarScreenDemo() {
  const [stepIdx, setStepIdx]         = useState(0);
  const [stepTimer, setStepTimer]     = useState(DEMO_STEPS[0].duration);
  const [countdown, setCountdown]     = useState(MOCK_TRIVIA_QUESTION.durationMs / 1000);
  const [answerCounts, setAnswerCounts] = useState({ A: 0, B: 0, C: 0, D: 0 });
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [crowd, setCrowd]             = useState<PredictorCrowdSplit | null>(null);
  const [currentStat, setCurrentStat] = useState<number | null>(null);
  const [probability, setProbability] = useState<number | null>(null);
  const [intelAlert, setIntelAlert]   = useState<IntelligenceAlert | null>(null);

  const stepRef   = useRef(stepIdx);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  stepRef.current = stepIdx;

  const currentStep = DEMO_STEPS[stepIdx];
  const screen      = currentStep.state;

  // ── Main cycle tick ────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setStepTimer((t) => {
      if (t <= 1) {
        // Advance to next step
        const nextIdx = (stepRef.current + 1) % DEMO_STEPS.length;
        setStepIdx(nextIdx);
        initStep(nextIdx);
        return DEMO_STEPS[nextIdx].duration;
      }
      return t - 1;
    });

    // Also tick question countdown
    setCountdown((c) => Math.max(0, c - 1));
  }, []);

  function initStep(idx: number) {
    const s = DEMO_STEPS[idx].state;
    if (s === "trivia-q") {
      setCountdown(MOCK_TRIVIA_QUESTION.durationMs / 1000);
      setAnswerCounts({ A: 0, B: 0, C: 0, D: 0 });
      setTotalAnswers(0);
    }
    if (s === "predictor-q") {
      setCrowd(MOCK_CROWD_SPLITS[0]);
    }
    if (s === "predictor-w") {
      setCrowd(MOCK_PREDICTOR_LOCKED.crowdSplit);
      setCurrentStat(18);
      setProbability(58);
    }
  }

  // ── Live mock updates during active screens ────────────────────────────────
  useEffect(() => {
    if (screen === "trivia-q") {
      // Simulate votes arriving
      const t = setTimeout(() => {
        setAnswerCounts({ A: 47, B: 74, C: 22, D: 16 });
        setTotalAnswers(159);
      }, 3000);
      return () => clearTimeout(t);
    }

    if (screen === "predictor-q") {
      // Cycle through crowd splits
      let i = 0;
      const t = setInterval(() => {
        i = (i + 1) % MOCK_CROWD_SPLITS.length;
        setCrowd(MOCK_CROWD_SPLITS[i]);
      }, 3000);
      return () => clearInterval(t);
    }

    if (screen === "predictor-w") {
      // Tick live stat and probability
      const t = setInterval(() => {
        setCurrentStat((s) => {
          if (s == null) return 18;
          const delta = Math.random() > 0.5 ? 3 : 2;
          return Math.min(s + delta, 34);
        });
        setProbability((p) => {
          if (p == null) return 58;
          const shift = Math.random() > 0.5 ? 3 : -2;
          return Math.max(35, Math.min(85, p + shift));
        });
      }, 2500);
      return () => clearInterval(t);
    }
  }, [screen]);

  // ── Fire a demo intelligence alert once during trivia-rev ─────────────────
  useEffect(() => {
    if (screen === "trivia-rev") {
      const t = setTimeout(() => {
        setIntelAlert({
          question: "Celtics -4.5 vs Knicks",
          teamName: "Celtics",
          from: 62, to: 71,
          direction: "up", movePct: 14,
        });
        setTimeout(() => setIntelAlert(null), 7000);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // ── Start/stop main interval ──────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tick]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", fontFamily: FONT }}>
      <InjectStyles />

      {screen === "idle" && (
        <IdleScreen leaderboard={MOCK_LEADERBOARD} />
      )}
      {screen === "trivia-q" && (
        <TriviaQScreen
          q={MOCK_TRIVIA_QUESTION}
          counts={answerCounts}
          total={totalAnswers}
          countdown={countdown}
        />
      )}
      {screen === "trivia-rev" && (
        <TriviaRevScreen q={MOCK_TRIVIA_QUESTION} rev={MOCK_TRIVIA_REVEAL} />
      )}
      {screen === "predictor-q" && (
        <PredictorQScreen
          q={MOCK_PREDICTOR_QUESTION}
          crowd={crowd}
          countdown={countdown}
        />
      )}
      {screen === "predictor-w" && crowd && (
        <PredictorWScreen
          q={MOCK_PREDICTOR_QUESTION}
          crowd={crowd}
          currentStat={currentStat}
          probability={probability}
        />
      )}
      {screen === "predictor-r" && (
        <PredictorRScreen q={MOCK_PREDICTOR_QUESTION} res={MOCK_PREDICTOR_RESOLVED} />
      )}

      {/* Intel alert overlay — fires over any screen */}
      {intelAlert && <IntelAlertOverlay alert={intelAlert} />}

      {/* Demo mode badge */}
      <DemoBadge screen={screen} countdown={stepTimer} />
    </div>
  );
}

export default BarScreenDemo;
