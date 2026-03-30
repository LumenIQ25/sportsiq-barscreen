import { C, FONT } from "../../theme";
import { teamGradient } from "../../utils";
import type { PredictorQuestion, PredictorResolved, PredictorCrowdSplit } from "../../types";

interface Props {
  predQ: PredictorQuestion;
  predResolved: PredictorResolved;
  predCrowd: PredictorCrowdSplit | null;
}

export function PredictorResultScreen({ predQ, predResolved, predCrowd }: Props) {
  const res = predResolved;
  const isMore = res.result === "more";
  const colorA = predQ.teamColorHome ?? C.brand;
  const colorB = predQ.teamColorAway ?? C.teal;
  const winColor = isMore ? C.brand : C.teal;

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

      <div style={{ display: "flex", gap: 24 }}>
        {[
          { label: "🤙 Wise Guy", pts: res.wiseGuyPoints, color: C.orange },
          { label: "🔥 Heat Check", pts: res.heatCheckPoints, color: C.red },
          { label: "🧱 Chalk", pts: res.chalkPoints, color: C.muted },
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
}
