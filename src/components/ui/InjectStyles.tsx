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

export function InjectStyles() {
  return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}
