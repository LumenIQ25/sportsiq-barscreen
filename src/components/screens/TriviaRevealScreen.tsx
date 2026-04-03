import { C, FONT } from "../../theme";
import { pct } from "../../utils";
import type { TriviaQuestion, TriviaReveal, LeaderboardEntry } from "../../types";
import { LeaderboardRow } from "../ui/LeaderboardRow";

interface Props {
  triviaQ: TriviaQuestion;
  triviaRev: TriviaReveal;
  leaderboard: LeaderboardEntry[];
}

export function TriviaRevealScreen({ triviaQ, triviaRev, leaderboard }: Props) {
  const total = triviaRev.totalAnswers;
  const correctCount = triviaRev.answerCounts[triviaRev.correctAnswer];
  const correctPct = pct(correctCount, total);
  const isLastQuestion = triviaQ.questionNumber === triviaQ.totalQuestions;

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: `radial-gradient(ellipse at top left, rgba(34,197,94,0.10) 0%, transparent 55%), ${C.bgOuter}`,
      fontFamily: FONT, overflow: "hidden",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.30)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "16px 64px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{
            background: C.tealAlpha, border: `1px solid ${C.teal}`,
            borderRadius: 12, padding: "8px 22px",
            color: C.teal, fontSize: 20, fontWeight: 800, letterSpacing: 2,
          }}>ANSWER REVEALED</div>
          <div style={{ color: C.faint, fontSize: 20 }}>
            Q{triviaQ.questionNumber} / {triviaQ.totalQuestions}
          </div>
          {isLastQuestion && (
            <div style={{
              background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.4)",
              borderRadius: 12, padding: "8px 22px",
              color: "#fbbf24", fontSize: 18, fontWeight: 800, letterSpacing: 1.5,
            }}>ROUND COMPLETE</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.green, fontSize: 36, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{correctPct}%</div>
          <div style={{ color: C.faint, fontSize: 14, letterSpacing: 1.5 }}>GOT IT RIGHT</div>
        </div>
      </div>

      {/* Body: question+answers left, leaderboard right */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 400px", overflow: "hidden" }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", padding: "36px 48px 36px 80px", gap: 20 }}>
          <div style={{ color: C.muted, fontSize: 28, fontFamily: FONT, lineHeight: 1.4, flexShrink: 0 }}>
            {triviaQ.question}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const isCorrect = opt === triviaRev.correctAnswer;
              const p = pct(triviaRev.answerCounts[opt], total);
              return (
                <div key={opt} style={{
                  position: "relative",
                  flex: 1,
                  display: "flex", alignItems: "center", gap: 20,
                  background: isCorrect ? "rgba(34,197,94,0.08)" : C.bgPanel,
                  border: `2px solid ${isCorrect ? C.green : C.cardBorder}`,
                  borderRadius: 16, padding: "0 28px",
                  overflow: "hidden",
                  boxShadow: isCorrect ? "0 0 40px rgba(34,197,94,0.15)" : "none",
                  transition: "all 0.4s ease",
                }}>
                  <div style={{
                    position: "absolute", inset: "0 auto 0 0",
                    width: `${p}%`,
                    background: isCorrect ? "rgba(34,197,94,0.20)" : "rgba(255,255,255,0.05)",
                    borderRadius: 16,
                    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                  <div style={{
                    position: "relative", flexShrink: 0,
                    width: 60, height: 60, borderRadius: 12,
                    background: isCorrect ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isCorrect ? C.green : C.faint,
                    fontSize: isCorrect ? 30 : 24, fontWeight: 900,
                  }}>{isCorrect ? "✓" : opt}</div>
                  <div style={{
                    position: "relative", flex: 1,
                    color: isCorrect ? C.text : C.muted,
                    fontSize: isCorrect ? 28 : 24,
                    fontWeight: isCorrect ? 800 : 500,
                    fontFamily: FONT, lineHeight: 1.3,
                  }}>{triviaQ.options[opt]}</div>
                  <div style={{
                    position: "relative", flexShrink: 0,
                    color: isCorrect ? C.green : C.faint,
                    fontSize: 34, fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}>{p}%</div>
                </div>
              );
            })}
          </div>

          {triviaRev.funFact && (
            <div style={{
              background: "linear-gradient(135deg, rgba(85,69,211,0.15), rgba(34,140,136,0.10))",
              border: "1px solid rgba(85,69,211,0.25)",
              borderRadius: 14, padding: "16px 24px",
              display: "flex", gap: 16, alignItems: "flex-start", flexShrink: 0,
            }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>💡</span>
              <div style={{ color: C.muted, fontSize: 21, fontFamily: FONT, lineHeight: 1.5 }}>
                {triviaRev.funFact}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tonight's cumulative leaderboard */}
        {leaderboard.length > 0 && (
          <div style={{
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column",
            padding: "32px 36px 32px 28px",
            background: "rgba(0,0,0,0.12)",
          }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                color: isLastQuestion ? "#fbbf24" : C.text,
                fontSize: 16, fontWeight: 800, letterSpacing: 3,
                fontFamily: FONT, textTransform: "uppercase",
              }}>
                {isLastQuestion ? "🏆 Final Standings" : "Tonight's Total"}
              </div>
              <div style={{
                color: C.faint, fontSize: 12, fontFamily: FONT, marginTop: 4,
              }}>
                Cumulative across all rounds
              </div>
              <div style={{
                width: 48, height: 2,
                background: isLastQuestion
                  ? "linear-gradient(90deg, #fbbf24, rgba(255,193,7,0.3))"
                  : `linear-gradient(90deg, ${C.brand}, ${C.teal})`,
                marginTop: 8, borderRadius: 1,
              }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.slice(0, 7).map((e, i) => (
                <LeaderboardRow key={e.rank} entry={e} index={i} size="small" />
              ))}
            </div>

            {/* Prompt to keep playing */}
            {!isLastQuestion && (
              <div style={{
                marginTop: "auto",
                paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.05)",
                textAlign: "center",
              }}>
                <div style={{
                  color: C.teal, fontSize: 13, fontWeight: 700,
                  fontFamily: FONT, letterSpacing: 1,
                }}>
                  Next question coming up…
                </div>
              </div>
            )}

            {/* Round complete CTA */}
            {isLastQuestion && (
              <div style={{
                marginTop: "auto",
                paddingTop: 20,
                borderTop: "1px solid rgba(255,193,7,0.15)",
                textAlign: "center",
              }}>
                <div style={{
                  color: "#fbbf24", fontSize: 13, fontWeight: 700,
                  fontFamily: FONT, letterSpacing: 1, lineHeight: 1.5,
                }}>
                  Round done! Scan QR to play<br />the next round
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
