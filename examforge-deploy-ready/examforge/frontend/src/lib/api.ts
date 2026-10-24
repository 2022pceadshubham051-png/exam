const tok = () => localStorage.getItem("token") ?? "";
const apiBase = () => (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Identical GETs made within 3 s share one request (e.g. data prefetched at startup, then asked for again by the screen). Any write clears this.
const recent = new Map<string, { t: number; p: Promise<any> }>();
export function api<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  if (method !== "GET") return request<T>(path, method, body).then((r) => { recent.clear(); return r; });
  const hit = recent.get(path); if (hit && Date.now() - hit.t < 3000) return hit.p;
  const p = request<T>(path, method, body); recent.set(path, { t: Date.now(), p }); p.catch(() => recent.delete(path)); return p;
}
async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const r = await fetch(apiBase() + "/api" + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !location.pathname.startsWith("/login") && !path.startsWith("/auth")) { localStorage.removeItem("token"); location.href = "/login"; }
    if (!r.ok) {
      // /me and /shop were added in v18. A plain "Not found" on them means the deployed backend is older than this frontend.
      const stale = r.status === 404 && j.error === "Not found" && /^\/(me|shop|coins|lecture-pace)(\/|$)/.test(path);
      throw Object.assign(new Error(stale ? "Your backend is out of date (missing the Profile/Shop/Lecture Pace API). Redeploy the backend from this version, then refresh." : j.error ?? r.statusText ?? `Request failed (${r.status})`), { status: r.status, stale });
    }
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
export interface Q { id: string; text: string; section?: string; subject?: string; topic?: string; options: { key: string; text: string }[]; timeLimitSec: number | null; selectedKey: string | null; status: string; timeSpentMs: number }
export interface View { id: string; status: string; mode: "EXAM" | "PRACTICE"; adaptive: boolean; adaptiveTopics: string[]; sectionIdx: number; sectionCount: number; sectionName: string; isLastSection?: boolean; remaining: { test: number; section: number; question?: number | null; }; questions: Q[]; rules: { negative: number; positive?: number; maxTabSwitches: number; fullscreen: boolean }; test: { id?: string; name: string; examName: string; passingPercent: number; showResult: boolean; leaderboard: boolean; allowSectionBacktrack: boolean; allowSectionSwitch: boolean } }

// ---- Stale-while-revalidate for read-only screens: show the last answer instantly, then refresh it in the background. ----
const mem = new Map<string, unknown>(), SS = "ef_swr:", inflight = new Map<string, Promise<any>>();
const ck = (path: string) => `${SS}${tok().slice(-10)}:${path}`;
const readC = (path: string): unknown => { const k = ck(path); if (mem.has(k)) return mem.get(k); try { const r = sessionStorage.getItem(k); if (r) { const v = JSON.parse(r); mem.set(k, v); return v; } } catch { /* storage unavailable */ } return undefined; };
const writeC = (path: string, v: unknown) => { const k = ck(path); mem.set(k, v); try { const j = JSON.stringify(v); if (j.length < 400_000) sessionStorage.setItem(k, j); } catch { /* storage full */ } };
export const clearApiCache = () => { mem.clear(); try { Object.keys(sessionStorage).filter((k) => k.startsWith(SS)).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ } };
/** Calls `cb` with the cached copy right away (if any), then again with fresh data. Identical requests in flight are shared. */
export function swr<T = any>(path: string, cb: (v: T, fresh: boolean) => void): Promise<void> {
  const hit = readC(path) as T | undefined; if (hit !== undefined) cb(hit, false);
  const p = inflight.get(path) ?? api<T>(path).finally(() => inflight.delete(path)); inflight.set(path, p);
  return p.then((v) => { writeC(path, v); cb(v, true); }, (e) => { if (hit === undefined) throw e; });
}
