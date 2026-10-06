const tok = () => localStorage.getItem("token") ?? "";
export async function api<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch((import.meta.env.VITE_API_URL ?? "") + "/api" + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && !location.pathname.startsWith("/login") && !path.startsWith("/auth")) { localStorage.removeItem("token"); location.href = "/login"; }
  if (!r.ok) throw Object.assign(new Error(j.error ?? r.statusText), { status: r.status });
  return j;
}
export const fmt = (s: number) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? `${String(h).padStart(2, "0")}:` : "") + `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
export interface Q { id: string; text: string; options: { key: string; text: string }[]; timeLimitSec: number | null; selectedKey: string | null; status: string; timeSpentMs: number }
export interface View { id: string; status: string; mode: "EXAM" | "PRACTICE"; sectionIdx: number; sectionCount: number; sectionName: string; remaining: { test: number; section: number; question?: number | null; }; questions: Q[]; rules: { negative: number; maxTabSwitches: number; fullscreen: boolean }; test: { name: string; examName: string; passingPercent: number; showResult: boolean; allowSectionBacktrack: boolean; allowSectionSwitch: boolean } }
