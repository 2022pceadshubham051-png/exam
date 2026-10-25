/** Offline lecture notes, kept in the browser (IndexedDB) so they open without internet. Videos are never stored. */
import { getMe } from "./auth";

export interface OfflineNote { id: string; atSec: number; kind: string; text: string }
export interface OfflineLesson { key: string; userId: string; lessonId: string; courseId: string; courseTitle: string; subject: string; title: string; notes: string | null; notesUrl: string | null; myNotes: OfflineNote[]; savedAt: number }
const DB = "ef-offline", STORE = "lessons";

const open = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  if (typeof indexedDB === "undefined") return rej(new Error("Offline storage is not available in this browser."));
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: "key" }); s.createIndex("userId", "userId"); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error ?? new Error("Could not open offline storage."));
});
const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
  const db = await open();
  try { return await new Promise<T | undefined>((res, rej) => { const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE)); tx.oncomplete = () => res(req ? (req.result as T) : undefined); tx.onerror = tx.onabort = () => rej(tx.error ?? new Error("Offline storage failed.")); }); }
  finally { db.close(); }
};
const uid = () => getMe()?.id ?? "";
const keyOf = (lessonId: string) => `${uid()}:${lessonId}`;

export async function saveOffline(l: Omit<OfflineLesson, "key" | "userId" | "savedAt">) { await run("readwrite", (s) => s.put({ ...l, key: keyOf(l.lessonId), userId: uid(), savedAt: Date.now() } satisfies OfflineLesson)); }
export const getOffline = async (lessonId: string) => (await run<OfflineLesson | undefined>("readonly", (s) => s.get(keyOf(lessonId)))) ?? null;
export const removeOffline = async (lessonId: string) => { await run("readwrite", (s) => s.delete(keyOf(lessonId))); };
export async function listOffline(): Promise<OfflineLesson[]> {
  const rows = (await run<OfflineLesson[]>("readonly", (s) => s.index("userId").getAll(uid()))) ?? [];
  return rows.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle) || b.savedAt - a.savedAt);
}
export async function savedIds(courseId?: string): Promise<Set<string>> { return new Set((await listOffline().catch(() => [])).filter((r) => !courseId || r.courseId === courseId).map((r) => r.lessonId)); }
/** Called on logout so the next person using this device cannot read saved notes. */
export const clearOffline = () => { try { indexedDB?.deleteDatabase(DB); } catch { /* ignore */ } };
