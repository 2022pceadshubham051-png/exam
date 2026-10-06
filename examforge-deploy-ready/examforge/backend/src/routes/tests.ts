import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, requireAdmin, type AuthedReq } from "../middleware/auth";

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
        select: { id: true, mode: true, attemptNo: true },
        take: 1,
      },
    },
  });
  if (!t) return res.sendStatus(404);
  const { attempts, ...safe } = t;
  res.json({ ...safe, activeAttempt: attempts[0] ?? null });
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

// Permanently remove the complete test tree. This deliberately deletes attempts/results too.
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
    });
    res.json({ ok: true, permanentlyDeleted: true });
  } catch (e: any) {
    fail(res, e);
  }
});

// Clone a test, sections and their questions into a fresh draft.
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
          name: `${source.name} Copy`,
          examName: source.examName,
          description: source.description,
          durationSec: source.durationSec,
          difficulty: source.difficulty,
          positiveMarks: source.positiveMarks,
          negativeMarks: source.negativeMarks,
          passingPercent: source.passingPercent,
          globalQuestionSec: source.globalQuestionSec,
          allowSectionBacktrack: source.allowSectionBacktrack,
          allowSectionSwitch: source.allowSectionSwitch,
          shuffleQuestions: source.shuffleQuestions,
          shuffleOptions: source.shuffleOptions,
          maxTabSwitches: source.maxTabSwitches,
          requireFullscreen: source.requireFullscreen,
          showResult: source.showResult,
          showExplanations: source.showExplanations,
          leaderboard: source.leaderboard,
          allowPracticeMode: source.allowPracticeMode,
          maxAttempts: source.maxAttempts,
          published: false,
        },
      });
      for (const sec of source.sections) {
        const cs = await tx.section.create({ data: { testId: created.id, name: sec.name, order: sec.order, durationSec: sec.durationSec, questionSec: sec.questionSec } });
        for (const q of sec.questions) {
          await tx.question.create({
            data: {
              sectionId: cs.id,
              text: q.text,
              explanation: q.explanation,
              subject: q.subject,
              topic: q.topic,
              difficulty: q.difficulty,
              correctKey: q.correctKey,
              timeLimitSec: q.timeLimitSec,
              status: q.status === "PUBLISHED" || q.status === "VERIFIED" ? "VERIFIED" : q.status,
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

// Assign bank questions to a section (moves them; one section per question for now)
tests.post("/:id/sections/:sid/questions", requireAdmin, async (req, res) => {
  const ids = z.array(z.string()).parse(req.body.questionIds);
  res.json(await prisma.question.updateMany({ where: { id: { in: ids }, status: { in: ["VERIFIED", "PUBLISHED"] } }, data: { sectionId: req.params.sid } }));
});

// Publish gate: every section needs questions and all must be VERIFIED/PUBLISHED
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

tests.get("/:id/leaderboard", async (req, res) => {
  const t = await prisma.test.findUnique({ where: { id: req.params.id } }); if (!t?.leaderboard) return res.json([]);
  const rows = await prisma.testResult.findMany({ where: { attempt: { testId: t.id, mode: "EXAM" } }, orderBy: [{ score: "desc" }, { timeTakenSec: "asc" }], take: 50, include: { attempt: { include: { user: { select: { name: true, displayName: true } } } } } });
  res.json(rows.map((r: any, i: number) => ({ rank: i + 1, name: r.attempt.user.displayName ?? r.attempt.user.name, score: r.score, percentage: r.percentage, accuracy: r.accuracy, timeTakenSec: r.timeTakenSec })));
});
