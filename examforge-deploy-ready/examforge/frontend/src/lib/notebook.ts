import { schedule, buildSession, isMastered, localDay, type Grade } from "./srs";
// Mistake notebook + saved questions, stored on this device (and synced to the account). Spacing rules live in ./srs.
export type Note = { key: string; text: string; options: { key: string; text: string }[]; correctKey: string | null; explanation?: string | null; topic?: string | null; testName: string; kind: "mistake" | "saved"; box: number; due: number; added: number; at?: number };
const K = "ef_notebook_v1", G = "ef_notebook_gone_v1", REV = "ef_revised_today_v1";
const read = (): Record<string, Note> => { try { return JSON.parse(localStorage.getItem(K) || "{}") || {}; } catch { return {}; } };
const save = (m: Record<string, Note>) => { try { localStorage.setItem(K, JSON.stringify(m)); } catch { /* storage full or blocked */ } window.dispatchEvent(new Event("ef-notebook")); };
const readGone = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(G) || "{}") || {}; } catch { return {}; } };
export const qKey = (text: string) => { let h = 5381; for (const c of text.slice(0, 160)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "q" + (h >>> 0).toString(36); };
export const allNotes = () => Object.values(read()).sort((a, b) => b.added - a.added);
export const dueNotes = () => allNotes().filter((n) => n.kind === "mistake" && n.due <= Date.now()).sort((a, b) => a.due - b.due);
export const isSaved = (text: string) => !!read()[qKey(text)];
/** Add a question once. A mistake never gets downgraded to "saved", and an existing card keeps its progress. */
export function addNote(n: Omit<Note, "key" | "box" | "due" | "added">) {
  const m = read(), key = qKey(n.text), cur = m[key];
  if (cur) {
    const fill = !cur.correctKey && !!n.correctKey; // a question bookmarked mid-exam gets its answer once Review is opened
    if (n.kind === "mistake" && cur.kind === "saved") m[key] = { ...cur, ...(fill ? { correctKey: n.correctKey, explanation: n.explanation } : {}), kind: "mistake", due: Date.now(), at: Date.now() };
    else if (fill) m[key] = { ...cur, correctKey: n.correctKey, explanation: n.explanation, options: n.options.length ? n.options : cur.options, at: Date.now() };
    else return false;
  } else m[key] = { ...n, key, box: 0, due: Date.now(), added: Date.now(), at: Date.now() };
  save(m); return true;
}
export function removeNote(key: string) { const m = read(); delete m[key]; try { localStorage.setItem(G, JSON.stringify({ ...readGone(), [key]: Date.now() })); } catch { /* ignore */ } save(m); }
/** Record one answer. `true`/`false` still work (good / again) for older callers. */
export function review(key: string, g: Grade | boolean) {
  const m = read(), n = m[key]; if (!n) return;
  const grade: Grade = typeof g === "boolean" ? (g ? "good" : "again") : g, next = schedule(n.box, grade);
  n.box = next.box; n.due = next.due; n.at = Date.now(); save(m);
}
export const mastered = (n: Note) => isMastered(n.box);
export const sessionCards = (cap?: number) => buildSession(allNotes().filter((n) => n.kind === "mistake"), Date.now(), cap);
export const countMastered = () => allNotes().filter((n) => n.kind === "mistake" && mastered(n)).length;

/** Cards revised today on this device (resets at local midnight). Used for the daily goal and the server reward claim. */
export const revisedToday = (): number => { try { const r = JSON.parse(localStorage.getItem(REV) || "{}"); return r.day === localDay() ? Number(r.n) || 0 : 0; } catch { return 0; } };
export const addRevisedToday = (by = 1) => { const n = revisedToday() + by; try { localStorage.setItem(REV, JSON.stringify({ day: localDay(), n })); } catch { /* ignore */ } return n; };

/** Adds every wrong answer of a reviewed attempt to the notebook. Safe to call repeatedly: a question is only added once. */
export function ingestReview(d: { testName: string; rows?: any[] }) {
  let added = 0;
  for (const r of d.rows ?? []) if (r.selectedKey && r.isCorrect === false && r.text && addNote({ text: r.text, options: r.options ?? [], correctKey: r.correctKey, explanation: r.explanation, topic: r.topic, testName: d.testName, kind: "mistake" })) added++;
  return added;
}

// ---- account sync helpers (see lib/sync.ts) ----
export const exportNotebook = () => ({ notes: read(), gone: readGone() });
/** Merge a copy from another device: newest change per question wins; deletions are remembered so removed cards stay removed. */
export function mergeNotebook(remote: { notes?: Record<string, Note>; gone?: Record<string, number> } | undefined) {
  if (!remote) return;
  const m = read(), gone = { ...readGone() };
  for (const [k, t] of Object.entries(remote.gone ?? {})) { gone[k] = Math.max(gone[k] ?? 0, t); const cur = m[k]; if (cur && (cur.at ?? cur.added) <= t) delete m[k]; }
  for (const [k, n] of Object.entries(remote.notes ?? {})) { if ((gone[k] ?? 0) >= (n.at ?? n.added)) continue; const cur = m[k]; if (!cur || (n.at ?? n.added) > (cur.at ?? cur.added)) m[k] = n; }
  try { localStorage.setItem(G, JSON.stringify(gone)); } catch { /* ignore */ }
  save(m);
}
