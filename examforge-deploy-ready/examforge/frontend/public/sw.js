/* ExamForge service worker: instant repeat visits and an offline app shell.
 * - Never touches /api (answers, results and tokens always go to the network).
 * - Hashed build files (/assets/*) are cached forever; the cache is wiped when a new build ships.
 * - Pages: network first (3 s), falling back to the last good copy of the app shell when offline. */
const ASSETS = "ef-assets-v1", SHELL = "ef-shell-v1", META = "/__build";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (![ASSETS, SHELL].includes(k)) await caches.delete(k);
  await self.clients.claim();
})()));

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

async function rememberBuild(html) {
  // The main script name changes with every deploy: when it does, old hashed files are dead weight.
  const main = (html.match(/\/assets\/index-[\w-]+\.js/) || [""])[0], shell = await caches.open(SHELL), prev = await shell.match(META);
  if (main && prev && (await prev.text()) !== main) await caches.delete(ASSETS);
  if (main) await shell.put(META, new Response(main));
}

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(req), timeout(3000)]);
        if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) { const copy = res.clone(); e.waitUntil((async () => { await rememberBuild(await copy.clone().text()); await (await caches.open(SHELL)).put("/index.html", copy); })()); }
        return res;
      } catch {
        return (await caches.match("/index.html")) || new Response("<h1>You are offline</h1><p>Open ExamForge once with internet, then it works offline.</p>", { status: 503, headers: { "content-type": "text/html" } });
      }
    })());
    return;
  }
  if (url.pathname.startsWith("/assets/")) { // immutable, content-hashed
    e.respondWith((async () => { const c = await caches.open(ASSETS), hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; })());
  } else if (/^\/(brand|branding)\//.test(url.pathname) || /\.(woff2?|png|svg|webp|ico)$/.test(url.pathname)) { // stale-while-revalidate
    e.respondWith((async () => { const c = await caches.open(ASSETS), hit = await c.match(req), net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })());
  }
});

// ---- Web push: notifications from the teacher (new course approved, announcements). Payload is JSON: { title, body, url, tag }.
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "ExamForge", { body: d.body || "", icon: "/brand/logo-mark-192.png", badge: "/brand/logo-mark-64.png", tag: d.tag || "examforge", data: { url: d.url || "/home" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close(); const url = new URL((e.notification.data && e.notification.data.url) || "/home", self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(self.location.origin) && "focus" in c) { await c.focus(); if ("navigate" in c) { try { await c.navigate(url); } catch (_) {} } return; }
    await self.clients.openWindow(url);
  })());
});
