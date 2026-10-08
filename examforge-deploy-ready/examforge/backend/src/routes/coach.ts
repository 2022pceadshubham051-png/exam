import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";
import { BLUEPRINTS, blueprintById, customBlueprint, withWeights } from "../services/syllabus/blueprints";
import { detect, normalizeSubject, SUBJECT_NAMES, type SubjectKey } from "../services/syllabus/classifier";
import { analyse, dailyPlan, type RespRow } from "../services/analytics/coach";

export const coach = Router();
coach.use(requireAuth);
const wrap = (fn: (req: AuthedReq, res: any) => Promise<any>) => (req: AuthedReq, res: any) => fn(req, res).catch((e) => res.status(400).json({ error: e.message }));

coach.get("/coach/exams", (_req, res) => res.json({ exams: BLUEPRINTS.map(withWeights), subjects: Object.entries(SUBJECT_NAMES).map(([key, name]) => ({ key, name })) }));

coach.get("/coach/prefs", wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { targetExam: true, targetScore: true, name: true } });
  res.json({ targetExam: u?.targetExam ?? null, targetScore: u?.targetScore ?? 80, name: u?.name });
}));
coach.put("/coach/prefs", wrap(async (req, res) => {
  const b = z.object({ targetExam: z.string().max(400).nullable().optional(), targetScore: z.number().int().min(30).max(100).optional() }).parse(req.body);
  await prisma.user.update({ where: { id: req.user!.id }, data: { targetExam: b.targetExam ?? undefined, targetScore: b.targetScore ?? undefined } });
  res.json({ ok: true });
}));

/** exam = blueprint id, or "custom" with ?weights=reasoning:30,quant:30 */
coach.get("/coach", wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { targetExam: true, targetScore: true } });
  const examId = String(req.query.exam ?? u?.targetExam ?? "ssc-cgl-t1");
  const bp = examId.startsWith("custom") ? customBlueprint(String(req.query.weights ?? examId.split("|")[1] ?? "")) : blueprintById(examId);
  if (!bp) return res.status(400).json({ error: "Unknown exam" });
  const scope = ["exam", "practice", "all"].includes(String(req.query.scope)) ? String(req.query.scope) : "all";
  const target = Math.min(100, Math.max(30, Number(req.query.target ?? u?.targetScore ?? 80)));
  const days = Math.min(365, Math.max(7, Number(req.query.days ?? 120)));

  const resp = await prisma.questionResponse.findMany({
    where: { attempt: { userId: req.user!.id, result: { isNot: null }, startedAt: { gte: new Date(Date.now() - days * 864e5) }, ...(scope === "all" ? {} : { mode: scope === "exam" ? "EXAM" : "PRACTICE" }) }, isCorrect: { not: null } },
    select: { subject: true, topic: true, isCorrect: true, timeSpentMs: true, snapshot: true, difficulty: true, attempt: { select: { startedAt: true } }, question: { select: { subject: true, topic: true, text: true } } },
    take: 8000, orderBy: { updatedAt: "desc" },
  });
  const rows: RespRow[] = resp.map((r: any) => {
    const text = r.snapshot?.text ?? r.question?.text ?? "";
    let subject = (r.subject as SubjectKey | null) ?? normalizeSubject(r.question?.subject) ?? null; let topic: string | null = r.topic ?? r.question?.topic ?? null;
    if (!subject || !topic) { const d = detect(text, { subject: r.question?.subject, topic: r.question?.topic }); subject = subject ?? d.subject; topic = topic ?? d.topic; }
    return { subject, topic: topic!, correct: !!r.isCorrect, timeSec: (r.timeSpentMs ?? 0) / 1000, ageDays: (Date.now() - new Date(r.attempt.startedAt).getTime()) / 864e5, difficulty: r.difficulty };
  });

  const a = analyse(rows, bp, target);
  // which published tests contain material for each focus topic (for one-click practice)
  const tests = await prisma.test.findMany({ where: { published: true, allowPracticeMode: true }, select: { id: true, name: true, sections: { select: { questions: { select: { text: true, subject: true, topic: true } } } } } });
  const index = new Map<string, { testId: string; name: string; count: number }[]>();
  for (const t of tests) {
    const counts = new Map<string, number>();
    for (const s of t.sections) for (const q of s.questions) { const topic = q.topic?.trim() || detect(q.text, q).topic; counts.set(topic, (counts.get(topic) ?? 0) + 1); }
    for (const [topic, count] of counts) { const k = topic.toLowerCase(); (index.get(k) ?? index.set(k, []).get(k)!).push({ testId: t.id, name: t.name, count }); }
  }
  const focus = a.focus.map((f: any) => ({ ...f, practice: f.topic ? (index.get(String(f.topic).toLowerCase()) ?? []).sort((x, y) => y.count - x.count).slice(0, 3) : [] }));
  res.json({ exam: withWeights(bp), scope, days, ...a, focus, plan: dailyPlan(a.focus, Number(req.query.hours ?? 2)) });
}));
