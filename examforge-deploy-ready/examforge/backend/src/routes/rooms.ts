import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";

export const rooms = Router();
rooms.use(requireAuth);
const wrap = (fn: (req: AuthedReq, res: any) => Promise<any>) => (req: AuthedReq, res: any) => fn(req, res).catch((e) => {
  if (e?.issues) return res.status(400).json({ error: e.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  console.error("Rooms API error:", e); res.status(500).json({ error: "Something went wrong with rooms. Please try again." });
});
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
const MAX_ROOMS_PER_USER = 20, MAX_MEMBERS = 50;

rooms.get("/rooms", wrap(async (req, res) => {
  const ms = await prisma.roomMember.findMany({ where: { userId: req.user!.id }, orderBy: { joinedAt: "desc" }, take: 50,
    include: { room: { include: { test: { select: { name: true, examName: true } }, _count: { select: { members: true } } } } } });
  res.json(ms.map((m) => ({ id: m.room.id, code: m.room.code, name: m.room.name, testName: m.room.test.name, examName: m.room.test.examName, members: m.room._count.members, owner: m.room.ownerId === req.user!.id })));
}));

rooms.post("/rooms", wrap(async (req, res) => {
  const { testId, name } = z.object({ testId: z.string().min(1), name: z.string().trim().min(1).max(40).optional() }).parse(req.body);
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true, name: true } });
  if (!test) return res.status(404).json({ error: "Test not found." });
  if ((await prisma.roomMember.count({ where: { userId: req.user!.id } })) >= MAX_ROOMS_PER_USER) return res.status(400).json({ error: "You are in too many rooms. Leave one first." });
  for (let i = 0; i < 6; i++) {
    try {
      const room = await prisma.room.create({ data: { code: newCode(), name: name ?? test.name, testId, ownerId: req.user!.id, members: { create: { userId: req.user!.id } } } });
      return res.json({ id: room.id, code: room.code });
    } catch (e: any) { if (e?.code !== "P2002") throw e; } // code collision: try another
  }
  res.status(500).json({ error: "Could not create a room code. Try again." });
}));

rooms.post("/rooms/join", wrap(async (req, res) => {
  const { code } = z.object({ code: z.string().trim().min(4).max(10) }).parse(req.body);
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() }, include: { _count: { select: { members: true } }, members: { where: { userId: req.user!.id }, select: { userId: true } } } });
  if (!room) return res.status(404).json({ error: "No room with that code. Check the letters and try again." });
  if (!room.members.length) {
    if (room._count.members >= MAX_MEMBERS) return res.status(400).json({ error: "This room is full." });
    if ((await prisma.roomMember.count({ where: { userId: req.user!.id } })) >= MAX_ROOMS_PER_USER) return res.status(400).json({ error: "You are in too many rooms. Leave one first." });
    await prisma.roomMember.create({ data: { roomId: room.id, userId: req.user!.id } });
  }
  res.json({ id: room.id });
}));

/** Standings: each member's best EXAM-mode result on the room's test. Members who have not attempted yet are listed last. */
rooms.get("/rooms/:id", wrap(async (req, res) => {
  const room = await prisma.room.findUnique({ where: { id: req.params.id }, include: { test: { select: { id: true, name: true, examName: true, durationSec: true } }, members: { include: { user: { select: { id: true, name: true, displayName: true } } } } } });
  if (!room || !room.members.some((m) => m.userId === req.user!.id)) return res.status(404).json({ error: "Room not found." });
  const results = await prisma.testResult.findMany({ where: { attempt: { testId: room.testId, mode: "EXAM", userId: { in: room.members.map((m) => m.userId) } } }, include: { attempt: { select: { userId: true } } } });
  const best = new Map<string, { percentage: number; accuracy: number; timeTakenSec: number; score: number; totalMarks: number; attempts: number }>();
  for (const r of results) {
    const uid = r.attempt.userId, cur = best.get(uid);
    const better = !cur || r.percentage > cur.percentage || (r.percentage === cur.percentage && (r.accuracy > cur.accuracy || (r.accuracy === cur.accuracy && r.timeTakenSec < cur.timeTakenSec)));
    best.set(uid, better ? { percentage: r.percentage, accuracy: r.accuracy, timeTakenSec: r.timeTakenSec, score: r.score, totalMarks: r.totalMarks, attempts: (cur?.attempts ?? 0) + 1 } : { ...cur!, attempts: cur!.attempts + 1 });
  }
  const rows = room.members.map((m) => ({ name: m.user.displayName ?? m.user.name, isMe: m.userId === req.user!.id, owner: m.userId === room.ownerId, ...(best.get(m.userId) ?? null) }))
    .sort((a: any, b: any) => (b.percentage ?? -1) - (a.percentage ?? -1) || (b.accuracy ?? -1) - (a.accuracy ?? -1) || (a.timeTakenSec ?? 1e9) - (b.timeTakenSec ?? 1e9))
    .map((r: any, i) => ({ ...r, rank: r.percentage === undefined ? null : i + 1 }));
  res.json({ id: room.id, code: room.code, name: room.name, test: room.test, owner: room.ownerId === req.user!.id, rows });
}));

rooms.delete("/rooms/:id/leave", wrap(async (req, res) => {
  await prisma.roomMember.deleteMany({ where: { roomId: req.params.id, userId: req.user!.id } });
  if (!(await prisma.roomMember.count({ where: { roomId: req.params.id } }))) await prisma.room.deleteMany({ where: { id: req.params.id } });
  res.json({ ok: true });
}));
