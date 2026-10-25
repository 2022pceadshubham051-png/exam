import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import { wrap, fail } from "./util"; import { access } from "./courses"; import { pushPublicKey } from "../services/push";

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
