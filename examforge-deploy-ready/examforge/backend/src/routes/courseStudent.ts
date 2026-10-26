import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import { wrap, fail } from "./util"; import { access, reviewerName, isAdmin } from "./courses"; import { pushPublicKey, notifyUsers } from "../services/push";
import { aiConfigured, callModel, takeQuota, AI_DAILY_CAP } from "../services/ai"; import { QUOTA_NOTE, BUSY_NOTE } from "../services/aiLogic"; import { dayKey } from "../services/coins";

/** Student extras for the course player: timestamped notes + bookmarks, and web-push subscriptions. */
export const courseStudent = Router(); courseStudent.use(requireAuth);

/** The lesson, if this person may open it (enrolled, admin, or free preview). */
async function openLesson(req: AuthedReq, lessonId: string) {
  const l = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, courseId: true, isPreview: true } }); if (!l) throw fail(404, "Lesson not found.");
  if (!(await access(req, l.courseId)).full && !l.isPreview) throw fail(403, "Enroll in this course first."); return l;
}
const noteBody = z.object({ atSec: z.coerce.number().int().min(0).max(86_400).default(0), kind: z.enum(["NOTE", "BOOKMARK"]).default("NOTE"), text: z.string().trim().max(2000).default("") })
  .refine((n) => n.kind === "BOOKMARK" || n.text.length > 0, { message: "Write something in the note.", path: ["text"] });
const pub = (n: any) => ({ id: n.id, lessonId: n.lessonId, atSec: n.atSec, kind: n.kind, text: n.text, createdAt: n.createdAt });

courseStudent.get("/lessons/:lid/notes", wrap(async (req, res) => {
  const l = await openLesson(req, req.params.lid);
  res.json((await prisma.lessonNote.findMany({ where: { userId: req.user!.id, lessonId: l.id }, orderBy: [{ atSec: "asc" }, { createdAt: "asc" }], take: 300 })).map(pub));
}));
courseStudent.post("/lessons/:lid/notes", wrap(async (req, res) => {
  const l = await openLesson(req, req.params.lid), b = noteBody.parse(req.body);
  if ((await prisma.lessonNote.count({ where: { userId: req.user!.id, lessonId: l.id } })) >= 300) throw fail(400, "You have reached the limit of 300 notes for this lesson.");
  res.json(pub(await prisma.lessonNote.create({ data: { userId: req.user!.id, lessonId: l.id, atSec: b.atSec, kind: b.kind, text: b.text } })));
}));
courseStudent.put("/notes/:id", wrap(async (req, res) => {
  const n = await prisma.lessonNote.findUnique({ where: { id: req.params.id } }); if (!n || n.userId !== req.user!.id) throw fail(404, "Note not found.");
  const text = z.string().trim().min(n.kind === "BOOKMARK" ? 0 : 1).max(2000).parse(req.body?.text ?? "");
  res.json(pub(await prisma.lessonNote.update({ where: { id: n.id }, data: { text } })));
}));
courseStudent.delete("/notes/:id", wrap(async (req, res) => {
  const r = await prisma.lessonNote.deleteMany({ where: { id: req.params.id, userId: req.user!.id } }); if (!r.count) throw fail(404, "Note not found."); res.json({ ok: true });
}));
/** All my notes of one course in one request (used when saving a whole course for offline reading). */
courseStudent.get("/courses/:id/my-notes", wrap(async (req, res) => {
  const c = await prisma.course.findFirst({ where: { OR: [{ id: req.params.id }, { slug: req.params.id }] }, select: { id: true } }); if (!c) throw fail(404, "Course not found.");
  res.json((await prisma.lessonNote.findMany({ where: { userId: req.user!.id, lesson: { courseId: c.id } }, orderBy: [{ atSec: "asc" }], take: 2000 })).map(pub));
}));

// ---- web push ----
courseStudent.get("/push/key", (_req, res) => res.json({ key: pushPublicKey() }));
courseStudent.post("/push/subscribe", wrap(async (req, res) => {
  const b = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }) }).parse(req.body);
  if (!/^https:\/\//.test(b.endpoint)) throw fail(400, "Invalid subscription.");
  await prisma.pushSubscription.upsert({ where: { endpoint: b.endpoint }, create: { userId: req.user!.id, endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth }, update: { userId: req.user!.id, p256dh: b.keys.p256dh, auth: b.keys.auth } });
  res.json({ ok: true });
}));
courseStudent.post("/push/unsubscribe", wrap(async (req, res) => {
  await prisma.pushSubscription.deleteMany({ where: { endpoint: z.string().max(1000).parse(req.body?.endpoint), userId: req.user!.id } }); res.json({ ok: true });
}));

// ---- resume where you stopped ----
courseStudent.put("/lessons/:lid/position", wrap(async (req, res) => {
  const l = await openLesson(req, req.params.lid), sec = z.coerce.number().int().min(0).max(86_400).parse(req.body?.sec);
  await prisma.lessonPosition.upsert({ where: { userId_lessonId: { userId: req.user!.id, lessonId: l.id } }, create: { userId: req.user!.id, lessonId: l.id, sec }, update: { sec } });
  res.json({ ok: true });
}));

// ---- doubts: students ask under a lesson; classmates, the teacher and the AI tutor can answer ----
const doubtOut = (d: any, me: string) => ({ id: d.id, text: d.text, atSec: d.atSec, resolved: d.resolved, at: d.createdAt, by: reviewerName(d.user), mine: d.userId === me,
  replies: d.replies.map((r: any) => ({ id: r.id, kind: r.kind, text: r.text, at: r.createdAt, by: r.kind === "AI" ? "AI tutor" : r.kind === "TEACHER" ? "Teacher" : reviewerName(r.user!), mine: r.userId === me })) });
const doubtInclude = { user: { select: { name: true, displayName: true } }, replies: { orderBy: { createdAt: "asc" as const }, include: { user: { select: { name: true, displayName: true } } } } };

courseStudent.get("/lessons/:lid/doubts", wrap(async (req, res) => {
  const l = await openLesson(req, req.params.lid);
  res.json((await prisma.doubt.findMany({ where: { lessonId: l.id }, orderBy: { createdAt: "desc" }, take: 40, include: doubtInclude })).map((d: any) => doubtOut(d, req.user!.id)));
}));
courseStudent.post("/lessons/:lid/doubts", wrap(async (req, res) => {
  const l = await openLesson(req, req.params.lid), b = z.object({ text: z.string().trim().min(5, "Write your doubt in a few words.").max(1500), atSec: z.coerce.number().int().min(0).max(86_400).default(0) }).parse(req.body);
  if ((await prisma.doubt.count({ where: { userId: req.user!.id, createdAt: { gt: new Date(Date.now() - 3600_000) } } })) >= 10) throw fail(429, "You asked many doubts in the last hour. Please wait a little.");
  const d = await prisma.doubt.create({ data: { courseId: l.courseId, lessonId: l.id, userId: req.user!.id, text: b.text, atSec: b.atSec }, include: doubtInclude });
  res.json(doubtOut(d, req.user!.id));
}));
courseStudent.post("/doubts/:id/replies", wrap(async (req, res) => {
  const d = await prisma.doubt.findUnique({ where: { id: req.params.id } }); if (!d) throw fail(404, "Doubt not found.");
  await openLesson(req, d.lessonId); const text = z.string().trim().min(2).max(1500).parse(req.body?.text), staff = isAdmin(req);
  await prisma.doubtReply.create({ data: { doubtId: d.id, userId: req.user!.id, kind: staff ? "TEACHER" : "STUDENT", text } });
  if (staff) await prisma.doubt.update({ where: { id: d.id }, data: { resolved: true } });
  if (d.userId !== req.user!.id) void notifyUsers([d.userId], { title: staff ? "Teacher answered your doubt" : "Someone answered your doubt", body: text.slice(0, 100), url: `/courses/${d.courseId}?lesson=${d.lessonId}`, tag: `doubt-${d.id}` });
  res.json(doubtOut(await prisma.doubt.findUniqueOrThrow({ where: { id: d.id }, include: doubtInclude }), req.user!.id));
}));
courseStudent.post("/doubts/:id/resolve", wrap(async (req, res) => {
  const d = await prisma.doubt.findUnique({ where: { id: req.params.id } }); if (!d || (d.userId !== req.user!.id && !isAdmin(req))) throw fail(404, "Doubt not found.");
  await prisma.doubt.update({ where: { id: d.id }, data: { resolved: req.body?.resolved !== false } }); res.json({ ok: true });
}));
courseStudent.delete("/doubts/:id", wrap(async (req, res) => {
  const d = await prisma.doubt.findUnique({ where: { id: req.params.id } }); if (!d || (d.userId !== req.user!.id && !isAdmin(req))) throw fail(404, "Doubt not found.");
  await prisma.doubt.delete({ where: { id: d.id } }); res.json({ ok: true });
}));
/** The student who asked can ask the AI tutor once per doubt. The answer is saved under the doubt so everyone can read it. */
courseStudent.post("/doubts/:id/ai", wrap(async (req, res) => {
  const d = await prisma.doubt.findUnique({ where: { id: req.params.id }, include: { lesson: { select: { title: true } }, replies: { select: { kind: true } } } }); if (!d || d.userId !== req.user!.id) throw fail(404, "Doubt not found.");
  if (!aiConfigured()) throw fail(400, "The AI tutor is not switched on yet.");
  if (d.replies.some((r: any) => r.kind === "AI")) throw fail(400, "The AI tutor already answered this doubt.");
  const lang = req.body?.lang === "hi" ? "hi" : "en";
  if (!(await takeQuota(req.user!.id, dayKey()))) throw fail(429, QUOTA_NOTE(lang, AI_DAILY_CAP));
  let text = ""; try { text = await callModel({ text: `Lecture: "${d.lesson.title}". The student's doubt: ${d.text}`, options: [], correctKey: null, lang }); } catch (e: any) { console.error("AI doubt failed:", e?.message); throw fail(502, BUSY_NOTE[lang]); }
  if (!text) throw fail(502, BUSY_NOTE[lang]);
  await prisma.doubtReply.create({ data: { doubtId: d.id, userId: null, kind: "AI", text } });
  res.json(doubtOut(await prisma.doubt.findUniqueOrThrow({ where: { id: d.id }, include: doubtInclude }), req.user!.id));
}));
