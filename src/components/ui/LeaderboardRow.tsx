import { C, FONT } from "../../theme";
import type { LeaderboardEntry } from "../../types";

interface Props {
  entry: LeaderboardEntry;
  index: number;
  size?: "large" | "small";
}

export function LeaderboardRow({ entry, index, size = "large" }: Props) {
  const isGold = index === 0;
  const isSilver = index === 1;
  const isBronze = index === 2;

  const rowBg = isGold
    ? "linear-gradient(90deg, rgba(255,193,7,0.18), rgba(255,193,7,0.06))"
    : isSilver ? "rgba(148,163,184,0.08)"
    : isBronze ? "rgba(205,127,50,0.08)"
    : "rgba(255,255,255,0.03)";

  const rowBorder = isGold ? "rgba(255,193,7,0.35)"
    : isSilver ? "rgba(148,163,184,0.2)"
    : isBronze ? "rgba(205,127,50,0.2)"
    : C.cardBorder;

  const rankColor = isGold ? "#fbbf24" : isBronze ? "#cd7f32" : C.faint;

  const isLarge = size === "large";
  const padding = isLarge ? "14px 20px" : "12px 16px";
  const rankFont = isLarge ? 20 : 16;
  const nameFont = isLarge ? 24 : 20;
  const ptsFont = isLarge ? 24 : 20;
  const gridCols = isLarge ? "40px 1fr auto" : "36px 1fr auto";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: gridCols,
      alignItems: "center",
      padding,
      background: rowBg,
      border: `1px solid ${rowBorder}`,
      borderRadius: 12,
      fontFamily: FONT,
      animation: isLarge ? "fadeIn 0.4s ease both" : undefined,
      animationDelay: isLarge ? `${index * 0.06}s` : undefined,
    }}>
      <span style={{ color: rankColor, fontSize: rankFont, fontWeight: 800 }}>#{entry.rank}</span>
      <span style={{
        color: isGold ? C.text : C.muted,
        fontSize: nameFont,
        fontWeight: isGold ? 800 : 500,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {entry.displayName}
      </span>
      <span style={{
        color: isGold ? "#fbbf24" : C.muted,
        fontWeight: 900, fontSize: ptsFont,
        fontVariantNumeric: "tabular-nums", textAlign: "right",
      }}>
        {entry.totalPoints.toLocaleString()}
        {isLarge && <span style={{ fontSize: 14, fontWeight: 600 }}> IQ PTS</span>}
      </span>
    </div>
  );
}
