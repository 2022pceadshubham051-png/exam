/** Reads a YouTube playlist through the YouTube Data API v3 (free key: YOUTUBE_API_KEY, 10,000 units/day; a 200-video playlist costs about 10). */
export interface PlaylistVideo { videoId: string; title: string; durationMin: number | null }
export interface Playlist { title: string; videos: PlaylistVideo[] }

/** Playlist id from a playlist/watch link (…?list=PL…) or a bare id. Null if there is none. */
export function playlistId(input: string): string | null {
  const s = input.trim(); if (/^(PL|UU|OL|FL|RD)[\w-]{10,}$/.test(s)) return s;
  try { const id = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).searchParams.get("list"); return id && /^[\w-]{10,}$/.test(id) ? id : null; } catch { return null; }
}
/** "PT1H2M30S" -> 63 minutes (rounded up). */
export function isoToMinutes(iso: string): number | null {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/); if (!m) return null;
  const sec = (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + +(m[4] ?? 0); return sec ? Math.max(1, Math.ceil(sec / 60)) : null;
}
type Get = (url: string) => Promise<any>;
const defaultGet: Get = async (url) => { const r = await fetch(url); const j: any = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j?.error?.message ?? `YouTube error ${r.status}`), { status: r.status, reason: j?.error?.errors?.[0]?.reason }); return j; };

export async function fetchPlaylist(id: string, key: string, max = 500, get: Get = defaultGet): Promise<Playlist> {
  const q = (path: string, p: Record<string, string>) => `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...p, key })}`;
  const meta = await get(q("playlists", { part: "snippet", id })); if (!meta.items?.length) throw Object.assign(new Error("Playlist not found. It must be Public or Unlisted."), { status: 404 });
  const items: { videoId: string; title: string }[] = []; let page = "";
  do {
    const d = await get(q("playlistItems", { part: "snippet,status", playlistId: id, maxResults: "50", ...(page ? { pageToken: page } : {}) }));
    for (const it of d.items ?? []) { const v = it.snippet?.resourceId?.videoId, t = String(it.snippet?.title ?? ""); if (v && !/^(Private|Deleted) video$/i.test(t) && it.status?.privacyStatus !== "private") items.push({ videoId: v, title: t }); }
    page = d.nextPageToken ?? "";
  } while (page && items.length < max);
  const dur = new Map<string, number | null>();
  for (let i = 0; i < items.length; i += 50) { const d = await get(q("videos", { part: "contentDetails", id: items.slice(i, i + 50).map((x) => x.videoId).join(",") })); for (const v of d.items ?? []) dur.set(v.id, isoToMinutes(v.contentDetails?.duration ?? "")); }
  const seen = new Set<string>();
  return { title: String(meta.items[0].snippet?.title ?? "Playlist"), videos: items.slice(0, max).filter((x) => !seen.has(x.videoId) && !!seen.add(x.videoId)).map((x) => ({ ...x, durationMin: dur.get(x.videoId) ?? null })) };
}
