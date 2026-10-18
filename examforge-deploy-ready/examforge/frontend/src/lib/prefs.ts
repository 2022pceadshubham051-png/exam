// Small device-level preferences. localStorage only (the API has no field for these), every access guarded.
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const ping = () => { write("ef_prefs_at", String(Date.now())); window.dispatchEvent(new Event("ef-prefs")); };
export const prefsAt = () => Number(read("ef_prefs_at") || 0);
export const exportPrefs = () => ({ lang: getLang(), lite: getLite(), examDate: getExamDate(), at: prefsAt() });
/** Apply prefs from another device if they are newer than this device's. */
export function importPrefs(p: any) {
  if (!p || typeof p.at !== "number" || p.at <= prefsAt()) return;
  write("ef_lang", p.lang === "hi" ? "hi" : null); write("ef_lite", p.lite ? "1" : null); write("ef_exam_date", typeof p.examDate === "string" ? p.examDate : null); write("ef_prefs_at", String(p.at));
  document.documentElement.lang = p.lang === "hi" ? "hi" : "en"; window.dispatchEvent(new Event("ef-prefs"));
}

/** A page the student tried to open while logged out (e.g. a room invite). Returned once, then forgotten. */
export function takeAfterLogin(): string | null { try { const p = sessionStorage.getItem("ef_after_login"); sessionStorage.removeItem("ef_after_login"); return p && p.startsWith("/") ? p : null; } catch { return null; } }

export type Lang = "en" | "hi";
export const getLang = (): Lang => (read("ef_lang") === "hi" ? "hi" : "en");
export const setLang = (l: Lang) => { write("ef_lang", l === "hi" ? "hi" : null); document.documentElement.lang = l; ping(); };

/** Low-data mode: no ads, no animation. For slow networks and cheap phones. */
export const getLite = () => read("ef_lite") === "1";
export const setLite = (on: boolean) => { write("ef_lite", on ? "1" : null); ping(); };

/** Exam date as YYYY-MM-DD, entered by the student. */
export const getExamDate = () => read("ef_exam_date");
export const setExamDate = (d: string | null) => { write("ef_exam_date", d || null); ping(); };
export function daysUntil(d: string | null): number | null {
  if (!d) return null; const t = new Date(d + "T00:00:00"); if (isNaN(+t)) return null;
  const n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((+t - +n) / 86400000);
}
