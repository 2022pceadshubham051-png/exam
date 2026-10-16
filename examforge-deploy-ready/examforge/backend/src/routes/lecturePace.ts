import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";
import { awardLecturePace } from "../services/coins"; import { cosmetics } from "../services/shopCatalog";

export const lecturePace = Router();
lecturePace.use(requireAuth);

const MAX_JSON = 400_000;
const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const validDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

// Leaderboard numbers are derived on the server from the saved planner data (never taken from the client as-is).
// Sample/demo courses are ignored, and dates more than one day ahead of the server clock are ignored.
export function computeStats(state: any) {
  const limit = isoDay(Date.now() + DAY);
  const counts: Record<string, number> = {};
  let lectures = 0, focusMin = 0, reviews = 0;
  for (const c of Array.isArray(state?.courses) ? state.courses : []) {
    if (!c || c.sample) continue;
    for (const k of Object.keys(c.done ?? {})) {
      const d = c.done[k];
      if (!validDate(d) || d > limit) continue;
      lectures++; counts[d] = (counts[d] ?? 0) + 1;
    }
    for (const s of Array.isArray(c.sessions) ? c.sessions : []) {
      const m = Number(s?.m);
      if (validDate(s?.d) && s.d <= limit && m > 0 && m <= 600) focusMin += Math.round(m);
    }
    for (const k of Object.keys(c.rev ?? {})) {
      const n = Number(c.rev[k]?.s);
      if (n > 0 && n <= 10) reviews += n;
    }
  }
  const xp = lectures * 10 + focusMin + reviews * 5;
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const frozen: Record<string, boolean> = state?.frozen && typeof state.frozen === "object" ? state.frozen : {};
  const days = Object.keys(counts).sort();
  const at = (d: string, delta: number) => isoDay(Date.parse(d + "T00:00:00Z") + delta * DAY);
  let best = 0, run = 0, prev: string | null = null;
  for (const d of days) {
    let bridged = false;
    if (prev) { bridged = true; for (let x = at(prev, 1); x < d; x = at(x, 1)) if (!frozen[x]) { bridged = false; break; } }
    run = bridged ? run + 1 : 1; if (run > best) best = run; prev = d;
  }
  // Current streak: run ending on the latest active day, only if that day is today/yesterday (+1 day slack for time zones).
  let streak = 0;
  if (days.length) {
    const last = days[days.length - 1], oldest = isoDay(Date.now() - 2 * DAY);
    if (last >= oldest) { for (let x = last; ; x = at(x, -1)) { if (counts[x]) streak++; else if (!frozen[x]) break; } }
  }
  return { xp, level, lectures, focusMin, reviews, activeDays: days.length, streak, bestStreak: best };
}

lecturePace.get("/", async (req: AuthedReq, res) => {
  const row = await prisma.lecturePaceData.findUnique({ where: { userId: req.user!.id } });
  res.json(row ? { exists: true, updatedAt: row.clientUpdatedAt, json: row.json } : { exists: false });
});

lecturePace.put("/", rateLimit({ windowMs: 60_000, max: 90, keyGenerator: (r: any) => r.user?.id ?? r.ip, validate: false }), async (req: AuthedReq, res) => {
  const { json, updatedAt } = req.body ?? {};
  if (typeof json !== "string" || json.length > MAX_JSON) return res.status(400).json({ error: "Planner data is missing or too large." });
  let state: any; try { state = JSON.parse(json); } catch { return res.status(400).json({ error: "Invalid planner data." }); }
  if (!state || !Array.isArray(state.courses) || state.courses.length > 60) return res.status(400).json({ error: "Invalid planner data." });
  const stats = computeStats(state);
  const clientUpdatedAt = Number(updatedAt) || Date.now();
  await prisma.lecturePaceData.upsert({
    where: { userId: req.user!.id },
    update: { json, clientUpdatedAt, ...stats },
    create: { userId: req.user!.id, json, clientUpdatedAt, ...stats },
  });
  await awardLecturePace(req.user!.id, stats.xp);
  res.json({ ok: true, ...stats });
});

lecturePace.get("/leaderboard", async (req: AuthedReq, res) => {
  const limit = Math.min(50, Math.max(5, Number(req.query.limit ?? 25) || 25));
  const order = [{ xp: "desc" as const }, { streak: "desc" as const }, { lectures: "desc" as const }, { updatedAt: "asc" as const }];
  const rows = await prisma.lecturePaceData.findMany({
    where: { xp: { gt: 0 } }, orderBy: order, take: limit,
    select: { userId: true, xp: true, level: true, lectures: true, focusMin: true, reviews: true, activeDays: true, streak: true, bestStreak: true, user: { select: { name: true, displayName: true, inventory: true } } },
  });
  const board = rows.map((r, i) => ({ rank: i + 1, name: r.user.displayName ?? r.user.name, xp: r.xp, level: r.level, lectures: r.lectures, focusMin: r.focusMin, reviews: r.reviews, activeDays: r.activeDays, streak: r.streak, bestStreak: r.bestStreak, you: r.userId === req.user!.id, ...cosmetics(r.user.inventory) }));
  // The caller's own standing, even when outside the top list.
  let me: any = null;
  const mine = await prisma.lecturePaceData.findUnique({ where: { userId: req.user!.id } });
  if (mine && mine.xp > 0) {
    const ahead = await prisma.lecturePaceData.count({ where: { OR: [{ xp: { gt: mine.xp } }, { xp: mine.xp, streak: { gt: mine.streak } }, { xp: mine.xp, streak: mine.streak, lectures: { gt: mine.lectures } }] } });
    me = { rank: ahead + 1, xp: mine.xp, level: mine.level, lectures: mine.lectures, focusMin: mine.focusMin, streak: mine.streak };
  }
  res.json({ rows: board, me });
});
