import { api } from "./api";
// Shared types and small helpers for the engagement features (daily challenge, duels, revision, sharing).
export type StreakInfo = { current: number; best: number; doneToday: boolean; atRisk: boolean; freezes: number; coveredByFreeze: boolean; nextMilestone: number | null };
export type PlayQ = { id: string; text: string; options: { key: string; text: string }[]; subject?: string; topic?: string };
export type ReviewRow = { questionId: string; text: string; options: { key: string; text: string }[]; topic?: string | null; correctKey: string; explanation?: string | null; selectedKey: string | null; isCorrect: boolean | null };
export type Answer = { questionId: string; selectedKey: string | null; timeMs: number };

export const getStreak = () => api<StreakInfo>("/streak");

// ---- WhatsApp / sharing ----
export const waLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
/** Opens WhatsApp with the text. On phones with the native share sheet that is used first; otherwise wa.me opens in a new tab. */
export async function shareText(text: string, title = "ExamForge"): Promise<"shared" | "whatsapp" | "cancelled"> {
  const nav = navigator as Navigator & { share?: (d: any) => Promise<void> };
  if (nav.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) { try { await nav.share({ title, text }); return "shared"; } catch (e: any) { if (e?.name === "AbortError") return "cancelled"; } }
  window.open(waLink(text), "_blank", "noopener"); return "whatsapp";
}

// ---- invite / referral ----
const REF = "ef_ref";
/** Remember an invite code from ?ref= so it can be sent when the visitor registers. */
export function captureRef() { try { const r = new URLSearchParams(location.search).get("ref"); if (r && /^[A-Za-z0-9]{4,12}$/.test(r)) localStorage.setItem(REF, r.toUpperCase()); } catch { /* ignore */ } }
export const savedRef = () => { try { return localStorage.getItem(REF) || undefined; } catch { return undefined; } };
export const clearRef = () => { try { localStorage.removeItem(REF); } catch { /* ignore */ } };
let inviteCache: { code: string } | null = null;
export async function myInviteCode(): Promise<string | null> { try { inviteCache ??= await api<{ code: string }>("/invite"); return inviteCache.code; } catch { return null; } }
/** A link that signs a friend up with your invite code, optionally straight into a test. */
export const inviteLink = (code: string | null, testId?: string) => `${location.origin}/login?${[code ? `ref=${code}` : "", testId ? `test=${testId}` : ""].filter(Boolean).join("&")}`;
