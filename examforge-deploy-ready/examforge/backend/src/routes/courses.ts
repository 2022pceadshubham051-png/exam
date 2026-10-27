import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, requireAdmin, type AuthedReq } from "../middleware/auth";
import { wrap, fail } from "./util";
import { youtubeId } from "../services/youtube"; import { bunnyId, bunnySrc, bunnyDownload } from "../services/bunny"; import { playlistId, fetchPlaylist } from "../services/youtubePlaylist";
import { couponProblem, discountFor, normalizeCode } from "../services/courses/coupons"; import { slugify, uniqueSlug, SLUG_RE } from "../services/courses/slug"; import { placeAt, sameSet } from "../services/courses/order"; import { notifyUsers } from "../services/push";

/** Video courses: the admin builds a course (poster, price, subjects, YouTube lessons, notes); students enroll and watch.
 *  Lesson video + notes are only ever sent to enrolled students (or free-preview lessons, or the admin). */
export const courses = Router(); courses.use(requireAuth);

const poster = z.string().trim().max(700_000).refine((v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp);base64,/i.test(v), "Poster must be an image URL or an uploaded image.");
const httpUrl = z.string().trim().max(500).refine((v) => /^https?:\/\//i.test(v), "Must be a link starting with http:// or https://");
const courseBody = z.object({
  title: z.string().trim().min(2).max(120), description: z.string().trim().max(4000).nullish(), posterUrl: poster.nullish().or(z.literal("")),
  examName: z.string().trim().max(80).nullish(), priceInr: z.coerce.number().int().min(0).max(1_000_000).default(0), paymentInfo: z.string().trim().max(500).nullish(),
  published: z.boolean().optional(), featured: z.boolean().optional(),
  slug: z.string().trim().toLowerCase().max(60).regex(SLUG_RE, "Web address can only use a-z, 0-9 and dashes.").nullish().or(z.literal("")),
  seoTitle: z.string().trim().max(70).nullish(), seoDescription: z.string().trim().max(200).nullish(),
});
const lessonBody = z.object({
  testId: z.string().trim().max(40).nullish().or(z.literal("")), title: z.string().trim().min(2).max(160), video: z.string().trim().max(300).nullish(), notes: z.string().max(30_000).nullish(), notesUrl: httpUrl.nullish().or(z.literal("")),
  durationMin: z.coerce.number().int().min(0).max(1000).nullish().or(z.literal("")), isPreview: z.boolean().optional(),
});
const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);

export const isAdmin = (req: AuthedReq) => req.user?.role === "ADMIN";
const progressPct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

/** What may this person open? Admin and ACTIVE enrollment see everything; others see only preview lessons. */
export async function access(req: AuthedReq, courseId: string) {
  if (isAdmin(req)) return { full: true, status: "ACTIVE" as const };
  const e = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId } } });
  return { full: e?.status === "ACTIVE", status: e?.status ?? null, ref: e?.paymentRef ?? null };
}

/** Average rating and count per course id. */
export async function ratingsFor(courseIds: string[]) {
  const rows = courseIds.length ? await prisma.courseReview.groupBy({ by: ["courseId"], where: { courseId: { in: courseIds } }, _avg: { rating: true }, _count: { _all: true } }) : [];
  return new Map<string, { avg: number; count: number }>(rows.map((r: any) => [r.courseId, { avg: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count._all }]));
}
/** Display name for public reviews: first name + last initial only. */
export const reviewerName = (u: { name: string; displayName: string | null }) => { const n = (u.displayName || u.name || "Student").trim().split(/\s+/); return n.length > 1 ? `${n[0]} ${n[n.length - 1][0]}.` : n[0]; };
const byIdOrSlug = (key: string) => ({ OR: [{ id: key }, { slug: key }] });

// ---------------------------------------------------------------- student

courses.get("/courses", wrap(async (req, res) => {
  const userId = req.user!.id;
  const rows = await prisma.course.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 100,
    select: { id: true, slug: true, title: true, description: true, posterUrl: true, examName: true, priceInr: true, featured: true, _count: { select: { lessons: true, subjects: true, enrollments: true } } } });
  const ids = rows.map((r) => r.id);
  const [mine, done, rt] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId, courseId: { in: ids } }, select: { courseId: true, status: true } }),
    prisma.lessonProgress.findMany({ where: { userId, lesson: { courseId: { in: ids } } }, select: { lesson: { select: { courseId: true } } } }),
    ratingsFor(ids),
  ]);
  const st = new Map(mine.map((m) => [m.courseId, m.status])), dn = new Map<string, number>();
  for (const d of done) dn.set(d.lesson.courseId, (dn.get(d.lesson.courseId) ?? 0) + 1);
  res.json(rows.map(({ _count, ...c }) => ({ ...c, rating: rt.get(c.id)?.avg ?? 0, ratingCount: rt.get(c.id)?.count ?? 0, lessonCount: _count.lessons, subjectCount: _count.subjects, students: _count.enrollments, enrollment: st.get(c.id) ?? null, progress: st.get(c.id) === "ACTIVE" ? progressPct(dn.get(c.id) ?? 0, _count.lessons) : 0 })));
}));

courses.get("/courses/:id", wrap(async (req, res) => {
  const c = await prisma.course.findFirst({ where: byIdOrSlug(req.params.id), include: { subjects: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true, durationMin: true, isPreview: true, notesUrl: true, youtubeId: true, bunnyId: true, testId: true } } } } } });
  if (!c || (!c.published && !isAdmin(req))) throw fail(404, "Course not found.");
  const a = await access(req, c.id);
  // Quiz "signals" on the route: a test attached to a lesson (hold after it) or to a whole subject (hold at the end of it). `taken` = the student has submitted it at least once.
  const testIds = [...new Set(c.subjects.flatMap((s) => [s.testId, ...s.lessons.map((l) => l.testId)]).filter((x): x is string => !!x))];
  const [tests, tried] = testIds.length ? await Promise.all([
    prisma.test.findMany({ where: { id: { in: testIds }, published: true }, select: { id: true, name: true } }),
    prisma.testAttempt.findMany({ where: { userId: req.user!.id, testId: { in: testIds }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } }, select: { testId: true }, distinct: ["testId"] })]) : [[], []];
  const testBy = new Map(tests.map((t) => [t.id, t.name])), takenSet = new Set(tried.map((t) => t.testId));
  const quizOf = (id: string | null) => (id && testBy.has(id) ? { id, name: testBy.get(id)!, taken: takenSet.has(id) } : null);
  const [dn, wn] = await Promise.all([prisma.lessonProgress.findMany({ where: { userId: req.user!.id, lesson: { courseId: c.id } }, select: { lessonId: true } }), prisma.lesson.findMany({ where: { courseId: c.id, notes: { not: null } }, select: { id: true } })]);
  const done = new Set(dn.map((d) => d.lessonId)), withNotes = new Set(wn.map((d) => d.id));
  let total = 0, got = 0;
  const subjects = c.subjects.map((s) => ({ id: s.id, name: s.name, theme: s.theme ?? null, quiz: quizOf(s.testId), lessons: s.lessons.map((l) => { total++; if (done.has(l.id)) got++; return {
    id: l.id, title: l.title, durationMin: l.durationMin, isPreview: l.isPreview, hasVideo: !!(l.youtubeId || l.bunnyId), hasNotes: withNotes.has(l.id) || !!l.notesUrl, done: done.has(l.id), locked: !a.full && !l.isPreview, quiz: quizOf(l.testId) }; }) }));
  const [rt, revs, mine] = await Promise.all([ratingsFor([c.id]),
    prisma.courseReview.findMany({ where: { courseId: c.id }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true, displayName: true } } } }),
    prisma.courseReview.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: c.id } } })]);
  res.json({ id: c.id, slug: c.slug, title: c.title, description: c.description, posterUrl: c.posterUrl, examName: c.examName, priceInr: c.priceInr, paymentInfo: a.full ? null : c.paymentInfo,
    seoTitle: c.seoTitle, seoDescription: c.seoDescription, enrollment: a.status, paymentRef: (a as any).ref ?? null, progress: progressPct(got, total), lessonCount: total, subjects,
    rating: rt.get(c.id)?.avg ?? 0, ratingCount: rt.get(c.id)?.count ?? 0, canReview: a.status === "ACTIVE" && !isAdmin(req),
    myReview: mine ? { rating: mine.rating, text: mine.text } : null, reviews: revs.map((r: any) => ({ rating: r.rating, text: r.text, by: reviewerName(r.user), at: r.createdAt, mine: r.userId === req.user!.id })) });
}));

courses.get("/courses/:id/lessons/:lid", wrap(async (req, res) => {
  const l = await prisma.lesson.findFirst({ where: { id: req.params.lid, course: byIdOrSlug(req.params.id) }, include: { course: { select: { published: true } }, subject: { select: { testId: true } } } });
  if (!l || (!l.course.published && !isAdmin(req))) throw fail(404, "Lesson not found.");
  const a = await access(req, l.courseId);
  if (!a.full && !l.isPreview) throw fail(403, "Enroll in this course to watch this lesson.");
  const done = !!(await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: req.user!.id, lessonId: l.id } } }));
  // The watermark text comes from the server (never from the browser), so a student cannot change whose name is shown on the video.
  const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, displayName: true, email: true, username: true } });
  const watermark = me ? `${me.displayName || me.name} · ${me.email.includes("@") ? me.email : me.username ?? ""}` : "";
  const [pos, quiz] = await Promise.all([prisma.lessonPosition.findUnique({ where: { userId_lessonId: { userId: req.user!.id, lessonId: l.id } } }),
    (l.testId ?? l.subject.testId) ? prisma.test.findFirst({ where: { id: (l.testId ?? l.subject.testId)!, published: true }, select: { id: true, name: true } }) : null]);
  res.json({ resumeSec: pos && pos.sec > 5 ? pos.sec : 0, quiz, id: l.id, title: l.title, youtubeId: l.youtubeId, bunnySrc: l.bunnyId ? bunnySrc(l.bunnyId) : null, download: l.bunnyId ? bunnyDownload(l.bunnyId) : null, notes: l.notes, notesUrl: l.notesUrl, durationMin: l.durationMin, done, watermark, courseId: l.courseId });
}));

/** Price after an optional coupon. Throws a 400 with a student-friendly message when the code cannot be used. */
export async function priceWithCoupon(course: { id: string; priceInr: number }, rawCode?: string | null) {
  const code = rawCode ? normalizeCode(rawCode) : "";
  if (!code) return { coupon: null as any, discount: 0, final: course.priceInr };
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const why = couponProblem(coupon, course.id); if (why) throw fail(400, why);
  const discount = discountFor(course.priceInr, coupon!);
  return { coupon: coupon!, discount, final: course.priceInr - discount };
}
/** Takes one use of the coupon, atomically (two students cannot both take the last use). */
async function takeCoupon(c: { id: string; maxUses: number | null }) {
  const r = await prisma.coupon.updateMany({ where: { id: c.id, ...(c.maxUses != null ? { used: { lt: c.maxUses } } : {}) }, data: { used: { increment: 1 } } });
  if (r.count !== 1) throw fail(400, "This coupon has been fully used.");
}
export const giveCouponBack = (code?: string | null) => code ? prisma.coupon.updateMany({ where: { code, used: { gt: 0 } }, data: { used: { decrement: 1 } } }).catch(() => {}) : Promise.resolve();

courses.post("/courses/:id/enroll", wrap(async (req, res) => {
  const userId = req.user!.id, c = await prisma.course.findFirst({ where: byIdOrSlug(req.params.id) });
  if (!c || !c.published) throw fail(404, "Course not found.");
  const old = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: c.id } } });
  if (old?.status === "ACTIVE") return res.json({ status: "ACTIVE" });
  const price = await priceWithCoupon(c, req.body?.coupon);
  if (old?.status === "PENDING" && old.couponCode) await giveCouponBack(old.couponCode); // re-submitting: the earlier coupon use is released
  if (price.coupon) await takeCoupon(price.coupon);
  const meta = { couponCode: price.coupon?.code ?? null, discountInr: price.discount };
  // Free course, or a coupon that makes it free: enrolled immediately.
  if (price.final <= 0) { await prisma.enrollment.upsert({ where: { userId_courseId: { userId, courseId: c.id } }, create: { userId, courseId: c.id, status: "ACTIVE", amountInr: 0, approvedAt: new Date(), ...meta }, update: { status: "ACTIVE", amountInr: 0, approvedAt: new Date(), ...meta } }); return res.json({ status: "ACTIVE" }); }
  // Paid course: the student pays (UPI etc.) the discounted amount and sends the transaction id; the admin checks it and approves.
  const ref = z.string().trim().min(4, "Enter the payment / UPI transaction ID.").max(80).parse(req.body?.paymentRef);
  await prisma.enrollment.upsert({ where: { userId_courseId: { userId, courseId: c.id } }, create: { userId, courseId: c.id, status: "PENDING", amountInr: price.final, paymentRef: ref, ...meta }, update: { paymentRef: ref, amountInr: price.final, ...meta } });
  res.json({ status: "PENDING", amountInr: price.final });
}));

/** Student asks "what would I pay with this code?" before paying. */
courses.post("/courses/:id/coupon", wrap(async (req, res) => {
  const c = await prisma.course.findFirst({ where: byIdOrSlug(req.params.id) }); if (!c || !c.published) throw fail(404, "Course not found.");
  const p = await priceWithCoupon(c, z.string().trim().min(1).max(40).parse(req.body?.code));
  res.json({ code: p.coupon.code, discountInr: p.discount, finalInr: p.final, percentOff: p.coupon.percentOff, flatOff: p.coupon.flatOff, expiresAt: p.coupon.expiresAt });
}));

/** One review per student per course, only for enrolled students. */
courses.put("/courses/:id/review", wrap(async (req, res) => {
  const userId = req.user!.id, c = await prisma.course.findFirst({ where: byIdOrSlug(req.params.id), select: { id: true } }); if (!c) throw fail(404, "Course not found.");
  if (!(await access(req, c.id)).full || isAdmin(req)) throw fail(403, "Only enrolled students can review a course.");
  const b = z.object({ rating: z.coerce.number().int().min(1).max(5), text: z.string().trim().max(1000).nullish() }).parse(req.body);
  const data = { rating: b.rating, text: b.text ? b.text : null };
  await prisma.courseReview.upsert({ where: { userId_courseId: { userId, courseId: c.id } }, create: { userId, courseId: c.id, ...data }, update: data });
  res.json({ ok: true });
}));
courses.delete("/courses/:id/review", wrap(async (req, res) => {
  const c = await prisma.course.findFirst({ where: byIdOrSlug(req.params.id), select: { id: true } }); if (!c) throw fail(404, "Course not found.");
  await prisma.courseReview.deleteMany({ where: { userId: req.user!.id, courseId: c.id } }); res.json({ ok: true });
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
  // Courses made before web addresses existed get one the first time the admin opens this list.
  for (const m of await prisma.course.findMany({ where: { slug: null }, select: { id: true, title: true } })) await prisma.course.update({ where: { id: m.id }, data: { slug: await uniqueSlug(slugify(m.title), slugTaken(m.id)) } });
  const rows = await prisma.course.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { lessons: true, subjects: true } }, enrollments: { select: { status: true } } } });
  res.json(rows.map(({ enrollments, _count, ...c }) => ({ ...c, lessonCount: _count.lessons, subjectCount: _count.subjects, students: enrollments.filter((e) => e.status === "ACTIVE").length, pending: enrollments.filter((e) => e.status === "PENDING").length })));
}));
const slugTaken = (except?: string) => async (slug: string) => !!(await prisma.course.findFirst({ where: { slug, ...(except ? { id: { not: except } } : {}) }, select: { id: true } }));
admin.post("/courses", wrap(async (req, res) => {
  const b = courseBody.parse(req.body);
  if (b.slug && (await slugTaken()(b.slug))) throw fail(409, "That web address is already used by another course.");
  const slug = b.slug || await uniqueSlug(slugify(b.title), slugTaken());
  res.json(await prisma.course.create({ data: { title: b.title, description: clean(b.description), posterUrl: clean(b.posterUrl), examName: clean(b.examName), priceInr: b.priceInr, paymentInfo: clean(b.paymentInfo), published: !!b.published, featured: b.featured ?? true, slug, seoTitle: clean(b.seoTitle), seoDescription: clean(b.seoDescription) } }));
}));
admin.get("/courses/:id", wrap(async (req, res) => {
  const c = await prisma.course.findUnique({ where: { id: req.params.id }, include: { subjects: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } } } });
  if (!c) throw fail(404, "Course not found."); res.json(c);
}));
admin.put("/courses/:id", wrap(async (req, res) => {
  const b = courseBody.parse(req.body);
  if (b.slug && (await slugTaken(req.params.id)(b.slug))) throw fail(409, "That web address is already used by another course.");
  res.json(await prisma.course.update({ where: { id: req.params.id }, data: { title: b.title, description: clean(b.description), posterUrl: clean(b.posterUrl), examName: clean(b.examName), priceInr: b.priceInr, paymentInfo: clean(b.paymentInfo), ...(b.slug ? { slug: b.slug } : {}), seoTitle: clean(b.seoTitle), seoDescription: clean(b.seoDescription), ...(b.published !== undefined && { published: b.published }), ...(b.featured !== undefined && { featured: b.featured }) } }));
}));
admin.delete("/courses/:id", wrap(async (req, res) => { await prisma.course.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));

const nextPos = async (where: { courseId: string } | { subjectId: string }, model: "courseSubject" | "lesson") =>
  ((await (prisma[model] as any).aggregate({ where, _max: { position: true } }))._max.position ?? -1) + 1;

admin.post("/courses/:id/subjects", wrap(async (req, res) => {
  const name = z.string().trim().min(1).max(80).parse(req.body?.name);
  if (!(await prisma.course.findUnique({ where: { id: req.params.id }, select: { id: true } }))) throw fail(404, "Course not found.");
  res.json(await prisma.courseSubject.create({ data: { courseId: req.params.id, name, position: await nextPos({ courseId: req.params.id }, "courseSubject") } }));
}));
admin.put("/subjects/:id", wrap(async (req, res) => {
  const b = z.object({ name: z.string().trim().min(1).max(80).optional(), testId: z.string().trim().max(40).nullish().or(z.literal("")), theme: z.enum(["farm", "desert", "mountain", "snow"]).nullish().or(z.literal("")) }).parse(req.body ?? {});
  if (b.testId && !(await prisma.test.findUnique({ where: { id: b.testId }, select: { id: true } }))) throw fail(404, "That test was not found.");
  res.json(await prisma.courseSubject.update({ where: { id: req.params.id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.testId !== undefined ? { testId: clean(b.testId) } : {}), ...(b.theme !== undefined ? { theme: clean(b.theme) } : {}) } }));
}));
admin.delete("/subjects/:id", wrap(async (req, res) => { await prisma.courseSubject.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));

/** Paste a YouTube playlist link: every video becomes a lesson (title + length), in playlist order. Videos already in the target subject are skipped, so it is safe to run again after adding videos to the playlist. */
admin.post("/courses/:id/import-playlist", wrap(async (req, res) => {
  const key = process.env.YOUTUBE_API_KEY; if (!key) throw fail(400, "Playlist import is not set up: add YOUTUBE_API_KEY on the server (see DEPLOY.md).");
  const b = z.object({ url: z.string().trim().min(5).max(300), subjectId: z.string().optional().or(z.literal("")), preview: z.coerce.number().int().min(0).max(50).default(0) }).parse(req.body);
  const course = await prisma.course.findUnique({ where: { id: req.params.id }, select: { id: true } }); if (!course) throw fail(404, "Course not found.");
  const pid = playlistId(b.url); if (!pid) throw fail(400, "That is not a playlist link. It should contain list=PL… (open the playlist and copy its address).");
  let pl; try { pl = await fetchPlaylist(pid, key); } catch (e: any) { throw fail(e.status === 404 ? 404 : 400, e.reason === "quotaExceeded" ? "YouTube daily limit reached. Try again tomorrow." : e.message || "Could not read the playlist."); }
  if (!pl.videos.length) throw fail(400, "No public videos found in this playlist.");
  let subject = b.subjectId ? await prisma.courseSubject.findFirst({ where: { id: b.subjectId, courseId: course.id } }) : null; if (b.subjectId && !subject) throw fail(404, "Subject not found.");
  if (!subject) subject = await prisma.courseSubject.create({ data: { courseId: course.id, name: pl.title.slice(0, 80), position: await nextPos({ courseId: course.id }, "courseSubject") } });
  const have = new Set((await prisma.lesson.findMany({ where: { subjectId: subject.id }, select: { youtubeId: true } })).map((l: any) => l.youtubeId)), fresh = pl.videos.filter((v) => !have.has(v.videoId));
  let pos = await nextPos({ subjectId: subject.id }, "lesson");
  if (fresh.length) await prisma.lesson.createMany({ data: fresh.map((v, i) => ({ courseId: course.id, subjectId: subject!.id, title: v.title.slice(0, 160) || `Lesson ${pos + i + 1}`, youtubeId: v.videoId, durationMin: v.durationMin, isPreview: pos + i < b.preview, position: pos + i })) });
  res.json({ subjectId: subject.id, subject: subject.name, added: fresh.length, skipped: pl.videos.length - fresh.length });
}));

const lessonData = (b: z.infer<typeof lessonBody>) => {
  const video = clean(b.video), bn = video ? bunnyId(video) : null, id = video && !bn ? youtubeId(video) : null;
  if (video && !id && !bn) throw fail(400, "That does not look like a YouTube link or Bunny video. Paste the YouTube URL, or bunny:<video-id>.");
  return { testId: clean(b.testId), title: b.title, youtubeId: id, bunnyId: bn, notes: clean(b.notes), notesUrl: clean(b.notesUrl), durationMin: b.durationMin === "" || b.durationMin == null ? null : b.durationMin, isPreview: !!b.isPreview };
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

/** Drag and drop: save a whole new order of a course's subjects in one go. */
admin.post("/courses/:id/reorder-subjects", wrap(async (req, res) => {
  const ids = z.array(z.string().min(1)).min(1).max(200).parse(req.body?.ids);
  const cur = await prisma.courseSubject.findMany({ where: { courseId: req.params.id }, select: { id: true } });
  if (!sameSet(cur.map((x: any) => x.id), ids)) throw fail(409, "The subjects changed while you were dragging. Reload and try again.");
  await prisma.$transaction(ids.map((id, position) => prisma.courseSubject.update({ where: { id }, data: { position } })));
  res.json({ ok: true });
}));
/** Drag and drop: put a lecture at `index` of a subject (the same subject, or another subject of the same course). */
admin.post("/lessons/:id/place", wrap(async (req, res) => {
  const b = z.object({ subjectId: z.string().min(1), index: z.coerce.number().int().min(0).max(10_000) }).parse(req.body);
  const l = await prisma.lesson.findUnique({ where: { id: req.params.id }, select: { id: true, courseId: true, subjectId: true } }); if (!l) throw fail(404, "Lesson not found.");
  const target = await prisma.courseSubject.findUnique({ where: { id: b.subjectId }, select: { id: true, courseId: true } });
  if (!target || target.courseId !== l.courseId) throw fail(400, "A lecture can only move inside its own course.");
  const inTarget = (await prisma.lesson.findMany({ where: { subjectId: target.id }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } })).map((x: any) => x.id as string);
  const order = placeAt(inTarget, l.id, b.index), ops: any[] = order.map((id, position) => prisma.lesson.update({ where: { id }, data: id === l.id ? { position, subjectId: target.id } : { position } }));
  if (l.subjectId !== target.id) { const left = (await prisma.lesson.findMany({ where: { subjectId: l.subjectId, id: { not: l.id } }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } })).map((x: any) => x.id as string); left.forEach((id, position) => ops.push(prisma.lesson.update({ where: { id }, data: { position } }))); }
  await prisma.$transaction(ops); res.json({ ok: true });
}));
/** Drag and drop: move a quiz from one place to another. A quiz sits after a lecture or at the end of a subject; if the target already has a quiz the two swap. */
admin.post("/quiz/move", wrap(async (req, res) => {
  const spot = z.object({ kind: z.enum(["lesson", "subject"]), id: z.string().min(1) }), b = z.object({ from: spot, to: spot }).parse(req.body);
  type Spot = z.infer<typeof spot>;
  const load = async (x: Spot) => (x.kind === "lesson" ? prisma.lesson.findUnique({ where: { id: x.id }, select: { id: true, courseId: true, testId: true } }) : prisma.courseSubject.findUnique({ where: { id: x.id }, select: { id: true, courseId: true, testId: true } }));
  const [from, to] = await Promise.all([load(b.from), load(b.to)]); if (!from || !to) throw fail(404, "Not found.");
  if (from.courseId !== to.courseId) throw fail(400, "A quiz can only move inside its own course.");
  if (b.from.kind === b.to.kind && from.id === to.id) return res.json({ ok: true });
  const put = (x: Spot, testId: string | null) => (x.kind === "lesson" ? prisma.lesson.update({ where: { id: x.id }, data: { testId } }) : prisma.courseSubject.update({ where: { id: x.id }, data: { testId } }));
  await prisma.$transaction([put(b.from, to.testId), put(b.to, from.testId)]); res.json({ ok: true });
}));

admin.get("/courses/:id/enrollments", wrap(async (req, res) => {
  const rows = await prisma.enrollment.findMany({ where: { courseId: req.params.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500, include: { user: { select: { name: true, email: true, username: true } } } });
  res.json(rows.map((e) => ({ id: e.id, status: e.status, amountInr: e.amountInr, paymentRef: e.paymentRef, couponCode: e.couponCode, discountInr: e.discountInr, source: e.source, createdAt: e.createdAt, name: e.user.name, email: e.user.email })));
}));
/** Marks enrollments ACTIVE and tells the students (web push) that their course is open. Returns how many changed. */
export async function approveEnrollments(where: Record<string, any>) {
  const rows = await prisma.enrollment.findMany({ where: { ...where, status: "PENDING" }, select: { id: true, userId: true, course: { select: { id: true, title: true, slug: true } } } });
  if (!rows.length) return 0;
  await prisma.enrollment.updateMany({ where: { id: { in: rows.map((r: any) => r.id) } }, data: { status: "ACTIVE", approvedAt: new Date() } });
  await Promise.all(rows.map((r: any) => notifyUsers([r.userId], { title: "You are enrolled!", body: `${r.course.title} is now open. Start learning.`, url: `/courses/${r.course.slug ?? r.course.id}`, tag: `enroll-${r.course.id}` })));
  return rows.length;
}
admin.post("/enrollments/:id/approve", wrap(async (req, res) => { if (!(await approveEnrollments({ id: req.params.id }))) throw fail(404, "That payment is not waiting for approval."); res.json({ ok: true }); }));
admin.delete("/enrollments/:id", wrap(async (req, res) => {
  const e = await prisma.enrollment.findUnique({ where: { id: req.params.id } }); if (!e) throw fail(404, "Not found.");
  await prisma.enrollment.delete({ where: { id: e.id } }); if (e.status === "PENDING") await giveCouponBack(e.couponCode); // a rejected payment frees the coupon use
  res.json({ ok: true });
}));
