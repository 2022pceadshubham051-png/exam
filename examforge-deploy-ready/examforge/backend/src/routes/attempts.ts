import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";
import * as svc from "../services/exam/attemptService";

export const attempts = Router();
attempts.use(requireAuth);
const own = async (req: AuthedReq, id: string) => !!(await prisma.testAttempt.findFirst({ where: { id, userId: req.user!.id }, select: { id: true } }));
const wrap = (fn: (req: AuthedReq, res: any) => Promise<any>) => (req: AuthedReq, res: any) => fn(req, res).catch((e) => res.status(400).json({ error: e?.issues ? e.issues.map((i: any) => i.message).join("; ") : e.message }));

attempts.post("/tests/:id/start", wrap(async (req, res) => {
  const mode = req.body?.mode === "PRACTICE" ? "PRACTICE" : "EXAM";
  const topics = Array.isArray(req.body?.topics) ? (req.body.topics as unknown[]).map(String).slice(0, 8) : [];
  const adaptive = (!!req.body?.adaptive || topics.length > 0) && mode === "PRACTICE";
  const questionCount = Number(req.body?.questionCount ?? 20);
  const a = await svc.start(req.user!.id, req.params.id, mode, { adaptive, questionCount, topics });
  res.json(await svc.view(a.id));
}));

attempts.get("/attempts/:id", wrap(async (req, res) => (await own(req, req.params.id)) ? res.json(await svc.view(req.params.id)) : res.sendStatus(404)));

const ans = z.object({
  questionId: z.string(),
  selectedKey: z.enum(["A", "B", "C", "D"]).nullable(),
  status: z.enum(["VISITED", "ANSWERED", "NOT_ANSWERED", "REVIEW", "ANSWERED_REVIEW"]),
  timeSpentMs: z.number().int().min(0),
});
attempts.post("/attempts/:id/answer", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  await svc.saveAnswer(req.params.id, ans.parse(req.body));
  res.json({ saved: true, serverNow: Date.now() });
}));
// Practice: instant feedback (correct option + explanation)
attempts.post("/attempts/:id/check", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  res.json(await svc.checkAnswer(req.params.id, String(req.body?.questionId ?? "")));
}));
// Exam: finish the current section early and move to the next one
attempts.post("/attempts/:id/next-section", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  res.json(await svc.nextSection(req.params.id));
}));
attempts.post("/attempts/:id/tab-switch", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  const cur = await prisma.testAttempt.findUnique({ where: { id: req.params.id }, select: { mode: true, status: true } });
  if (!cur || cur.mode !== "EXAM" || cur.status !== "IN_PROGRESS") return res.json({ tabSwitches: 0, max: 0 });
  const a = await prisma.testAttempt.update({ where: { id: req.params.id }, data: { tabSwitches: { increment: 1 } }, include: { test: true } });
  if (a.tabSwitches > a.test.maxTabSwitches) await svc.submit(a.id, true);
  res.json({ tabSwitches: a.tabSwitches, max: a.test.maxTabSwitches });
}));
attempts.post("/attempts/:id/submit", wrap(async (req, res) => { if (!(await own(req, req.params.id))) return res.sendStatus(404); await svc.submit(req.params.id); res.json({ ok: true }); }));
attempts.get("/results/:id", wrap(async (req, res) => { const r = await svc.resultWithComparison(req.params.id, req.user!.id); r ? res.json(r) : res.sendStatus(404); }));

attempts.get("/history", wrap(async (req, res) => res.json(await prisma.testAttempt.findMany({
  where: { userId: req.user!.id }, orderBy: { startedAt: "desc" }, take: 300,
  include: { result: true, test: { select: { id: true, name: true, examName: true, maxAttempts: true } } },
}))));

// ---- delete attempted exams / practice sessions ----
attempts.delete("/attempts/:id", wrap(async (req, res) => {
  if (!(await own(req, req.params.id))) return res.sendStatus(404);
  res.json(await svc.deleteAttempts(req.user!.id, { ids: [req.params.id] }));
}));
const delBody = z.object({ ids: z.array(z.string()).max(500).optional(), testId: z.string().optional(), mode: z.enum(["EXAM", "PRACTICE"]).optional(), all: z.boolean().optional() });
attempts.post("/history/delete", wrap(async (req, res) => res.json(await svc.deleteAttempts(req.user!.id, delBody.parse(req.body ?? {})))));

attempts.get("/attempts/:id/review", wrap(async (req, res) => {
  const a = await prisma.testAttempt.findFirst({ where: { id: req.params.id, userId: req.user!.id }, include: { test: { include: { sections: { orderBy: { order: "asc" }, select: { id: true, name: true } } } }, responses: { orderBy: [{ ord: "asc" }, { updatedAt: "asc" }] } } });
  if (!a) return res.sendStatus(404);
  if (a.status === "IN_PROGRESS") return res.status(403).json({ error: "Review is available after submission" });
  const secName = new Map<string, string>(a.test.sections.map((s: any) => [s.id, s.name] as [string, string]));
  const rows = a.responses.map((r: any) => ({ questionId: r.questionId, section: secName.get(r.sectionId), subject: r.subject, topic: r.topic, difficulty: r.difficulty, text: r.snapshot?.text, options: r.snapshot?.options,
    explanation: a.test.showExplanations ? r.snapshot?.explanation : null, selectedKey: r.selectedKey, correctKey: r.correctKeySnapshot, isCorrect: r.isCorrect, timeSpentSec: Math.round(r.timeSpentMs / 1000) }));
  res.json({ attemptNo: a.attemptNo, testId: a.testId, testName: a.test.name, mode: a.mode, adaptive: !!a.adaptiveQuestionIds, rows });
}));
