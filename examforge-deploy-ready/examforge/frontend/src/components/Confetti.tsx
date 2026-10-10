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

const GOOD = ["POW!", "YES!", "BOOM!", "NICE!", "WOW!", "ZAP!"], BAD = ["OOPS!", "UH-OH!", "OUCH!", "NOPE!"];
/** Comic-book style starburst word ("POW!") that pops in the middle of the screen. */
export function comicBurst(kind: "good" | "bad" = "good", word?: string) {
  if (typeof document === "undefined") return; const list = kind === "good" ? GOOD : BAD;
  const el = document.createElement("div"); el.className = `comic ${kind}`; el.style.setProperty("--rot", `${Math.random() * 16 - 8}deg`);
  el.innerHTML = `<svg viewBox="0 0 200 200" width="230" height="230"><polygon points="100,4 118,52 168,28 150,76 196,90 154,116 182,162 130,150 120,196 100,160 80,196 70,150 18,162 46,116 4,90 50,76 32,28 82,52" fill="${kind === "good" ? "#ffd23d" : "#ff7a93"}" stroke="#2b1b55" stroke-width="7" stroke-linejoin="round"/></svg><b>${word ?? list[Math.floor(Math.random() * list.length)]}</b>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1100);
}
