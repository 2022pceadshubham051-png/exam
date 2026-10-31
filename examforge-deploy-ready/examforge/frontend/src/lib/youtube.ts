/** Extracts the 11-character id from any common YouTube link (watch, youtu.be, embed, shorts, live) or a bare id. */
export function ytId(input: string): string | null {
  const s = (input || "").trim(); if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL; try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, ""); let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") id = u.pathname === "/watch" ? u.searchParams.get("v") : (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null);
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
/** Privacy-friendly embed URL. `muted` autoplay (popup) loops and starts silent as browsers require; a viewer-clicked play starts with sound. */
export const ytEmbed = (id: string, mode: "muted" | "click" | "off" = "off") =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${mode === "muted" ? `&autoplay=1&mute=1&loop=1&playlist=${id}` : mode === "click" ? "&autoplay=1" : ""}`;
export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
