/** Downloaded lecture videos (Bunny only), stored in the browser as Blobs. They expire (default 7 days) and are wiped on logout. */
import { getMe } from "./auth";

export interface SavedVideo { key: string; userId: string; lessonId: string; courseId: string; courseTitle: string; title: string; watermark: string; blob: Blob; size: number; savedAt: number; expiresAt: number }
const DB = "ef-offline-video", STORE = "videos";
const open = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  if (typeof indexedDB === "undefined") return rej(new Error("Offline storage is not available in this browser."));
  const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: "key" }).createIndex("userId", "userId"); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error ?? new Error("Could not open offline storage."));
});
const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
  const db = await open();
  try { return await new Promise<T | undefined>((res, rej) => { const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE)); tx.oncomplete = () => res(req ? (req.result as T) : undefined); tx.onerror = tx.onabort = () => rej(tx.error ?? new Error("Not enough storage space on this device.")); }); }
  finally { db.close(); }
};
const key = (lessonId: string) => `${getMe()?.id ?? ""}:${lessonId}`;

export async function getVideo(lessonId: string): Promise<SavedVideo | null> {
  const v = (await run<SavedVideo | undefined>("readonly", (s) => s.get(key(lessonId)))) ?? null;
  if (v && v.expiresAt < Date.now()) { await removeVideo(lessonId).catch(() => {}); return null; } return v;
}
export const removeVideo = async (lessonId: string) => { await run("readwrite", (s) => s.delete(key(lessonId))); };
export async function listVideos(): Promise<SavedVideo[]> {
  const all = (await run<SavedVideo[]>("readonly", (s) => s.index("userId").getAll(getMe()?.id ?? ""))) ?? [], now = Date.now();
  for (const v of all.filter((x) => x.expiresAt < now)) void removeVideo(v.lessonId).catch(() => {});
  return all.filter((x) => x.expiresAt >= now).sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
}
export const savedVideoIds = async () => new Set((await listVideos().catch(() => [])).map((v) => v.lessonId));

/** Downloads the file with progress, keeps it in IndexedDB. `signal` cancels. Throws a readable message when the device is full or the link is blocked. */
export async function downloadVideo(meta: Omit<SavedVideo, "key" | "userId" | "blob" | "size" | "savedAt" | "expiresAt"> & { url: string; days: number }, onProgress: (pct: number, mb: number) => void, signal?: AbortSignal): Promise<void> {
  try { const est = await navigator.storage?.estimate?.(); if (est?.quota && est.usage != null && est.quota - est.usage < 150 * 1024 * 1024) throw new Error("Your phone is low on storage. Free some space and try again."); } catch (e: any) { if (/storage/.test(e.message)) throw e; }
  let r: Response; try { r = await fetch(meta.url, { signal }); } catch (e: any) { if (e?.name === "AbortError") throw e; throw new Error("Download failed. Check your internet connection."); }
  if (!r.ok || !r.body) throw new Error(r.status === 403 || r.status === 401 ? "Download link expired. Reload the page and try again." : "This video is not available for download.");
  const total = +(r.headers.get("content-length") ?? 0), reader = r.body.getReader(), chunks: Uint8Array[] = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onProgress(total ? Math.min(99, Math.round((got / total) * 100)) : 0, got / 1048576); }
  const blob = new Blob(chunks as BlobPart[], { type: r.headers.get("content-type") || "video/mp4" }); void navigator.storage?.persist?.();
  const { url: _u, days, ...rest } = meta; void _u;
  await run("readwrite", (s) => s.put({ ...rest, key: key(meta.lessonId), userId: getMe()?.id ?? "", blob, size: blob.size, savedAt: Date.now(), expiresAt: Date.now() + days * 86_400_000 } satisfies SavedVideo));
  onProgress(100, got / 1048576);
}
export const clearOfflineVideos = () => { try { indexedDB?.deleteDatabase(DB); } catch { /* ignore */ } };
