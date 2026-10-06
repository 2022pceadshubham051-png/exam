import { Router } from "express"; import { prisma } from "../lib/db";
import { requireAuth, requireAdmin } from "../middleware/auth"; import { parseQuestions, isPublishable } from "../services/parser/importParser";
export const questions = Router(); questions.use(requireAuth, requireAdmin);
// Step 1: preview only — nothing is written until admin approves.
questions.post("/import/preview", (req, res) => res.json(parseQuestions(String(req.body.text ?? "")).map((q) => ({ ...q, publishable: isPublishable(q) }))));
// Step 2: approved (possibly admin-corrected) items; re-validated server-side, stored as PENDING_REVIEW.
questions.post("/import", async (req, res) => {
  const { sectionId, subject, items } = req.body as { sectionId?: string; subject?: string; items: ReturnType<typeof parseQuestions> };
  const ok = items.filter((q) => q.correctKey && q.options.length === 4 && q.options.some((o) => o.key === q.correctKey) && q.text.trim());
  const created = await prisma.$transaction(ok.map((q) => prisma.question.create({ data: { sectionId, subject, topic: q.topic, text: q.text, explanation: q.explanation,
    correctKey: q.correctKey!, difficulty: (["EASY", "MEDIUM", "HARD"].includes(q.difficulty ?? "") ? q.difficulty : "MEDIUM") as any, status: "PENDING_REVIEW", options: { create: q.options } } })));
  res.json({ created: created.length, rejected: items.length - ok.length });
});
questions.get("/", async (req, res) => {
  const { subject, topic, status, q, page = "1" } = req.query as Record<string, string>;
  res.json(await prisma.question.findMany({ where: { subject, topic, status: status as any, text: q ? { contains: q, mode: "insensitive" } : undefined }, include: { options: true }, skip: (+page - 1) * 25, take: 25, orderBy: { createdAt: "desc" } }));
});
questions.patch("/:id/status", async (req, res) => res.json(await prisma.question.update({ where: { id: req.params.id }, data: { status: req.body.status } })));
// Bulk verification step of AI Generated -> Pending Review -> Verified -> Published
questions.post("/verify", async (req, res) => res.json(await prisma.question.updateMany({ where: { section: { testId: String(req.body.testId) }, status: "PENDING_REVIEW" }, data: { status: "VERIFIED" } })));
