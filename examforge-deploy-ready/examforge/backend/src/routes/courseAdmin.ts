import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, requireAdmin } from "../middleware/auth";
import { wrap, fail } from "./util"; import { approveEnrollments, ratingsFor } from "./courses";
import { couponState, normalizeCode } from "../services/courses/coupons"; import { notifyUsers, pushEnabled } from "../services/push";

/** Admin tools for courses: dashboard numbers, student list, manual / bulk enrollment, coupons, reviews, push messages. */
export const courseAdmin = Router(); courseAdmin.use("/admin", requireAuth, requireAdmin);

const TZ_MIN = Number.isFinite(+process.env.STATS_TZ_OFFSET_MIN!) && process.env.STATS_TZ_OFFSET_MIN ? +process.env.STATS_TZ_OFFSET_MIN! : 330; // IST by default
const dayKey = (d: Date) => new Date(d.getTime() + TZ_MIN * 60_000).toISOString().slice(0, 10);
const startOfDay = (d: Date) => new Date(Date.parse(dayKey(d) + "T00:00:00Z") - TZ_MIN * 60_000);
const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

// ------------------------------------------------------------ dashboard
courseAdmin.get("/admin/course-stats", wrap(async (req, res) => {
  const days = Math.min(365, Math.max(7, Math.floor(+(req.query.days as string) || 30))), now = new Date();
  const since = new Date(startOfDay(now).getTime() - (days - 1) * 86_400_000), prevSince = new Date(since.getTime() - days * 86_400_000);
  const [courses, perCourse, activeAll, pending, studentsTotal, recentEnr, recentUsers, lessons, doneAll, doneRecent] = await Promise.all([
    prisma.course.findMany({ select: { id: true, title: true, slug: true, published: true, priceInr: true } }),
    prisma.enrollment.groupBy({ by: ["courseId"], where: { status: "ACTIVE" }, _count: { _all: true }, _sum: { amountInr: true } }),
    prisma.enrollment.aggregate({ where: { status: "ACTIVE" }, _count: { _all: true }, _sum: { amountInr: true } }),
    prisma.enrollment.groupBy({ by: ["courseId"], where: { status: "PENDING" }, _count: { _all: true } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.enrollment.findMany({ where: { status: "ACTIVE", OR: [{ approvedAt: { gt: prevSince } }, { approvedAt: null, createdAt: { gt: prevSince } }] }, select: { courseId: true, amountInr: true, discountInr: true, approvedAt: true, createdAt: true } }),
    prisma.user.findMany({ where: { role: "USER", createdAt: { gt: prevSince } }, select: { createdAt: true } }),
    prisma.lesson.findMany({ select: { id: true, courseId: true } }),
    prisma.lessonProgress.groupBy({ by: ["lessonId"], _count: { _all: true } }),
    prisma.lessonProgress.groupBy({ by: ["lessonId"], where: { doneAt: { gt: since } }, _count: { _all: true } }),
  ]);
  const rt = await ratingsFor(courses.map((c: any) => c.id));
  const series = new Map<string, { day: string; revenue: number; enrollments: number; signups: number }>();
  for (let i = 0; i < days; i++) { const k = dayKey(new Date(since.getTime() + i * 86_400_000 + 3600_000)); series.set(k, { day: k, revenue: 0, enrollments: 0, signups: 0 }); }
  let revenuePeriod = 0, revenuePrev = 0, enrollPeriod = 0, enrollPrev = 0, discountPeriod = 0, newStudents = 0, newPrev = 0;
  const cPeriod = new Map<string, { revenue: number; enrollments: number }>();
  for (const e of recentEnr as any[]) {
    const at = e.approvedAt ?? e.createdAt;
    if (at >= since) { revenuePeriod += e.amountInr; enrollPeriod++; discountPeriod += e.discountInr; const s = series.get(dayKey(at)); if (s) { s.revenue += e.amountInr; s.enrollments++; } const p = cPeriod.get(e.courseId) ?? { revenue: 0, enrollments: 0 }; p.revenue += e.amountInr; p.enrollments++; cPeriod.set(e.courseId, p); }
    else { revenuePrev += e.amountInr; enrollPrev++; }
  }
  for (const u of recentUsers as any[]) { if (u.createdAt >= since) { newStudents++; const s = series.get(dayKey(u.createdAt)); if (s) s.signups++; } else newPrev++; }
  const courseOf = new Map<string, string>(lessons.map((l: any) => [l.id, l.courseId])), lessonCount = new Map<string, number>();
  for (const l of lessons as any[]) lessonCount.set(l.courseId, (lessonCount.get(l.courseId) ?? 0) + 1);
  const sumBy = (rows: any[]) => { const m = new Map<string, number>(); for (const r of rows) { const c = courseOf.get(r.lessonId); if (c) m.set(c, (m.get(c) ?? 0) + r._count._all); } return m; };
  const done = sumBy(doneAll as any[]), doneRecentBy = sumBy(doneRecent as any[]);
  const pc = new Map<string, any>((perCourse as any[]).map((r) => [r.courseId, r])), pend = new Map<string, number>((pending as any[]).map((r) => [r.courseId, r._count._all]));
  const rows = (courses as any[]).map((c) => { const students = pc.get(c.id)?._count._all ?? 0, lc = lessonCount.get(c.id) ?? 0, p = cPeriod.get(c.id);
    return { id: c.id, title: c.title, slug: c.slug, published: c.published, priceInr: c.priceInr, students, revenue: pc.get(c.id)?._sum.amountInr ?? 0, revenuePeriod: p?.revenue ?? 0, enrollmentsPeriod: p?.enrollments ?? 0, pending: pend.get(c.id) ?? 0,
      lessonCount: lc, completionPct: pct(done.get(c.id) ?? 0, students * lc), lessonsDonePeriod: doneRecentBy.get(c.id) ?? 0, rating: rt.get(c.id)?.avg ?? 0, ratingCount: rt.get(c.id)?.count ?? 0 }; })
    .sort((a, b) => b.enrollmentsPeriod - a.enrollmentsPeriod || b.lessonsDonePeriod - a.lessonsDonePeriod || b.students - a.students);
  res.json({ days, totals: { revenue: activeAll._sum.amountInr ?? 0, revenuePeriod, revenuePrev, discountPeriod, students: studentsTotal, newStudents, newStudentsPrev: newPrev, enrollmentsPeriod: enrollPeriod, enrollmentsPrev: enrollPrev, activeEnrollments: activeAll._count._all, pending: [...pend.values()].reduce((a, b) => a + b, 0) }, series: [...series.values()], courses: rows });
}));

/** Where do students stop? For every lesson: how many enrolled students finished it, and the drop from the lesson before. */
courseAdmin.get("/admin/courses/:id/dropoff", wrap(async (req, res) => {
  const c = await prisma.course.findUnique({ where: { id: req.params.id }, include: { subjects: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true } } } } } });
  if (!c) throw fail(404, "Course not found.");
  const [students, prog] = await Promise.all([prisma.enrollment.count({ where: { courseId: c.id, status: "ACTIVE" } }),
    prisma.lessonProgress.findMany({ where: { lesson: { courseId: c.id }, user: { enrollments: { some: { courseId: c.id, status: "ACTIVE" } } } }, select: { lessonId: true, userId: true } })]);
  const cnt = new Map<string, number>(), users = new Set<string>(); for (const p of prog as any[]) { cnt.set(p.lessonId, (cnt.get(p.lessonId) ?? 0) + 1); users.add(p.userId); }
  let prev: number | null = null, worst = -1, worstDrop = 0; const out: any[] = [];
  for (const s of c.subjects as any[]) for (const l of s.lessons) { const n = cnt.get(l.id) ?? 0, drop = prev != null && prev > 0 ? Math.round(((prev - n) / prev) * 100) : 0;
    if (prev != null && prev >= 3 && drop > worstDrop) { worstDrop = drop; worst = out.length; } out.push({ id: l.id, title: l.title, subject: s.name, done: n, pct: pct(n, students), dropPct: Math.max(0, drop) }); prev = n; }
  res.json({ students, started: users.size, neverStarted: Math.max(0, students - users.size), worst: worst >= 0 ? { index: worst, dropPct: worstDrop } : null, lessons: out });
}));

// ------------------------------------------------------------ students
courseAdmin.get("/admin/students", wrap(async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, 80), courseId = String(req.query.courseId ?? ""), status = String(req.query.status ?? ""), page = Math.max(1, Math.floor(+(req.query.page as string) || 1)), size = 30;
  const enr: any = {}; if (courseId) enr.courseId = courseId; if (status === "ACTIVE" || status === "PENDING") enr.status = status;
  const where: any = { role: "USER", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }] } : {}), ...(Object.keys(enr).length ? { enrollments: { some: enr } } : {}) };
  const [total, rows] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * size, take: size,
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true, enrollments: { select: { id: true, courseId: true, status: true, amountInr: true, source: true, course: { select: { title: true } } } } } })]);
  res.json({ total, page, pages: Math.max(1, Math.ceil(total / size)), rows: (rows as any[]).map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, verified: u.emailVerified, enrollments: u.enrollments.map((e: any) => ({ id: e.id, courseId: e.courseId, title: e.course.title, status: e.status, amountInr: e.amountInr, source: e.source })) })) });
}));

/** Enroll students without a payment step (cash / offline payment / scholarship). Accepts one or many emails. */
courseAdmin.post("/admin/enroll", wrap(async (req, res) => {
  const b = z.object({ courseId: z.string().min(1), emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(500), amountInr: z.coerce.number().int().min(0).max(1_000_000).default(0) }).parse({ ...req.body, emails: (req.body?.emails ?? [req.body?.email]).filter(Boolean) });
  const c = await prisma.course.findUnique({ where: { id: b.courseId }, select: { id: true, title: true, slug: true } }); if (!c) throw fail(404, "Course not found.");
  const emails = [...new Set(b.emails)], users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } }), byEmail = new Map<string, string>(users.map((u: any) => [u.email, u.id]));
  const existing = await prisma.enrollment.findMany({ where: { courseId: c.id, userId: { in: users.map((u: any) => u.id) } }, select: { userId: true, status: true } }), ex = new Map<string, string>(existing.map((e: any) => [e.userId, e.status]));
  const fresh: string[] = [], already: string[] = [], notFound = emails.filter((e) => !byEmail.has(e));
  for (const e of emails) { const id = byEmail.get(e); if (!id) continue; if (ex.get(id) === "ACTIVE") already.push(e); else fresh.push(id); }
  for (const userId of fresh) await prisma.enrollment.upsert({ where: { userId_courseId: { userId, courseId: c.id } }, create: { userId, courseId: c.id, status: "ACTIVE", amountInr: b.amountInr, source: "MANUAL", approvedAt: new Date() }, update: { status: "ACTIVE", approvedAt: new Date(), source: "MANUAL" } });
  await notifyUsers(fresh, { title: "You are enrolled!", body: `${c.title} is now open. Start learning.`, url: `/courses/${c.slug ?? c.id}`, tag: `enroll-${c.id}` });
  res.json({ enrolled: fresh.length, already, notFound });
}));

/** Approve many payments at once: a list of enrollment ids, or every pending payment of a course (or of all courses). */
courseAdmin.post("/admin/enrollments/bulk-approve", wrap(async (req, res) => {
  const b = z.object({ ids: z.array(z.string()).max(1000).optional(), courseId: z.string().optional(), all: z.boolean().optional() }).parse(req.body ?? {});
  if (!b.ids?.length && !b.courseId && !b.all) throw fail(400, "Choose which payments to approve.");
  res.json({ approved: await approveEnrollments({ ...(b.ids?.length ? { id: { in: b.ids } } : {}), ...(b.courseId ? { courseId: b.courseId } : {}) }) });
}));

// ------------------------------------------------------------ coupons
const dateOrNull = z.preprocess((v) => (v === "" || v == null ? null : new Date(v as string)), z.date().nullable().refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date"));
const couponBody = z.object({
  code: z.string().trim().min(3, "Code needs at least 3 characters.").max(24).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - and _ only."), type: z.enum(["percent", "flat"]), value: z.coerce.number().int().min(1),
  courseId: z.string().nullish().or(z.literal("")), startsAt: dateOrNull, expiresAt: dateOrNull, maxUses: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1).max(1_000_000).nullable()), active: z.boolean().default(true),
}).superRefine((b, ctx) => {
  if (b.type === "percent" && b.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Percent cannot be more than 100." });
  if (b.type === "flat" && b.value > 1_000_000) ctx.addIssue({ code: "custom", path: ["value"], message: "Amount is too large." });
  if (b.startsAt && b.expiresAt && b.expiresAt <= b.startsAt) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "End date must be after the start date." });
});
const couponData = (b: z.infer<typeof couponBody>) => ({ code: normalizeCode(b.code), percentOff: b.type === "percent" ? b.value : null, flatOff: b.type === "flat" ? b.value : null, courseId: b.courseId || null, startsAt: b.startsAt, expiresAt: b.expiresAt, maxUses: b.maxUses, active: b.active });
const couponOut = (c: any) => ({ ...c, type: c.percentOff != null ? "percent" : "flat", value: c.percentOff ?? c.flatOff, state: couponState(c), courseTitle: c.course?.title ?? null, course: undefined });

courseAdmin.get("/admin/coupons", wrap(async (_req, res) => { res.json((await prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { course: { select: { title: true } } } })).map(couponOut)); }));
courseAdmin.post("/admin/coupons", wrap(async (req, res) => {
  const d = couponData(couponBody.parse(req.body));
  if (await prisma.coupon.findUnique({ where: { code: d.code } })) throw fail(409, "A coupon with this code already exists.");
  if (d.courseId && !(await prisma.course.findUnique({ where: { id: d.courseId }, select: { id: true } }))) throw fail(404, "Course not found.");
  res.json(couponOut(await prisma.coupon.create({ data: d, include: { course: { select: { title: true } } } })));
}));
/** Edit discount, validity period, limit, course or on/off. `used` is never changed here. */
courseAdmin.put("/admin/coupons/:id", wrap(async (req, res) => {
  const d = couponData(couponBody.parse(req.body)), clash = await prisma.coupon.findUnique({ where: { code: d.code } });
  if (clash && clash.id !== req.params.id) throw fail(409, "A coupon with this code already exists.");
  res.json(couponOut(await prisma.coupon.update({ where: { id: req.params.id }, data: d, include: { course: { select: { title: true } } } })));
}));
courseAdmin.delete("/admin/coupons/:id", wrap(async (req, res) => { await prisma.coupon.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));

// ------------------------------------------------------------ reviews
courseAdmin.get("/admin/courses/:id/reviews", wrap(async (req, res) => {
  res.json((await prisma.courseReview.findMany({ where: { courseId: req.params.id }, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true, email: true } } } })).map((r: any) => ({ userId: r.userId, rating: r.rating, text: r.text, at: r.createdAt, name: r.user.name, email: r.user.email })));
}));
courseAdmin.delete("/admin/reviews/:courseId/:userId", wrap(async (req, res) => { await prisma.courseReview.deleteMany({ where: { courseId: req.params.courseId, userId: req.params.userId } }); res.json({ ok: true }); }));

// ------------------------------------------------------------ push
courseAdmin.get("/admin/push/status", wrap(async (_req, res) => {
  res.json({ enabled: pushEnabled(), devices: await prisma.pushSubscription.count(), users: (await prisma.pushSubscription.groupBy({ by: ["userId"], _count: { _all: true } })).length });
}));
courseAdmin.post("/admin/push", wrap(async (req, res) => {
  if (!pushEnabled()) throw fail(400, "Push notifications are not set up on the server yet (add VAPID keys, see DEPLOY.md).");
  const b = z.object({ title: z.string().trim().min(2).max(80), body: z.string().trim().min(2).max(240), url: z.string().trim().max(300).regex(/^\/[^/\\]/, "Link must start with /").optional().or(z.literal("")), courseId: z.string().optional().or(z.literal("")) }).parse(req.body);
  const ids: string[] = b.courseId ? (await prisma.enrollment.findMany({ where: { courseId: b.courseId, status: "ACTIVE" }, select: { userId: true } })).map((e: any) => e.userId) : (await prisma.pushSubscription.groupBy({ by: ["userId"], _count: { _all: true } })).map((r: any) => r.userId);
  res.json({ audience: ids.length, ...(await notifyUsers(ids, { title: b.title, body: b.body, url: b.url || "/courses", tag: "admin-msg" })) });
}));

// ------------------------------------------------------------ doubts inbox
courseAdmin.get("/admin/doubts", wrap(async (req, res) => {
  const status = String(req.query.status ?? "open"), courseId = String(req.query.courseId ?? "");
  const rows = await prisma.doubt.findMany({ where: { ...(status === "open" ? { resolved: false } : {}), ...(courseId ? { courseId } : {}) }, orderBy: { createdAt: "desc" }, take: 100,
    include: { user: { select: { name: true, email: true } }, lesson: { select: { title: true, course: { select: { title: true } } } }, replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } } } });
  res.json(rows.map((d: any) => ({ id: d.id, text: d.text, atSec: d.atSec, resolved: d.resolved, at: d.createdAt, name: d.user.name, email: d.user.email, lessonId: d.lessonId, courseId: d.courseId, lesson: d.lesson.title, course: d.lesson.course.title,
    replies: d.replies.map((r: any) => ({ id: r.id, kind: r.kind, text: r.text, at: r.createdAt, by: r.kind === "AI" ? "AI tutor" : r.kind === "TEACHER" ? "You" : r.user?.name ?? "Student" })) })));
}));
