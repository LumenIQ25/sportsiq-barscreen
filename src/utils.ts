import { C } from "./theme";

export function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export function teamGradient(colorA: string = C.brand, colorB: string = C.teal): string {
  return `radial-gradient(ellipse at top left, ${colorA}55 0%, transparent 55%),
          radial-gradient(ellipse at bottom right, ${colorB}55 0%, transparent 55%),
          ${C.bgOuter}`;
}
