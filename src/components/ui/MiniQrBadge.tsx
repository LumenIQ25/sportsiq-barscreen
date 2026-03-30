import { C, FONT } from "../../theme";

interface Props {
  qrDataUrl: string;
  roomCode: string;
}

export function MiniQrBadge({ qrDataUrl, roomCode }: Props) {
  return (
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
  );
}
