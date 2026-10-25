import { createHash } from "node:crypto";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Video id from "bunny:<guid>", a bare guid, or a Bunny embed/play/direct link. Null if it is none of these. */
export function bunnyId(input: string): string | null {
  const s = input.trim().replace(/^bunny:/i, "").trim(); if (GUID.test(s)) return s.toLowerCase();
  try { const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); if (/(mediadelivery\.net|bunnycdn\.com|b-cdn\.net)$/i.test(u.hostname)) { const g = u.pathname.split("/").find((p) => GUID.test(p)); return g ? g.toLowerCase() : null; } } catch { /* not a url */ }
  return null;
}
export const bunnyEnabled = () => !!process.env.BUNNY_LIBRARY_ID;
/** Embed URL that stops working after `ttlSec`. With BUNNY_EMBED_KEY (Bunny: Library -> Security -> Embed View Token Authentication) the link is signed, so a copied link dies in a few hours. */
export function bunnySrc(videoId: string, ttlSec = 4 * 3600, now = Date.now()): string | null {
  const lib = process.env.BUNNY_LIBRARY_ID; if (!lib) return null;
  const base = `https://iframe.mediadelivery.net/embed/${lib}/${videoId}?autoplay=false&preload=true`, key = process.env.BUNNY_EMBED_KEY; if (!key) return base;
  const expires = Math.floor(now / 1000) + ttlSec, token = createHash("sha256").update(key + videoId + expires).digest("hex");
  return `${base}&token=${token}&expires=${expires}`;
}

/** Signed MP4 link for offline download (needs "MP4 Fallback" on in the Bunny library, the library's pull-zone host and its Token Authentication key).
 *  Off unless BUNNY_ALLOW_DOWNLOAD=1 and BUNNY_CDN_HOST + BUNNY_CDN_KEY are set. Bunny token: base64url(sha256(key + path + expires)). */
export function bunnyDownload(videoId: string, ttlSec = 2 * 3600, now = Date.now()): { url: string; expiresInDays: number } | null {
  const host = process.env.BUNNY_CDN_HOST, key = process.env.BUNNY_CDN_KEY; if (process.env.BUNNY_ALLOW_DOWNLOAD !== "1" || !host || !key) return null;
  const path = `/${videoId}/play_${process.env.BUNNY_DOWNLOAD_RES ?? "720p"}.mp4`, expires = Math.floor(now / 1000) + ttlSec;
  const token = createHash("sha256").update(key + path + expires).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { url: `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}?token=${token}&expires=${expires}`, expiresInDays: Math.max(1, Math.min(30, +(process.env.BUNNY_OFFLINE_DAYS ?? 7))) };
}
