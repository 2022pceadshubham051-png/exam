import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { parseQuestions, isPublishable } from "../services/parser/importParser";
import { detect, normalizeSubject, SUBJECT_NAMES } from "../services/syllabus/classifier";
export const questions = Router(); questions.use(requireAuth, requireAdmin);
const fail = (res: any, e: any) => res.status(400).json({ error: e?.issues ? e.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") : e.message });

// Step 1: preview only — nothing is written until admin approves. Subject/topic are auto-detected when the paste has no Topic: line.
questions.post("/import/preview", (req, res) => res.json(parseQuestions(String(req.body.text ?? "")).map((q) => {
  const d = detect(q.text + " " + q.options.map((o) => o.text).join(" "), { topic: q.topic });
  return { ...q, publishable: isPublishable(q), detected: { subject: d.subject, subjectName: d.subjectName, topic: q.topic || d.topic, confidence: d.confidence } };
})));

// Step 2: approved (possibly admin-corrected) items; re-validated server-side, stored as PENDING_REVIEW.
questions.post("/import", async (req, res) => {
  try {
    const { sectionId, subject, items } = req.body as { sectionId?: string; subject?: string; items: (ReturnType<typeof parseQuestions>[number] & { subject?: string })[] };
    const ok = items.filter((q) => q.correctKey && q.options.length === 4 && q.options.some((o) => o.key === q.correctKey) && q.text.trim());
    const sectionName = sectionId ? (await prisma.section.findUnique({ where: { id: sectionId }, select: { name: true } }))?.name : undefined;
    const created = await prisma.$transaction(ok.map((q) => {
      const d = detect(q.text + " " + q.options.map((o) => o.text).join(" "), { subject: subject ?? sectionName, topic: q.topic });
      const subj = normalizeSubject(q.subject) ?? normalizeSubject(subject) ?? normalizeSubject(sectionName) ?? d.subject;
      return prisma.question.create({ data: { sectionId, subject: subj, topic: q.topic?.trim() || d.topic, text: q.text, explanation: q.explanation,
        correctKey: q.correctKey!, difficulty: (["EASY", "MEDIUM", "HARD"].includes(q.difficulty ?? "") ? q.difficulty : "MEDIUM") as any, status: "PENDING_REVIEW", options: { create: q.options } } });
    }));
    res.json({ created: created.length, rejected: items.length - ok.length });
  } catch (e) { fail(res, e); }
});

questions.get("/", async (req, res) => {
  const { subject, topic, status, q, page = "1", sectionId } = req.query as Record<string, string>;
  res.json(await prisma.question.findMany({ where: { subject, topic, sectionId, status: status as any, text: q ? { contains: q, mode: "insensitive" } : undefined }, include: { options: true }, skip: (+page - 1) * 25, take: 25, orderBy: { createdAt: "desc" } }));
});
questions.patch("/:id/status", async (req, res) => res.json(await prisma.question.update({ where: { id: req.params.id }, data: { status: req.body.status } })));

// Edit a question (text, options, answer, topic, difficulty, explanation)
const edit = z.object({
  text: z.string().min(1).optional(), explanation: z.string().nullish(), subject: z.string().nullish(), topic: z.string().nullish(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(), correctKey: z.enum(["A", "B", "C", "D"]).optional(),
  options: z.array(z.object({ key: z.enum(["A", "B", "C", "D"]), text: z.string().min(1) })).length(4).optional(),
});
questions.put("/:id", async (req, res) => {
  try {
    const { options, ...d } = edit.parse(req.body);
    if (options && new Set(options.map((o) => o.key)).size !== 4) throw new Error("Options must be A, B, C and D");
    const updated = await prisma.$transaction(async (tx) => {
      if (options) for (const o of options) await tx.option.upsert({ where: { questionId_key: { questionId: req.params.id, key: o.key } }, update: { text: o.text }, create: { questionId: req.params.id, key: o.key, text: o.text } });
      return tx.question.update({ where: { id: req.params.id }, data: d, include: { options: true } });
    });
    res.json(updated);
  } catch (e) { fail(res, e); }
});
// Delete a question. If students already answered it, it is detached from the test (history stays intact) instead of hard-deleted.
questions.delete("/:id", async (req, res) => {
  try {
    const used = await prisma.questionResponse.count({ where: { questionId: req.params.id } });
    if (used) { await prisma.question.update({ where: { id: req.params.id }, data: { sectionId: null } }); return res.json({ ok: true, detached: true }); }
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ ok: true, detached: false });
  } catch (e) { fail(res, e); }
});

// Bulk verification step of AI Generated -> Pending Review -> Verified -> Published
questions.post("/verify", async (req, res) => res.json(await prisma.question.updateMany({ where: { section: { testId: String(req.body.testId) }, status: "PENDING_REVIEW" }, data: { status: "VERIFIED" } })));

// Auto-detect subject + topic for every question of a test (only fills blanks unless force=true)
questions.post("/autotag", async (req, res) => {
  try {
    const { testId, force } = z.object({ testId: z.string(), force: z.boolean().optional() }).parse(req.body);
    const qs = await prisma.question.findMany({ where: { section: { testId } }, include: { options: true, section: { select: { name: true } } } });
    let changed = 0; const summary: Record<string, number> = {};
    for (const q of qs) {
      const d = detect(q.text + " " + q.options.map((o) => o.text).join(" "), { subject: q.subject ?? q.section?.name, topic: q.topic });
      const subject = force || !q.subject ? (normalizeSubject(q.section?.name) ?? d.subject) : q.subject;
      const topic = force || !q.topic ? d.topic : q.topic;
      summary[(SUBJECT_NAMES as any)[subject] ?? subject] = (summary[(SUBJECT_NAMES as any)[subject] ?? subject] ?? 0) + 1;
      if (subject !== q.subject || topic !== q.topic) { await prisma.question.update({ where: { id: q.id }, data: { subject, topic } }); changed++; }
    }
    res.json({ total: qs.length, changed, summary });
  } catch (e) { fail(res, e); }
});
