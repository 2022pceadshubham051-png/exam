import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";

export const study = Router();
study.use(requireAuth);
const wrap = (fn: (req: AuthedReq, res: any) => Promise<any>) => (req: AuthedReq, res: any) => fn(req, res).catch((e) => {
  if (e?.issues) return res.status(400).json({ error: e.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  if (e?.status) return res.status(e.status).json({ error: e.message });
  console.error("Study API error:", e);
  res.status(500).json({ error: "Unable to save study data right now." });
});

const profileShape = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  age: z.number().int().min(13).max(100).optional(),
  targetExam: z.string().trim().min(1).max(120).optional(),
  targetScore: z.number().int().min(30).max(100).optional(),
});

study.get("/profile", wrap(async (req, res) => {
  let u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, name: true, displayName: true, age: true, targetExam: true, coachExam: true, targetScore: true, role: true, coins: true, inventory: true } });
  if (!u) return res.status(404).json({ error: "Account not found" });
  // Earlier builds used targetExam to store the Smart Coach blueprint ID. Move it
  // to coachExam once and expose a human-readable target exam to the new profile flow.
  const legacy: Record<string, string> = { "ssc-cgl-t1": "SSC CGL", "ssc-chsl-t1": "SSC CHSL", "ssc-mts": "SSC MTS", "ssc-gd": "SSC GD", "ssc-cpo": "SSC CPO", "rrb-ntpc-cbt1": "RRB NTPC", "rrb-ntpc-cbt2": "RRB NTPC", "rrb-group-d": "RRB Group D", "imd-sa-cs": "SSC IMD Scientific Assistant (CS & IT)", "imd-sa-ece": "Other / explore all exams", "imd-sa-physics": "Other / explore all exams" };
  if (u.targetExam && (legacy[u.targetExam] || u.targetExam.startsWith("custom"))) {
    const old = u.targetExam;
    u = await prisma.user.update({ where: { id: u.id }, data: { targetExam: legacy[old] || "Other / explore all exams", coachExam: u.coachExam || old }, select: { id: true, email: true, name: true, displayName: true, age: true, targetExam: true, coachExam: true, targetScore: true, role: true, coins: true, inventory: true } });
  }
  const { coachExam: _coachExam, ...profile } = u;
  res.json({ ...profile, profileComplete: Boolean((u.displayName || u.name)?.trim() && u.age && u.targetExam) });
}));

study.put("/profile", wrap(async (req, res) => {
  const b = profileShape.parse(req.body);
  const data: any = {};
  if (b.email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email: b.email }, select: { id: true } });
    if (existing && existing.id !== req.user!.id) return res.status(409).json({ error: "That email address is already in use." });
    data.email = b.email;
  }
  if (b.name !== undefined) { data.name = b.name; data.displayName = b.name; }
  if (b.age !== undefined) data.age = b.age;
  if (b.targetExam !== undefined) data.targetExam = b.targetExam;
  if (b.targetScore !== undefined) data.targetScore = b.targetScore;
  const u = await prisma.user.update({ where: { id: req.user!.id }, data, select: { id: true, email: true, name: true, displayName: true, age: true, targetExam: true, targetScore: true, role: true, coins: true, inventory: true } });
  res.json({ ...u, profileComplete: Boolean((u.displayName || u.name)?.trim() && u.age && u.targetExam) });
}));

study.get("/lecturepace", wrap(async (req, res) => {
  const [saved, user] = await Promise.all([
    prisma.lecturePaceState.findUnique({ where: { userId: req.user!.id } }),
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true, inventory: true, targetExam: true, name: true, displayName: true } }),
  ]);
  res.json({ state: saved?.state ?? null, updatedAt: saved?.updatedAt ?? null, coins: user?.coins ?? 0, inventory: user?.inventory ?? {}, targetExam: user?.targetExam ?? null, name: user?.displayName ?? user?.name ?? "Student" });
}));

function doneLectures(state: any) {
  if (!state || !Array.isArray(state.courses)) return new Map<string, Set<string>>();
  const out = new Map<string, Set<string>>();
  for (const c of state.courses.slice(0, 100)) {
    if (!c || typeof c.id !== "string" || !c.done || typeof c.done !== "object" || Array.isArray(c.done)) continue;
    const nums = new Set<string>();
    for (const n of Object.keys(c.done)) if (/^\d{1,4}$/.test(n) && c.done[n] && Number(n) > 0 && Number(n) <= 1000) nums.add(n);
    out.set(c.id, nums);
  }
  return out;
}

study.put("/lecturepace", wrap(async (req, res) => {
  const parsed = z.object({ state: z.record(z.any()) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Lecture Pace data." });
  const state = parsed.data.state;
  const json = JSON.stringify(state);
  if (json.length > 240_000 || !Array.isArray(state.courses) || state.courses.length > 100) return res.status(413).json({ error: "Your planner data is too large to sync. Export a backup or remove unused courses." });

  const result = await prisma.$transaction(async (tx) => {
    const [old, user] = await Promise.all([
      tx.lecturePaceState.findUnique({ where: { userId: req.user!.id } }),
      tx.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } }),
    ]);
    const oldState = old?.state as any;
    const previous = doneLectures(oldState);
    const incoming = doneLectures(state);
    const refIds: string[] = [];
    // Only award for a newly completed lecture in a course already persisted by the server.
    // Reward keys are unique, so unchecking/rechecking a lecture cannot farm coins.
    for (const [courseId, nums] of incoming) {
      const priorNums = previous.get(courseId);
      if (!priorNums) continue;
      for (const n of nums) if (!priorNums.has(n)) refIds.push(`lecture:${courseId}:${n}`);
    }
    const cappedRefs = refIds.slice(0, 20);
    const existing = cappedRefs.length ? await tx.coinTransaction.findMany({ where: { userId: req.user!.id, referenceId: { in: cappedRefs } }, select: { referenceId: true } }) : [];
    const known = new Set(existing.map((x) => x.referenceId));
    const toReward = cappedRefs.filter((id) => !known.has(id));
    let coins = user?.coins ?? 0;
    for (const ref of toReward) {
      coins += 5;
      await tx.coinTransaction.create({ data: { userId: req.user!.id, amount: 5, type: "EARN", reason: "Lecture completed", referenceId: ref, balance: coins } });
    }
    if (toReward.length) await tx.user.update({ where: { id: req.user!.id }, data: { coins } });
    const saved = await tx.lecturePaceState.upsert({ where: { userId: req.user!.id }, create: { userId: req.user!.id, state }, update: { state } });
    return { updatedAt: saved.updatedAt, coins, rewarded: toReward.length * 5 };
  });
  res.json({ ok: true, ...result });
}));

const SHOP: Record<string, { name: string; price: number; inventoryKey: string; description: string }> = {
  streak_freeze: { name: "Streak Freeze", price: 50, inventoryKey: "streakFreeze", description: "Protect one missed study day in Lecture Pace." },
  focus_extension: { name: "Focus Extension", price: 40, inventoryKey: "focusExtension", description: "Adds 15 minutes to a focus session." },
};

study.get("/coins", wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true, inventory: true } });
  const transactions = await prisma.coinTransaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, amount: true, type: true, reason: true, balance: true, createdAt: true } });
  res.json({ coins: u?.coins ?? 0, inventory: u?.inventory ?? {}, shop: Object.entries(SHOP).map(([id, p]) => ({ id, ...p })), transactions });
}));

study.post("/coins/spend", wrap(async (req, res) => {
  const b = z.object({ itemId: z.string().min(1).max(60) }).parse(req.body);
  const item = SHOP[b.itemId];
  if (!item) return res.status(400).json({ error: "That shop item is unavailable." });
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: req.user!.id }, select: { coins: true, inventory: true } });
    if (!user) throw new Error("Account not found");
    if (user.coins < item.price) throw Object.assign(new Error(`You need ${item.price} coins for ${item.name}.`), { status: 402 });
    const inventory = (user.inventory && typeof user.inventory === "object" && !Array.isArray(user.inventory) ? user.inventory : {}) as Record<string, any>;
    const nextInventory = { ...inventory, [item.inventoryKey]: Math.max(0, Number(inventory[item.inventoryKey]) || 0) + 1 };
    const coins = user.coins - item.price;
    await tx.user.update({ where: { id: req.user!.id }, data: { coins, inventory: nextInventory } });
    await tx.coinTransaction.create({ data: { userId: req.user!.id, amount: -item.price, type: "SPEND", reason: `Purchased ${item.name}`, balance: coins } });
    return { coins, inventory: nextInventory };
  }).catch((e: any) => { if (e.status === 402) throw e; throw e; });
  res.json({ ok: true, ...result, item });
}));

study.post("/coins/use", wrap(async (req, res) => {
  const b = z.object({ itemId: z.enum(["streak_freeze", "focus_extension"]) }).parse(req.body);
  const item = SHOP[b.itemId];
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: req.user!.id }, select: { coins: true, inventory: true } });
    if (!user) throw new Error("Account not found");
    const inventory = (user.inventory && typeof user.inventory === "object" && !Array.isArray(user.inventory) ? user.inventory : {}) as Record<string, any>;
    const key = item.inventoryKey;
    const quantity = Math.max(0, Number(inventory[key]) || 0);
    if (quantity < 1) throw Object.assign(new Error(`You do not have a ${item.name}.`), { status: 409 });
    const nextInventory = { ...inventory, [key]: quantity - 1 };
    await tx.user.update({ where: { id: req.user!.id }, data: { inventory: nextInventory } });
    return { coins: user.coins, inventory: nextInventory };
  });
  res.json({ ok: true, ...result, item });
}));

study.get("/study/leaderboard", wrap(async (req, res) => {
  const limit = Math.min(50, Math.max(5, Number(req.query.limit ?? 25) || 25));
  const users = await prisma.user.findMany({ where: { lecturePaceState: { isNot: null } }, select: { id: true, name: true, displayName: true, lecturePaceState: { select: { state: true } } }, take: 1000 });
  const rows = users.map((u) => {
    const s = u.lecturePaceState?.state as any;
    let lectures = 0, focusMinutes = 0, courses = 0, studyDays = new Set<string>();
    for (const c of Array.isArray(s?.courses) ? s.courses : []) {
      if (!c || typeof c !== "object") continue;
      courses++;
      const done = c.done && typeof c.done === "object" ? c.done : {};
      lectures += Object.keys(done).filter((k) => /^\d{1,4}$/.test(k) && Number(k) > 0 && Number(k) <= 1000 && done[k]).length;
      for (const completedOn of Object.values(done)) {
        if (typeof completedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(completedOn)) studyDays.add(completedOn);
      }
      for (const sess of Array.isArray(c.sessions) ? c.sessions.slice(0, 5000) : []) {
        focusMinutes += Math.max(0, Math.min(1440, Number(sess?.m) || 0));
        if (typeof sess?.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sess.d)) studyDays.add(sess.d);
      }
    }
    const points = lectures * 10 + Math.floor(focusMinutes / 25) * 5 + studyDays.size * 2;
    return { id: u.id, name: u.displayName || u.name, lectures, focusMinutes, studyDays: studyDays.size, courses, points };
  }).filter((r) => r.lectures || r.focusMinutes).sort((a, b) => b.points - a.points || b.lectures - a.lectures || b.focusMinutes - a.focusMinutes).slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
  res.json(rows);
}));
