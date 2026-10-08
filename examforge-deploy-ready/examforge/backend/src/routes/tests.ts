import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, requireAdmin, type AuthedReq } from "../middleware/auth";
import { buildAdaptiveSelection } from "../services/analytics/adaptive";

export const tests = Router();
tests.use(requireAuth);

const section = z.object({
  name: z.string().min(1),
  durationSec: z.number().int().positive(),
  questionSec: z.number().int().positive().nullish(),
});

const body = z.object({
  name: z.string().min(1),
  examName: z.string().min(1),
  description: z.string().optional(),
  durationSec: z.number().int().positive(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  positiveMarks: z.number().default(1),
  negativeMarks: z.number().min(0).default(0.25),
  passingPercent: z.number().default(40),
  globalQuestionSec: z.number().int().positive().nullish(),
  allowSectionBacktrack: z.boolean().default(false),
  allowSectionSwitch: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  maxTabSwitches: z.number().int().min(0).default(3),
  requireFullscreen: z.boolean().default(true),
  showResult: z.boolean().default(true),
  showExplanations: z.boolean().default(true),
  leaderboard: z.boolean().default(true),
  allowPracticeMode: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).nullish(),
});

const fail = (res: any, e: any) =>
  res.status(400).json({
    error: e.issues ? e.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") : e.message,
  });

async function adaptiveRecommendation(userId: string, testId: string, desired = 20) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { sections: { orderBy: { order: "asc" }, include: { questions: { select: { id: true, topic: true, difficulty: true } } } } },
  });
  if (!test) return null;
  // Use the parent section id as the authoritative section id. Prisma's Question.sectionId
  // is nullable, but a question returned through test.sections always belongs to `s`.
  const candidates = test.sections.flatMap((s) =>
    s.questions.map((q) => ({
      id: q.id,
      sectionId: s.id,
      topic: q.topic,
      difficulty: q.difficulty,
    }))
  );
  const history = await prisma.questionResponse.findMany({
    where: { attempt: { userId, mode: "EXAM", result: { isNot: null } }, topic: { not: null } },
    select: { topic: true, isCorrect: true, timeSpentMs: true },
    take: 5000,
    orderBy: { updatedAt: "desc" },
  });
  return buildAdaptiveSelection(candidates, history, Math.min(Math.max(desired, 5), 50), Math.floor(Math.random() * 2 ** 31));
}

tests.get("/leaderboard", async (req: AuthedReq, res) => {
  const limit = Math.min(20, Math.max(5, Number(req.query.limit ?? 10)));
  const rows = await prisma.testResult.findMany({
    where: { attempt: { mode: "EXAM" } },
    orderBy: [{ percentage: "desc" }, { accuracy: "desc" }, { timeTakenSec: "asc" }],
    take: 3000,
    include: { attempt: { include: { user: { select: { name: true, displayName: true } }, test: { select: { name: true } } } } },
  });
  const byUser = new Map<string, { name: string; attempts: number; total: number; best: number; bestTest: string; accuracy: number; time: number }>();
  for (const r of rows) {
    const uid = r.attempt.userId;
    const name = r.attempt.user.displayName ?? r.attempt.user.name;
    const prev = byUser.get(uid) ?? { name, attempts: 0, total: 0, best: 0, bestTest: r.attempt.test.name, accuracy: 0, time: 0 };
    prev.attempts += 1; prev.total += r.percentage; prev.accuracy += r.accuracy; prev.time += r.timeTakenSec;
    if (r.percentage > prev.best) { prev.best = r.percentage; prev.bestTest = r.attempt.test.name; }
    byUser.set(uid, prev);
  }
  const out = [...byUser.values()]
    .map((x) => ({ ...x, average: +(x.total / x.attempts).toFixed(1), averageAccuracy: +(x.accuracy / x.attempts).toFixed(1), averageTimeSec: Math.round(x.time / x.attempts) }))
    .sort((a, b) => b.average - a.average || b.best - a.best || b.averageAccuracy - a.averageAccuracy)
    .slice(0, limit)
    .map((x, i) => ({ rank: i + 1, ...x }));
  res.json(out);
});

tests.get("/:id/adaptive/recommend", async (req: AuthedReq, res) => {
  const desired = Number(req.query.count ?? 20);
  const r = await adaptiveRecommendation(req.user!.id, req.params.id, desired);
  if (!r) return res.sendStatus(404);
  res.json(r);
});

tests.get("/", async (req: AuthedReq, res) => {
  const { q, exam, page = "1" } = req.query as Record<string, string>;
  res.json(
    await prisma.test.findMany({
      where: {
        published: req.user!.role === "ADMIN" ? undefined : true,
        name: q ? { contains: q, mode: "insensitive" } : undefined,
        examName: exam,
      },
      orderBy: { createdAt: "desc" },
      skip: (+page - 1) * 20,
      take: 20,
      include: {
        sections: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, durationSec: true, _count: { select: { questions: true } } },
        },
      },
    })
  );
});


tests.get("/:id/leaderboard", async (req, res) => {
  const t = await prisma.test.findUnique({ where: { id: req.params.id } });
  if (!t?.leaderboard) return res.json([]);
  const rows = await prisma.testResult.findMany({
    where: { attempt: { testId: t.id, mode: "EXAM" } },
    orderBy: [{ score: "desc" }, { timeTakenSec: "asc" }],
    take: 50,
    include: { attempt: { include: { user: { select: { name: true, displayName: true } } } } },
  });
  res.json(rows.map((r: any, i: number) => ({ rank: i + 1, name: r.attempt.user.displayName ?? r.attempt.user.name, score: r.score, percentage: r.percentage, accuracy: r.accuracy, timeTakenSec: r.timeTakenSec })));
});

tests.get("/:id", async (req: AuthedReq, res) => {
  const t = await prisma.test.findUnique({
    where: { id: req.params.id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          durationSec: true,
          questionSec: true,
          _count: { select: { questions: true } },
        },
      },
      attempts: {
        where: { userId: req.user!.id, status: "IN_PROGRESS" },
        select: { id: true, mode: true, attemptNo: true, adaptiveQuestionIds: true, startedAt: true },
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });
  if (!t || (!t.published && req.user!.role !== "ADMIN")) return res.sendStatus(404);
  const { attempts, ...safe } = t;
  const activeExamAttempt = attempts.find((a) => a.mode === "EXAM") ?? null;
  const activePracticeAttempt = attempts.find((a) => a.mode === "PRACTICE" && !a.adaptiveQuestionIds) ?? null;
  const activeAdaptiveAttempt = attempts.find((a) => a.mode === "PRACTICE" && !!a.adaptiveQuestionIds) ?? null;
  res.json({
    ...safe,
    activeExamAttempt: activeExamAttempt ? { ...activeExamAttempt, adaptive: false } : null,
    activePracticeAttempt: activePracticeAttempt ? { ...activePracticeAttempt, adaptive: false } : null,
    activeAdaptiveAttempt: activeAdaptiveAttempt ? { ...activeAdaptiveAttempt, adaptive: true } : null,
    // Backward-compatible shape for older frontend builds.
    activeAttempt: activeExamAttempt ? { ...activeExamAttempt, adaptive: false } : activePracticeAttempt ? { ...activePracticeAttempt, adaptive: false } : activeAdaptiveAttempt ? { ...activeAdaptiveAttempt, adaptive: true } : null,
  });
});

tests.post("/", requireAdmin, async (req, res) => {
  try {
    const { sections, ...t } = z.object({ sections: z.array(section).min(1) }).and(body).parse(req.body);
    res.json(
      await prisma.test.create({
        data: { ...t, sections: { create: sections.map((s, i) => ({ ...s, order: i })) } },
        include: { sections: true },
      })
    );
  } catch (e) {
    fail(res, e);
  }
});

tests.put("/:id", requireAdmin, async (req, res) => {
  try {
    res.json(await prisma.test.update({ where: { id: req.params.id }, data: body.partial().parse(req.body) }));
  } catch (e) {
    fail(res, e);
  }
});

tests.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const t = await tx.test.findUnique({ where: { id: req.params.id }, select: { id: true, sections: { select: { id: true } } } });
      if (!t) throw new Error("Test not found");
      const sectionIds = t.sections.map((s) => s.id);
      const questions = sectionIds.length
        ? await tx.question.findMany({ where: { sectionId: { in: sectionIds } }, select: { id: true } })
        : [];
      const questionIds = questions.map((q) => q.id);
      await tx.testResult.deleteMany({ where: { attempt: { testId: t.id } } });
      await tx.testAttempt.deleteMany({ where: { testId: t.id } });
      if (questionIds.length) {
        await tx.questionAnalytics.deleteMany({ where: { questionId: { in: questionIds } } });
        await tx.question.deleteMany({ where: { id: { in: questionIds } } });
      }
      await tx.test.delete({ where: { id: t.id } });
    }, { timeout: 60_000, maxWait: 15_000 });
    res.json({ ok: true, permanentlyDeleted: true });
  } catch (e: any) {
    fail(res, e);
  }
});

tests.post("/:id/duplicate", requireAdmin, async (req, res) => {
  try {
    const source = await prisma.test.findUnique({
      where: { id: req.params.id },
      include: { sections: { orderBy: { order: "asc" }, include: { questions: { include: { options: true } } } } },
    });
    if (!source) return res.sendStatus(404);
    const copy = await prisma.$transaction(async (tx) => {
      const created = await tx.test.create({
        data: {
          name: `${source.name} Copy`, examName: source.examName, description: source.description, durationSec: source.durationSec, difficulty: source.difficulty,
          positiveMarks: source.positiveMarks, negativeMarks: source.negativeMarks, passingPercent: source.passingPercent, globalQuestionSec: source.globalQuestionSec,
          allowSectionBacktrack: source.allowSectionBacktrack, allowSectionSwitch: source.allowSectionSwitch, shuffleQuestions: source.shuffleQuestions,
          shuffleOptions: source.shuffleOptions, maxTabSwitches: source.maxTabSwitches, requireFullscreen: source.requireFullscreen, showResult: source.showResult,
          showExplanations: source.showExplanations, leaderboard: source.leaderboard, allowPracticeMode: source.allowPracticeMode, maxAttempts: source.maxAttempts, published: false,
        },
      });
      for (const sec of source.sections) {
        const cs = await tx.section.create({ data: { testId: created.id, name: sec.name, order: sec.order, durationSec: sec.durationSec, questionSec: sec.questionSec } });
        for (const q of sec.questions) {
          await tx.question.create({
            data: {
              sectionId: cs.id, text: q.text, explanation: q.explanation, subject: q.subject, topic: q.topic, difficulty: q.difficulty,
              correctKey: q.correctKey, timeLimitSec: q.timeLimitSec, status: q.status === "PUBLISHED" || q.status === "VERIFIED" ? "VERIFIED" : q.status,
              options: { create: q.options.map((o) => ({ key: o.key, text: o.text })) },
            },
          });
        }
      }
      return tx.test.findUnique({ where: { id: created.id }, include: { sections: true } });
    });
    res.json(copy);
  } catch (e) {
    fail(res, e);
  }
});

tests.post("/:id/sections/:sid/questions", requireAdmin, async (req, res) => {
  const ids = z.array(z.string()).parse(req.body.questionIds);
  res.json(await prisma.question.updateMany({ where: { id: { in: ids }, status: { in: ["VERIFIED", "PUBLISHED"] } }, data: { sectionId: req.params.sid } }));
});

tests.post("/:id/publish", requireAdmin, async (req, res) => {
  const t = await prisma.test.findUnique({ where: { id: req.params.id }, include: { sections: { include: { questions: { select: { status: true } } } } } });
  if (!t) return res.sendStatus(404);
  const problems = t.sections.flatMap((s: any) => s.questions.length === 0 ? [`Section "${s.name}" has no questions`] : s.questions.some((q: any) => !["VERIFIED", "PUBLISHED"].includes(q.status)) ? [`Section "${s.name}" has unverified questions`] : []);
  const sum = t.sections.reduce((a: number, s: any) => a + s.durationSec, 0);
  if (sum > t.durationSec) problems.push(`Section times (${sum}s) exceed test duration (${t.durationSec}s)`);
  if (problems.length) return res.status(422).json({ error: problems.join("; "), problems });
  await prisma.question.updateMany({ where: { section: { testId: t.id } }, data: { status: "PUBLISHED" } });
  res.json(await prisma.test.update({ where: { id: t.id }, data: { published: true } }));
});

tests.post("/:id/unpublish", requireAdmin, async (req, res) => {
  const t = await prisma.test.findUnique({ where: { id: req.params.id } });
  if (!t) return res.sendStatus(404);
  res.json(await prisma.test.update({ where: { id: t.id }, data: { published: false } }));
});

// ---------------------------------------------------------------- admin: question manager, sections, analytics, reset
tests.get("/:id/questions", requireAdmin, async (req, res) => {
  const t = await prisma.test.findUnique({ where: { id: req.params.id }, include: { sections: { orderBy: { order: "asc" }, include: { questions: { orderBy: { createdAt: "asc" }, include: { options: { orderBy: { key: "asc" } } } } } } } });
  if (!t) return res.sendStatus(404);
  const ids = t.sections.flatMap((s) => s.questions.map((q) => q.id));
  const g = ids.length ? await prisma.questionResponse.groupBy({ by: ["questionId", "isCorrect"], where: { questionId: { in: ids }, isCorrect: { not: null }, attempt: { mode: "EXAM" } }, _count: { _all: true }, _avg: { timeSpentMs: true } }) : [];
  const stat = new Map<string, { attempts: number; correct: number; ms: number }>();
  for (const r of g) { const e = stat.get(r.questionId) ?? { attempts: 0, correct: 0, ms: 0 }; const n = r._count._all; e.attempts += n; if (r.isCorrect) e.correct += n; e.ms += (r._avg.timeSpentMs ?? 0) * n; stat.set(r.questionId, e); }
  res.json(t.sections.map((s) => ({ id: s.id, name: s.name, questions: s.questions.map((q) => { const e = stat.get(q.id); return { ...q, analytics: e ? { attempts: e.attempts, correctPct: +((e.correct / e.attempts) * 100).toFixed(0), avgSec: Math.round(e.ms / e.attempts / 1000) } : null }; }) })));
});

const secBody = z.object({ name: z.string().min(1).optional(), durationSec: z.number().int().positive().optional(), questionSec: z.number().int().positive().nullish() });
tests.put("/:id/sections/:sid", requireAdmin, async (req, res) => {
  try { res.json(await prisma.section.update({ where: { id: req.params.sid }, data: secBody.parse(req.body) })); } catch (e) { fail(res, e); }
});
tests.post("/:id/sections", requireAdmin, async (req, res) => {
  try {
    const b = secBody.required({ name: true, durationSec: true }).parse(req.body);
    const last = await prisma.section.aggregate({ where: { testId: req.params.id }, _max: { order: true } });
    res.json(await prisma.section.create({ data: { testId: req.params.id, name: b.name, durationSec: b.durationSec, questionSec: b.questionSec ?? null, order: (last._max.order ?? -1) + 1 } }));
  } catch (e) { fail(res, e); }
});
tests.delete("/:id/sections/:sid", requireAdmin, async (req, res) => {
  try {
    const n = await prisma.question.count({ where: { sectionId: req.params.sid } });
    if (n) throw new Error(`Section still has ${n} questions. Delete or move them first.`);
    const used = await prisma.sectionAttempt.count({ where: { sectionId: req.params.sid } });
    if (used) throw new Error("Students already attempted this section, so it cannot be removed.");
    const count = await prisma.section.count({ where: { testId: req.params.id } });
    if (count <= 1) throw new Error("A test needs at least one section.");
    await prisma.section.delete({ where: { id: req.params.sid } });
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

// Wipe every student attempt of one test (keeps the test + questions). Useful for re-launching a test.
tests.post("/:id/reset-attempts", requireAdmin, async (req, res) => {
  try {
    const n = await prisma.$transaction(async (tx) => {
      await tx.testResult.deleteMany({ where: { attempt: { testId: req.params.id } } });
      return tx.testAttempt.deleteMany({ where: { testId: req.params.id } });
    }, { timeout: 60_000, maxWait: 15_000 });
    res.json({ deleted: n.count });
  } catch (e) { fail(res, e); }
});

tests.get("/:id/analytics", requireAdmin, async (req, res) => {
  const results = await prisma.testResult.findMany({ where: { attempt: { testId: req.params.id, mode: "EXAM" } }, select: { percentage: true, accuracy: true, timeTakenSec: true } });
  const t = await prisma.test.findUnique({ where: { id: req.params.id }, select: { passingPercent: true } });
  const n = results.length; const avg = (f: (r: any) => number) => (n ? +(results.reduce((a, r) => a + f(r), 0) / n).toFixed(1) : 0);
  res.json({ attempts: n, avgPercentage: avg((r) => r.percentage), avgAccuracy: avg((r) => r.accuracy), avgTimeSec: Math.round(avg((r) => r.timeTakenSec)), passRate: n ? +((results.filter((r) => r.percentage >= (t?.passingPercent ?? 40)).length / n) * 100).toFixed(1) : 0 });
});
