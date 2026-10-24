import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, requireAdmin, type AuthedReq } from "../middleware/auth";
import { wrap, fail } from "./util";
import { youtubeId } from "../services/youtube";

/** Video courses: the admin builds a course (poster, price, subjects, YouTube lessons, notes); students enroll and watch.
 *  Lesson video + notes are only ever sent to enrolled students (or free-preview lessons, or the admin). */
export const courses = Router(); courses.use(requireAuth);

const poster = z.string().trim().max(700_000).refine((v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp);base64,/i.test(v), "Poster must be an image URL or an uploaded image.");
const httpUrl = z.string().trim().max(500).refine((v) => /^https?:\/\//i.test(v), "Must be a link starting with http:// or https://");
const courseBody = z.object({
  title: z.string().trim().min(2).max(120), description: z.string().trim().max(4000).nullish(), posterUrl: poster.nullish().or(z.literal("")),
  examName: z.string().trim().max(80).nullish(), priceInr: z.coerce.number().int().min(0).max(1_000_000).default(0), paymentInfo: z.string().trim().max(500).nullish(),
  published: z.boolean().optional(), featured: z.boolean().optional(),
});
const lessonBody = z.object({
  title: z.string().trim().min(2).max(160), video: z.string().trim().max(300).nullish(), notes: z.string().max(30_000).nullish(), notesUrl: httpUrl.nullish().or(z.literal("")),
  durationMin: z.coerce.number().int().min(0).max(1000).nullish().or(z.literal("")), isPreview: z.boolean().optional(),
});
const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);

const isAdmin = (req: AuthedReq) => req.user?.role === "ADMIN";
const progressPct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

/** What may this person open? Admin and ACTIVE enrollment see everything; others see only preview lessons. */
async function access(req: AuthedReq, courseId: string) {
  if (isAdmin(req)) return { full: true, status: "ACTIVE" as const };
  const e = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId } } });
  return { full: e?.status === "ACTIVE", status: e?.status ?? null, ref: e?.paymentRef ?? null };
}

// ---------------------------------------------------------------- student

courses.get("/courses", wrap(async (req, res) => {
  const userId = req.user!.id;
  const rows = await prisma.course.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 100,
    select: { id: true, title: true, description: true, posterUrl: true, examName: true, priceInr: true, featured: true, _count: { select: { lessons: true, subjects: true, enrollments: true } } } });
  const ids = rows.map((r) => r.id);
  const [mine, done] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId, courseId: { in: ids } }, select: { courseId: true, status: true } }),
    prisma.lessonProgress.findMany({ where: { userId, lesson: { courseId: { in: ids } } }, select: { lesson: { select: { courseId: true } } } }),
  ]);
  const st = new Map(mine.map((m) => [m.courseId, m.status])), dn = new Map<string, number>();
  for (const d of done) dn.set(d.lesson.courseId, (dn.get(d.lesson.courseId) ?? 0) + 1);
  res.json(rows.map(({ _count, ...c }) => ({ ...c, lessonCount: _count.lessons, subjectCount: _count.subjects, students: _count.enrollments, enrollment: st.get(c.id) ?? null, progress: st.get(c.id) === "ACTIVE" ? progressPct(dn.get(c.id) ?? 0, _count.lessons) : 0 })));
}));

courses.get("/courses/:id", wrap(async (req, res) => {
  const c = await prisma.course.findUnique({ where: { id: req.params.id }, include: { subjects: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true, durationMin: true, isPreview: true, notesUrl: true, youtubeId: true } } } } } });
  if (!c || (!c.published && !isAdmin(req))) throw fail(404, "Course not found.");
  const a = await access(req, c.id);
  const [dn, wn] = await Promise.all([prisma.lessonProgress.findMany({ where: { userId: req.user!.id, lesson: { courseId: c.id } }, select: { lessonId: true } }), prisma.lesson.findMany({ where: { courseId: c.id, notes: { not: null } }, select: { id: true } })]);
  const done = new Set(dn.map((d) => d.lessonId)), withNotes = new Set(wn.map((d) => d.id));
  let total = 0, got = 0;
  const subjects = c.subjects.map((s) => ({ id: s.id, name: s.name, lessons: s.lessons.map((l) => { total++; if (done.has(l.id)) got++; return {
    id: l.id, title: l.title, durationMin: l.durationMin, isPreview: l.isPreview, hasVideo: !!l.youtubeId, hasNotes: withNotes.has(l.id) || !!l.notesUrl, done: done.has(l.id), locked: !a.full && !l.isPreview }; }) }));
  res.json({ id: c.id, title: c.title, description: c.description, posterUrl: c.posterUrl, examName: c.examName, priceInr: c.priceInr, paymentInfo: a.full ? null : c.paymentInfo,
    enrollment: a.status, paymentRef: (a as any).ref ?? null, progress: progressPct(got, total), lessonCount: total, subjects });
}));

courses.get("/courses/:id/lessons/:lid", wrap(async (req, res) => {
  const l = await prisma.lesson.findFirst({ where: { id: req.params.lid, courseId: req.params.id }, include: { course: { select: { published: true } } } });
  if (!l || (!l.course.published && !isAdmin(req))) throw fail(404, "Lesson not found.");
  const a = await access(req, l.courseId);
  if (!a.full && !l.isPreview) throw fail(403, "Enroll in this course to watch this lesson.");
  const done = !!(await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: req.user!.id, lessonId: l.id } } }));
  res.json({ id: l.id, title: l.title, youtubeId: l.youtubeId, notes: l.notes, notesUrl: l.notesUrl, durationMin: l.durationMin, done });
}));

courses.post("/courses/:id/enroll", wrap(async (req, res) => {
  const userId = req.user!.id, c = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!c || !c.published) throw fail(404, "Course not found.");
  const old = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: c.id } } });
  if (old?.status === "ACTIVE") return res.json({ status: "ACTIVE" });
  if (c.priceInr <= 0) { await prisma.enrollment.upsert({ where: { userId_courseId: { userId, courseId: c.id } }, create: { userId, courseId: c.id, status: "ACTIVE", amountInr: 0 }, update: { status: "ACTIVE" } }); return res.json({ status: "ACTIVE" }); }
  // Paid course: the student pays (UPI etc.) and sends the transaction id; the admin checks it and approves.
  const ref = z.string().trim().min(4, "Enter the payment / UPI transaction ID.").max(80).parse(req.body?.paymentRef);
  await prisma.enrollment.upsert({ where: { userId_courseId: { userId, courseId: c.id } }, create: { userId, courseId: c.id, status: "PENDING", amountInr: c.priceInr, paymentRef: ref }, update: { paymentRef: ref, amountInr: c.priceInr } });
  res.json({ status: "PENDING" });
}));

courses.post("/courses/lessons/:lid/done", wrap(async (req, res) => {
  const userId = req.user!.id, l = await prisma.lesson.findUnique({ where: { id: req.params.lid } });
  if (!l) throw fail(404, "Lesson not found.");
  if (!(await access(req, l.courseId)).full && !l.isPreview) throw fail(403, "Enroll in this course first.");
  if (req.body?.done === false) await prisma.lessonProgress.deleteMany({ where: { userId, lessonId: l.id } });
  else await prisma.lessonProgress.upsert({ where: { userId_lessonId: { userId, lessonId: l.id } }, create: { userId, lessonId: l.id }, update: {} });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------- admin

const admin = Router(); admin.use(requireAdmin); courses.use("/admin", admin);

admin.get("/courses", wrap(async (_req, res) => {
  const rows = await prisma.course.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { lessons: true, subjects: true } }, enrollments: { select: { status: true } } } });
  res.json(rows.map(({ enrollments, _count, ...c }) => ({ ...c, lessonCount: _count.lessons, subjectCount: _count.subjects, students: enrollments.filter((e) => e.status === "ACTIVE").length, pending: enrollments.filter((e) => e.status === "PENDING").length })));
}));
admin.post("/courses", wrap(async (req, res) => {
  const b = courseBody.parse(req.body);
  res.json(await prisma.course.create({ data: { title: b.title, description: clean(b.description), posterUrl: clean(b.posterUrl), examName: clean(b.examName), priceInr: b.priceInr, paymentInfo: clean(b.paymentInfo), published: !!b.published, featured: b.featured ?? true } }));
}));
admin.get("/courses/:id", wrap(async (req, res) => {
  const c = await prisma.course.findUnique({ where: { id: req.params.id }, include: { subjects: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } } } });
  if (!c) throw fail(404, "Course not found."); res.json(c);
}));
admin.put("/courses/:id", wrap(async (req, res) => {
  const b = courseBody.parse(req.body);
  res.json(await prisma.course.update({ where: { id: req.params.id }, data: { title: b.title, description: clean(b.description), posterUrl: clean(b.posterUrl), examName: clean(b.examName), priceInr: b.priceInr, paymentInfo: clean(b.paymentInfo), ...(b.published !== undefined && { published: b.published }), ...(b.featured !== undefined && { featured: b.featured }) } }));
}));
admin.delete("/courses/:id", wrap(async (req, res) => { await prisma.course.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));

const nextPos = async (where: { courseId: string } | { subjectId: string }, model: "courseSubject" | "lesson") =>
  ((await (prisma[model] as any).aggregate({ where, _max: { position: true } }))._max.position ?? -1) + 1;

admin.post("/courses/:id/subjects", wrap(async (req, res) => {
  const name = z.string().trim().min(1).max(80).parse(req.body?.name);
  if (!(await prisma.course.findUnique({ where: { id: req.params.id }, select: { id: true } }))) throw fail(404, "Course not found.");
  res.json(await prisma.courseSubject.create({ data: { courseId: req.params.id, name, position: await nextPos({ courseId: req.params.id }, "courseSubject") } }));
}));
admin.put("/subjects/:id", wrap(async (req, res) => { res.json(await prisma.courseSubject.update({ where: { id: req.params.id }, data: { name: z.string().trim().min(1).max(80).parse(req.body?.name) } })); }));
admin.delete("/subjects/:id", wrap(async (req, res) => { await prisma.courseSubject.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));

const lessonData = (b: z.infer<typeof lessonBody>) => {
  const video = clean(b.video), id = video ? youtubeId(video) : null;
  if (video && !id) throw fail(400, "That does not look like a YouTube link. Paste the video URL (youtube.com/watch?v=… or youtu.be/…).");
  return { title: b.title, youtubeId: id, notes: clean(b.notes), notesUrl: clean(b.notesUrl), durationMin: b.durationMin === "" || b.durationMin == null ? null : b.durationMin, isPreview: !!b.isPreview };
};
admin.post("/subjects/:id/lessons", wrap(async (req, res) => {
  const s = await prisma.courseSubject.findUnique({ where: { id: req.params.id } }); if (!s) throw fail(404, "Subject not found.");
  res.json(await prisma.lesson.create({ data: { ...lessonData(lessonBody.parse(req.body)), courseId: s.courseId, subjectId: s.id, position: await nextPos({ subjectId: s.id }, "lesson") } }));
}));
admin.put("/lessons/:id", wrap(async (req, res) => { res.json(await prisma.lesson.update({ where: { id: req.params.id }, data: lessonData(lessonBody.parse(req.body)) })); }));
admin.delete("/lessons/:id", wrap(async (req, res) => { await prisma.lesson.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));

/** Move a subject or lesson one step up/down by swapping positions with its neighbour. */
admin.post("/:kind(subjects|lessons)/:id/move", wrap(async (req, res) => {
  const dir = req.body?.dir === "up" ? -1 : 1, isSub = req.params.kind === "subjects";
  const m: any = isSub ? prisma.courseSubject : prisma.lesson;
  const cur = await m.findUnique({ where: { id: req.params.id } }); if (!cur) throw fail(404, "Not found.");
  const sibs: { id: string }[] = await m.findMany({ where: isSub ? { courseId: cur.courseId } : { subjectId: cur.subjectId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } });
  const i = sibs.findIndex((s) => s.id === cur.id), j = i + dir; if (j < 0 || j >= sibs.length) return res.json({ ok: true });
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  await prisma.$transaction(sibs.map((s, p) => m.update({ where: { id: s.id }, data: { position: p } })));
  res.json({ ok: true });
}));

admin.get("/courses/:id/enrollments", wrap(async (req, res) => {
  const rows = await prisma.enrollment.findMany({ where: { courseId: req.params.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500, include: { user: { select: { name: true, email: true, username: true } } } });
  res.json(rows.map((e) => ({ id: e.id, status: e.status, amountInr: e.amountInr, paymentRef: e.paymentRef, createdAt: e.createdAt, name: e.user.name, email: e.user.email })));
}));
admin.post("/enrollments/:id/approve", wrap(async (req, res) => { await prisma.enrollment.update({ where: { id: req.params.id }, data: { status: "ACTIVE" } }); res.json({ ok: true }); }));
admin.delete("/enrollments/:id", wrap(async (req, res) => { await prisma.enrollment.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));
