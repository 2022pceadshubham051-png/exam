/** Helpers for the Courses feature (shared by the student pages and the admin editor). */
export const rupees = (n: number) => (n > 0 ? `₹${n.toLocaleString("en-IN")}` : "Free");

/** Privacy-friendly YouTube embed (no cookies until played, no related videos from other channels). */
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** Same rules as the server: bare id, watch?v=, youtu.be, embed, shorts, live. */
export function youtubeId(input: string): string | null {
  const s = input.trim(); if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL; try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, ""); let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") id = u.pathname === "/watch" ? u.searchParams.get("v") : (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null);
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Turns a picked image into a 16:9 JPEG (max 960x540) data URL, small enough to store with the course (about 60-150 KB). */
export function readPoster(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error("Please choose an image file (JPG, PNG or WebP)."));
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That image could not be read.")); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const W = 960, H = 540, c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d"); if (!g) return reject(new Error("Your browser cannot process images."));
      const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r; // "cover" crop, centred
      g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      let q = 0.85, out = c.toDataURL("image/jpeg", q); while (out.length > 450_000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.src = url;
  });
}
