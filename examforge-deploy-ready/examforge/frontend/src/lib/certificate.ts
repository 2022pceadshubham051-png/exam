/** Course-completion certificate: drawn on a canvas (no network, no extra libraries), shared as a picture (WhatsApp) or saved as PNG / PDF.
 *  It is a share card with the student's own name, not a verified credential: the ID is made on the device from the student and course ids. */
export type CertInput = { name: string; course: string; exam?: string | null; lessons: number; subjects: number; userId: string; courseId: string; date?: Date };

const css = (n: string, d: string) => (typeof document === "undefined" ? d : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d);
const SERIF = `"Archivo Variable", "Archivo", "Hind", Georgia, serif`, SANS = `"Hind", "Archivo Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/** Short code printed on the certificate, e.g. EF-7K2M9Q. Same student + course always gives the same code. */
export function certId(userId: string, courseId: string): string {
  let h = 5381; const s = `${userId}|${courseId}`; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  let h2 = 52711; for (let i = s.length - 1; i >= 0; i--) h2 = ((h2 * 31) ^ s.charCodeAt(i)) >>> 0;
  const A = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; let out = "", a = h, b = h2;
  for (let i = 0; i < 6; i++) { if (i % 2 === 0) { out += A[a % A.length]; a = Math.floor(a / A.length); } else { out += A[b % A.length]; b = Math.floor(b / A.length); } }
  return `EF-${out}`;
}

/** Break text into at most `max` lines that fit `width`; the last line gets an ellipsis if text is left over. */
function wrap(g: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.trim().split(/\s+/), lines: string[] = []; let cur = "";
  for (let i = 0; i < words.length; i++) { const next = cur ? `${cur} ${words[i]}` : words[i];
    if (g.measureText(next).width <= width || !cur) cur = next; else { lines.push(cur); cur = words[i]; if (lines.length === max - 1) { cur = words.slice(i).join(" "); break; } } }
  if (cur) lines.push(cur);
  const last = lines.length - 1; if (last >= 0) { let l = lines[last]; if (g.measureText(l).width > width) { while (l.length > 1 && g.measureText(`${l}…`).width > width) l = l.slice(0, -1); lines[last] = `${l}…`; } }
  return lines.slice(0, max);
}
/** Largest font size (px) between `min` and `size` at which `text` fits on one line. */
function fit(g: CanvasRenderingContext2D, text: string, face: (px: number) => string, size: number, min: number, width: number) {
  let px = size; g.font = face(px); while (px > min && g.measureText(text).width > width) { px -= 2; g.font = face(px); } return px;
}

export async function drawCertificate(i: CertInput): Promise<HTMLCanvasElement> {
  try { await Promise.all([document.fonts?.load(`700 64px ${SERIF}`), document.fonts?.load(`600 30px ${SANS}`), document.fonts?.load(`400 30px ${SANS}`)]); } catch { /* fonts are optional */ }
  const W = 1600, H = 1131, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
  const brand = css("--brand", "#1d4f91"), gold = css("--gold", "#c8921a"), ink = "#262a33", soft = "#5b6270", paper = "#fffdf6";
  g.fillStyle = paper; g.fillRect(0, 0, W, H);
  // soft corner glow + faint rails along the bottom, a nod to the course route
  const glow = g.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, W * 0.7); glow.addColorStop(0, "#ffffff"); glow.addColorStop(1, "#f4ecd2"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.strokeStyle = brand; g.lineWidth = 10; g.strokeRect(46, 46, W - 92, H - 92); g.strokeStyle = gold; g.lineWidth = 3; g.strokeRect(70, 70, W - 140, H - 140);
  for (const [x, y, sx, sy] of [[70, 70, 1, 1], [W - 70, 70, -1, 1], [70, H - 70, 1, -1], [W - 70, H - 70, -1, -1]] as const) {
    g.save(); g.translate(x, y); g.scale(sx, sy); g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 70); g.quadraticCurveTo(0, 0, 70, 0); g.stroke(); g.beginPath(); g.arc(26, 26, 8, 0, Math.PI * 2); g.fillStyle = gold; g.fill(); g.restore(); }
  g.save(); g.strokeStyle = brand; g.globalAlpha = 0.14; g.lineWidth = 3; for (const y of [H - 150, H - 138]) { g.beginPath(); g.moveTo(110, y); g.lineTo(W - 110, y); g.stroke(); }
  g.lineWidth = 6; for (let x = 120; x < W - 110; x += 34) { g.beginPath(); g.moveTo(x, H - 156); g.lineTo(x, H - 132); g.stroke(); } g.restore();

  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = brand; g.font = `700 30px ${SANS}`; g.fillText("E X A M F O R G E", W / 2, 150);
  g.fillStyle = ink; g.font = `800 78px ${SERIF}`; g.fillText("CERTIFICATE OF COMPLETION", W / 2, 262);
  g.fillStyle = gold; g.fillRect(W / 2 - 90, 290, 180, 5);
  g.fillStyle = soft; g.font = `400 32px ${SANS}`; g.fillText("This is to certify that", W / 2, 372);
  const name = i.name.trim() || "Student", face = (px: number) => `800 ${px}px ${SERIF}`, px = fit(g, name, face, 108, 48, W - 360);
  g.fillStyle = brand; g.font = face(px); g.fillText(name, W / 2, 372 + 40 + px * 0.82);
  const ny = 372 + 40 + px * 0.82; g.strokeStyle = gold; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 360, ny + 26); g.lineTo(W / 2 + 360, ny + 26); g.stroke();
  g.fillStyle = soft; g.font = `400 32px ${SANS}`; g.fillText("has successfully completed every lecture of the course", W / 2, ny + 84);
  g.fillStyle = ink; g.font = `700 54px ${SERIF}`; const lines = wrap(g, i.course, W - 380, 2); lines.forEach((l, k) => g.fillText(l, W / 2, ny + 160 + k * 64));
  const y2 = ny + 160 + (lines.length - 1) * 64 + 70; g.fillStyle = soft; g.font = `500 28px ${SANS}`;
  g.fillText([i.exam, `${i.lessons} lectures`, `${i.subjects} ${i.subjects === 1 ? "subject" : "subjects"}`].filter(Boolean).join("  ·  "), W / 2, y2);

  // seal
  const sx = W / 2, sy = H - 262; g.save(); g.translate(sx, sy); g.fillStyle = gold; g.beginPath();
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, r = k % 2 ? 62 : 74; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  g.fillStyle = paper; g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fill(); g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke();
  g.fillStyle = brand; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, r = k % 2 ? 11 : 26; g.lineTo(Math.cos(a) * r, Math.sin(a) * r - 2); } g.closePath(); g.fill();
  g.fillStyle = gold; g.font = `700 11px ${SANS}`; g.fillText("COURSE COMPLETE", 0, 38); g.restore();

  const d = i.date ?? new Date(), date = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  g.textAlign = "left"; g.fillStyle = soft; g.font = `500 24px ${SANS}`; g.fillText("ISSUED ON", 150, H - 262); g.fillStyle = ink; g.font = `700 32px ${SANS}`; g.fillText(date, 150, H - 220);
  g.textAlign = "right"; g.fillStyle = soft; g.font = `500 24px ${SANS}`; g.fillText("CERTIFICATE ID", W - 150, H - 262); g.fillStyle = ink; g.font = `700 32px ${SANS}`; g.fillText(certId(i.userId, i.courseId), W - 150, H - 220);
  g.textAlign = "center"; g.fillStyle = soft; g.font = `400 22px ${SANS}`; g.fillText(`${typeof location !== "undefined" ? location.host : "examforge"}  ·  learning certificate, not an official qualification`, W / 2, H - 100);
  return c;
}

/* ------------------------------------------------------------------ PDF (one page, the picture as a JPEG) */
const enc = new TextEncoder();
/** A valid one-page PDF (A4 landscape) that shows `jpeg` full-page. Pure function: bytes in, bytes out. */
export function buildPdf(jpeg: Uint8Array, w: number, h: number): Uint8Array {
  const PW = 842, PH = Math.round((842 * h) / w), parts: Uint8Array[] = [], offsets: number[] = []; let len = 0;
  const add = (b: Uint8Array | string) => { const u = typeof b === "string" ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n: number, body: string | Uint8Array[]) => { offsets[n] = len; add(`${n} 0 obj\n`); if (typeof body === "string") add(body); else body.forEach(add); add("\nendobj\n"); };
  add("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>"); obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [enc.encode(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, enc.encode("\nendstream")]);
  const page = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`; obj(5, `<< /Length ${page.length} >>\nstream\n${page}\nendstream`);
  const xref = len; add(`xref\n0 6\n0000000000 65535 f \n`); for (let n = 1; n <= 5; n++) add(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let p = 0; for (const u of parts) { out.set(u, p); p += u.length; } return out;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not draw the certificate."))), type, q));
export const certFile = (course: string, ext: "png" | "pdf") => `certificate-${course.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "course"}.${ext}`;
const save = (blob: Blob, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

export async function downloadCertificate(i: CertInput, kind: "png" | "pdf") {
  const c = await drawCertificate(i);
  if (kind === "png") return save(await toBlob(c, "image/png"), certFile(i.course, "png"));
  const jpg = new Uint8Array(await (await toBlob(c, "image/jpeg", 0.92)).arrayBuffer());
  save(new Blob([buildPdf(jpg, c.width, c.height).buffer as ArrayBuffer], { type: "application/pdf" }), certFile(i.course, "pdf"));
}

/** Opens the phone's share sheet with the certificate picture (WhatsApp is in it). Where files cannot be shared, the picture is downloaded and a WhatsApp text link is opened. */
export async function shareCertificate(i: CertInput, link?: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await toBlob(await drawCertificate(i), "image/png"), file = new File([blob], certFile(i.course, "png"), { type: "image/png" });
  const text = `I completed “${i.course}” on ExamForge! 🎓${link ? ` ${link}` : ""}`, nav = navigator as Navigator & { canShare?: (d: any) => boolean };
  try { if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], text, title: "ExamForge certificate" }); return "shared"; } } catch (e: any) { if (e?.name === "AbortError") return "cancelled"; }
  save(blob, file.name); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); return "downloaded";
}
