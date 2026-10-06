import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import * as svc from "../services/exam/attemptService";
export const attempts = Router(); attempts.use(requireAuth);
const own = async (req: AuthedReq, id: string) => !!(await prisma.testAttempt.findFirst({ where: { id, userId: req.user!.id }, select: { id: true } }));
const wrap = (fn: (req: AuthedReq, res: any) => Promise<any>) => (req: AuthedReq, res: any) => fn(req, res).catch((e) => res.status(400).json({ error: e.message }));

attempts.post("/tests/:id/start", wrap(async (req, res) => { const mode = req.body?.mode === "PRACTICE" ? "PRACTICE" : "EXAM"; const a = await svc.start(req.user!.id, req.params.id, mode); res.json(await svc.view(a.id)); }));
attempts.get("/attempts/:id", wrap(async (req, res) => (await own(req, req.params.id)) ? res.json(await svc.view(req.params.id)) : res.sendStatus(404)));
const ans = z.object({ questionId: z.string(), selectedKey: z.enum(["A", "B", "C", "D"]).nullable(),
  status: z.enum(["VISITED", "ANSWERED", "NOT_ANSWERED", "REVIEW", "ANSWERED_REVIEW"]), timeSpentMs: z.number().int().min(0) });
attempts.post("/attempts/:id/answer", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  await svc.saveAnswer(req.params.id, ans.parse(req.body)); res.json({ saved: true, serverNow: Date.now() });
}));
attempts.post("/attempts/:id/tab-switch", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  const a = await prisma.testAttempt.update({ where: { id: req.params.id }, data: { tabSwitches: { increment: 1 } }, include: { test: true } });
  if (a.tabSwitches > a.test.maxTabSwitches) await svc.submit(a.id, true);
  res.json({ tabSwitches: a.tabSwitches, max: a.test.maxTabSwitches });
}));
attempts.post("/attempts/:id/submit", wrap(async (req, res) => { if (!(await own(req, req.params.id))) return res.sendStatus(404); await svc.submit(req.params.id); res.json({ ok: true }); }));
attempts.get("/results/:id", wrap(async (req, res) => { const r = await svc.resultWithComparison(req.params.id, req.user!.id); r ? res.json(r) : res.sendStatus(404); }));
attempts.get("/history", wrap(async (req, res) => res.json(await prisma.testAttempt.findMany({ where: { userId: req.user!.id, status: { not: "IN_PROGRESS" } }, orderBy: { startedAt: "desc" }, take: 100, include: { result: true, test: { select: { name: true } } } }))));

// Question-wise review: only after submission; explanations obey the test setting.
attempts.get("/attempts/:id/review", wrap(async (req, res) => {
  const a = await prisma.testAttempt.findFirst({ where: { id: req.params.id, userId: req.user!.id }, include: { test: { include: { sections: { orderBy: { order: "asc" }, select: { id: true, name: true } } } }, responses: { orderBy: { updatedAt: "asc" } } } });
  if (!a) return res.sendStatus(404); if (a.status === "IN_PROGRESS") return res.status(403).json({ error: "Review is available after submission" });
  const secName = new Map<string, { name: string; i: number }>(a.test.sections.map((s: any, i: number) => [s.id, { name: s.name, i }] as [string, { name: string; i: number }]));
  const rows = a.responses.map((r: any) => ({ section: secName.get(r.sectionId)?.name, _i: secName.get(r.sectionId)?.i ?? 0, topic: r.topic, difficulty: r.difficulty, text: r.snapshot?.text, options: r.snapshot?.options,
    explanation: a.test.showExplanations ? r.snapshot?.explanation : null, selectedKey: r.selectedKey, correctKey: r.correctKeySnapshot, isCorrect: r.isCorrect, timeSpentSec: Math.round(r.timeSpentMs / 1000) }));
  rows.sort((x: any, y: any) => x._i - y._i); res.json({ attemptNo: a.attemptNo, testName: a.test.name, rows });
}));
