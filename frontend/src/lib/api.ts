const tok = () => localStorage.getItem("token") ?? "";
const apiBase = () => (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function api<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(apiBase() + "/api" + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !location.pathname.startsWith("/login") && !path.startsWith("/auth")) { localStorage.removeItem("token"); location.href = "/login"; }
    if (!r.ok) throw Object.assign(new Error(j.error ?? r.statusText ?? `Request failed (${r.status})`), { status: r.status });
    return j;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("The API request timed out. Check your backend deployment and VITE_API_URL.");
    if (e instanceof TypeError) throw new Error("Unable to reach the ExamForge API. Check VITE_API_URL, CORS and the backend deployment.");
    throw e;
  } finally {
    window.clearTimeout(timeout);
  }
}
export const fmt = (s: number) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? `${String(h).padStart(2, "0")}:` : "") + `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
export interface Q { id: string; text: string; options: { key: string; text: string }[]; timeLimitSec: number | null; selectedKey: string | null; status: string; timeSpentMs: number }
export interface View { id: string; status: string; mode: "EXAM" | "PRACTICE"; adaptive: boolean; adaptiveTopics: string[]; sectionIdx: number; sectionCount: number; sectionName: string; remaining: { test: number; section: number; question?: number | null; }; questions: Q[]; rules: { negative: number; maxTabSwitches: number; fullscreen: boolean }; test: { name: string; examName: string; passingPercent: number; showResult: boolean; leaderboard: boolean; allowSectionBacktrack: boolean; allowSectionSwitch: boolean } }
