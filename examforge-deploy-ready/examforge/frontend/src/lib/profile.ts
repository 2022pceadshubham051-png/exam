import { api } from "./api";

export type Profile = { id: string; role: "USER" | "ADMIN"; name: string; email?: string; age: number | null; targetExam: string | null; targetScore: number | null; onboarded: boolean; needsName: boolean; welcomeCoins?: number };
let cache: Profile | null = null, pending: Promise<Profile> | null = null;
export const cachedProfile = () => cache;
export const setProfile = (p: Profile) => { cache = p; };
export function loadProfile(force = false): Promise<Profile> {
  if (cache && !force) return Promise.resolve(cache);
  pending = (pending && !force ? pending : api<Profile>("/me")).then((p) => (cache = p), (e) => { pending = null; throw e; });
  return pending;
}
export const firstName = (p?: Profile | null) => (p?.name ?? "").trim().split(/\s+/)[0] || "";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Does a test's exam name belong to the student's target exam? ("SSC CGL 2025" matches "SSC CGL") */
export function matchesExam(examName: string | null | undefined, target: string | null | undefined) {
  const a = norm(examName ?? ""), b = norm(target ?? ""); return !!a && !!b && (a.includes(b) || b.includes(a));
}

// ---- coins (the balance lives on the server; the navbar keeps a cached copy) ----
const KEY = "ef_coins";
export const cachedCoins = () => { try { return Number(localStorage.getItem(KEY) || 0); } catch { return 0; } };
export function setCoins(n: number) { try { localStorage.setItem(KEY, String(n)); } catch { /* ignore */ } window.dispatchEvent(new Event("ef-coins")); }
export const refreshCoins = () => api<{ coins: number }>("/coins").then((r) => { setCoins(r.coins); return r.coins; }).catch(() => cachedCoins());
