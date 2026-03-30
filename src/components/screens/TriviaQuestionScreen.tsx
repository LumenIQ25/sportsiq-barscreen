import { C, FONT } from "../../theme";
import { pct } from "../../utils";
import type { TriviaQuestion, AnswerCounts } from "../../types";
import { LiveBadge } from "../ui/LiveBadge";

interface Props {
  triviaQ: TriviaQuestion;
  answerCounts: AnswerCounts | null;
  totalAnswers: number;
  countdown: number;
}

export function TriviaQuestionScreen({ triviaQ, answerCounts, totalAnswers, countdown }: Props) {
  const total = totalAnswers;
  const urgent = countdown <= 5;
  const dots = Array.from({ length: triviaQ.totalQuestions }, (_, i) => i);

  return (
    <div style={{
      height: "100vh",
      display: "flex", flexDirection: "column",
      background: `radial-gradient(ellipse at top, rgba(85,69,211,0.18) 0%, transparent 60%), ${C.bgOuter}`,
      fontFamily: FONT,
      overflow: "hidden",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.30)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "16px 64px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <LiveBadge label="LIVE TRIVIA" />
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {dots.map((_, i) => (
              <div key={i} style={{
                width: i === triviaQ.questionNumber - 1 ? 22 : 8,
                height: 8, borderRadius: 4,
                background: i < triviaQ.questionNumber - 1
                  ? C.teal
                  : i === triviaQ.questionNumber - 1
                    ? C.brand
                    : "rgba(255,255,255,0.12)",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>
          <div style={{ color: C.faint, fontSize: 20, fontFamily: FONT }}>
            Q{triviaQ.questionNumber} / {triviaQ.totalQuestions}
          </div>
        </div>

        <div style={{
          background: urgent ? C.redAlpha : "rgba(85,69,211,0.20)",
          border: `2px solid ${urgent ? C.red : C.brand}`,
          borderRadius: 20, padding: "6px 40px",
          transition: "all 0.3s ease",
        }}>
          <span style={{
            color: urgent ? C.red : C.text,
            fontSize: 72, fontWeight: 900, fontFamily: FONT,
            fontVariantNumeric: "tabular-nums", lineHeight: 1,
            animation: urgent ? "pulse 0.6s ease infinite" : "none",
          }}>{countdown}</span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.text, fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{total}</div>
          <div style={{ color: C.faint, fontSize: 14, letterSpacing: 1.5 }}>ANSWERING</div>
        </div>
      </div>

      {/* Question */}
      <div style={{ flexShrink: 0, padding: "32px 80px 20px" }}>
        <div style={{
          fontSize: 58, fontWeight: 800, color: C.text,
          lineHeight: 1.25, fontFamily: FONT,
        }}>{triviaQ.question}</div>
      </div>

      {/* Answer cards */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        padding: "0 80px 32px",
        gap: 14,
        overflow: "hidden",
      }}>
        {(["A", "B", "C", "D"] as const).map((opt) => {
          const p = total > 0 && answerCounts ? pct(answerCounts[opt], total) : 0;
          return (
            <div key={opt} style={{
              position: "relative",
              flex: 1,
              display: "flex", alignItems: "center", gap: 24,
              background: C.bgPanel,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 18,
              padding: "0 36px",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: "0 auto 0 0",
                width: `${p}%`,
                background: "rgba(85,69,211,0.28)",
                borderRadius: 18,
                transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              }} />
              <div style={{
                position: "relative", flexShrink: 0,
                width: 64, height: 64,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted, fontSize: 28, fontWeight: 900,
              }}>{opt}</div>
              <div style={{
                position: "relative", flex: 1,
                color: C.text, fontSize: 30, fontWeight: 600,
                fontFamily: FONT, lineHeight: 1.3,
              }}>{triviaQ.options[opt]}</div>
              {total > 0 && (
                <div style={{
                  position: "relative", flexShrink: 0,
                  color: C.muted, fontSize: 38, fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                }}>{p}%</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
