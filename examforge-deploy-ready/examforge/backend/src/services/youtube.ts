/** Extracts the 11-character video id from any common YouTube link (watch, youtu.be, embed, shorts, live) or a bare id. Returns null if it isn't one. */
export function youtubeId(input: string): string | null {
  const s = input.trim(); if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL; try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") id = u.pathname === "/watch" ? u.searchParams.get("v") : (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null);
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
