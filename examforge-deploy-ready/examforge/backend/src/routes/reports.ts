import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, requireAdmin } from "../middleware/auth";
import { wrap, fail } from "./util";

export const reports = Router(); reports.use(requireAuth);
export const REASONS = ["wrong_answer", "unclear", "typo", "other"] as const;
const body = z.object({ questionId: z.string().min(1).max(60), reason: z.enum(REASONS), note: z.string().trim().max(500).optional() });
const DAILY_LIMIT = 30;

reports.post("/questions/report", wrap(async (req, res) => {
  const b = body.parse(req.body), userId = req.user!.id;
  if (!(await prisma.question.findMany({ where: { id: b.questionId }, select: { id: true }, take: 1 })).length) throw fail(404, "Question not found.");
  const since = new Date(Date.now() - 86_400_000);
  if ((await prisma.questionReport.count({ where: { userId, createdAt: { gte: since } } })) >= DAILY_LIMIT) throw fail(429, "You have sent many reports today. Thank you, please try again tomorrow.");
  // One open report per student per question; sending again just updates it.
  await prisma.questionReport.upsert({ where: { userId_questionId: { userId, questionId: b.questionId } }, create: { userId, questionId: b.questionId, reason: b.reason, note: b.note ?? null }, update: { reason: b.reason, note: b.note ?? null, status: "OPEN" } });
  res.json({ ok: true });
}));

reports.get("/admin/reports", requireAdmin, wrap(async (req, res) => {
  const status = req.query.status === "RESOLVED" ? "RESOLVED" : "OPEN";
  const rows = await prisma.questionReport.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 200 });
  const ids = [...new Set(rows.map((r) => r.questionId))], qs = await prisma.question.findMany({ where: { id: { in: ids } }, include: { options: true, section: { select: { test: { select: { id: true, name: true } } } } } });
  const q = new Map(qs.map((x) => [x.id, x]));
  const grouped = ids.map((id) => { const rs = rows.filter((r) => r.questionId === id), x = q.get(id); return x ? { questionId: id, text: x.text, correctKey: x.correctKey, options: x.options.map((o) => ({ key: o.key, text: o.text })).sort((a, b) => a.key.localeCompare(b.key)), explanation: x.explanation, test: x.section?.test ?? null, count: rs.length, reasons: rs.map((r) => ({ reason: r.reason, note: r.note, at: r.createdAt })) } : null; }).filter(Boolean);
  res.json(grouped.sort((a: any, b: any) => b.count - a.count));
}));
reports.post("/admin/reports/:questionId/resolve", requireAdmin, wrap(async (req, res) => { await prisma.questionReport.updateMany({ where: { questionId: req.params.questionId }, data: { status: "RESOLVED" } }); res.json({ ok: true }); }));
