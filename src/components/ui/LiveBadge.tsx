import { C, FONT } from "../../theme";

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
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
