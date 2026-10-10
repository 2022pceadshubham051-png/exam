const COLORS = ["#8b7bff", "#f08bd0", "#ffd166", "#4ade80", "#38bdf8", "#fb7185"];
/** Fire a burst of confetti. Pass count / origin to make small pops. */
export function confetti(count = 90, origin: { x: number; y: number } = { x: 0.5, y: 0.35 }) {
  if (typeof document === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const host = document.createElement("div"); host.className = "confetti-host";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i"), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 380;
    p.style.cssText = `left:${origin.x * 100}%;top:${origin.y * 100}%;background:${COLORS[i % COLORS.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 160}px;--rot:${Math.random() * 900 - 450}deg;--dur:${1.4 + Math.random() * 1.4}s;border-radius:${Math.random() > 0.5 ? "50%" : "3px"};width:${6 + Math.random() * 8}px;height:${8 + Math.random() * 10}px`;
    host.appendChild(p);
  }
  document.body.appendChild(host); setTimeout(() => host.remove(), 3200);
}
/** Floating "+10 XP" style bubble near the top of the screen. */
export function floatText(text: string, kind: "good" | "bad" = "good") {
  const el = document.createElement("div"); el.className = `float-text ${kind}`; el.textContent = text; document.body.appendChild(el); setTimeout(() => el.remove(), 1400);
}
