import { LABELS, pnr } from "../components/ResultTicket"; import { getSkin } from "./skin";
// Draws the result ticket to a PNG (no external requests, no personal data beyond the student's own score) and shares or downloads it.
const css = (n: string, d: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;
export type CardInput = { attemptId: string; testName: string; attemptNo: number; score: number; total: number; pct: number; passed: boolean };

export function drawCard(i: CardInput): HTMLCanvasElement {
  const skin = getSkin(), L = LABELS[skin], W = 1080, H = 620, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
  const dark = document.documentElement.classList.contains("dark"), paper = dark ? "#1d2531" : "#fbf7ea", ink = dark ? "#e8e4d6" : "#2a2518", brand = css("--brand", "#1d4f91"), bg = css("--bg", "#f5f2e9");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = paper; g.strokeStyle = brand; g.lineWidth = 3; g.beginPath(); g.roundRect(30, 30, W - 60, H - 60, 14); g.fill(); g.stroke();
  const sx = W - 300; g.setLineDash([10, 9]); g.strokeStyle = ink + "66"; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, 30); g.lineTo(sx, H - 30); g.stroke(); g.setLineDash([]);
  g.fillStyle = bg; for (const y of [30, H - 30]) { g.beginPath(); g.arc(sx, y, 20, 0, Math.PI * 2); g.fill(); }
  const mono = '"SF Mono", Menlo, Consolas, "Courier New", monospace'; g.textBaseline = "alphabetic";
  g.fillStyle = ink; g.globalAlpha = .65; g.font = `600 22px ${mono}`; g.fillText(`EXAMFORGE · ${L.head.toUpperCase()}`, 70, 92); g.globalAlpha = 1;
  const row = (y: number, k: string, v: string) => { g.globalAlpha = .6; g.font = `22px ${mono}`; g.fillStyle = ink; g.fillText(k, 70, y); g.globalAlpha = 1; g.font = `700 26px ${mono}`; g.fillText(v.length > 30 ? v.slice(0, 29) + "…" : v, 70, y + 36); };
  row(150, L.test, i.testName); row(250, L.id, pnr(i.attemptId)); row(350, "Marks", `${Math.round(i.score * 100) / 100} / ${i.total}`); row(450, "Attempt", `#${i.attemptNo}`);
  const col = i.passed ? (dark ? "#6fd19a" : "#1f7a3e") : (dark ? "#ff9a86" : "#b3361f");
  g.save(); g.translate(sx - 190, 470); g.rotate(-0.12); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.font = `800 34px ${mono}`; const label = (i.passed ? L.pass : L.fail).toUpperCase(), w = g.measureText(label).width + 40; g.globalAlpha = .9;
  g.strokeRect(-w / 2, -34, w, 56); g.strokeRect(-w / 2 + 6, -28, w - 12, 44); g.textAlign = "center"; g.fillText(label, 0, 6); g.restore();
  g.textAlign = "center"; g.fillStyle = ink; g.font = `800 120px ${mono}`; g.fillText(`${Math.round(i.pct)}%`, sx + 150, 300); g.globalAlpha = .65; g.font = `22px ${mono}`; g.fillText(L.note, sx + 150, 350);
  g.textAlign = "left"; g.globalAlpha = .55; g.font = `20px ${mono}`; g.fillText(location.host, 70, H - 62); g.globalAlpha = 1;
  return c;
}

/** Shares the card image where the browser allows it, otherwise downloads it. */
export async function shareCard(i: CardInput): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob: Blob | null = await new Promise((r) => drawCard(i).toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not draw the card.");
  const file = new File([blob], "examforge-result.png", { type: "image/png" }), text = `I scored ${Math.round(i.pct)}% in ${i.testName} on ExamForge.`;
  const nav = navigator as Navigator & { canShare?: (d: any) => boolean };
  try { if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], text, title: "ExamForge result" }); return "shared"; } } catch (e: any) { if (e?.name === "AbortError") return "cancelled"; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "examforge-result.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return "downloaded";
}
