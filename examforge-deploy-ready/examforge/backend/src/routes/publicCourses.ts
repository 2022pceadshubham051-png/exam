import { Router } from "express";
import { prisma } from "../lib/db"; import { wrap, fail } from "./util"; import { ratingsFor, reviewerName } from "./courses"; import { frontendUrl } from "../services/mail";

/** Public (no login) course pages: the shareable /c/<slug> landing page reads from here. Lesson videos and notes are never included. */
export const publicCourses = Router();
const key = (k: string) => ({ OR: [{ slug: k }, { id: k }] });
const findPublic = async (k: string) => { const c = await prisma.course.findFirst({ where: { ...key(k), published: true }, include: { subjects: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true, durationMin: true, isPreview: true } } } }, _count: { select: { enrollments: true } } } }); if (!c) throw fail(404, "Course not found."); return c; };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

publicCourses.get("/public/courses/:slug", wrap(async (req, res) => {
  const c = await findPublic(req.params.slug);
  const [rt, revs] = await Promise.all([ratingsFor([c.id]), prisma.courseReview.findMany({ where: { courseId: c.id }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true, displayName: true } } } })]);
  res.json({ id: c.id, slug: c.slug, title: c.title, description: c.description, posterUrl: c.posterUrl, examName: c.examName, priceInr: c.priceInr, seoTitle: c.seoTitle, seoDescription: c.seoDescription, students: c._count.enrollments,
    rating: rt.get(c.id)?.avg ?? 0, ratingCount: rt.get(c.id)?.count ?? 0, subjects: c.subjects.map((s: any) => ({ id: s.id, name: s.name, lessons: s.lessons })),
    reviews: revs.map((r: any) => ({ rating: r.rating, text: r.text, by: reviewerName(r.user), at: r.createdAt })) });
}));

/** The poster as a real image file (it is stored as a data URL), so WhatsApp / Facebook can use it as the link preview picture. */
publicCourses.get("/public/courses/:slug/poster", wrap(async (req, res) => {
  const c = await findPublic(req.params.slug), m = c.posterUrl?.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (m) { res.set({ "Content-Type": m[1], "Cache-Control": "public, max-age=3600" }); return res.send(Buffer.from(m[2], "base64")); }
  if (c.posterUrl) return res.redirect(c.posterUrl); throw fail(404, "No poster.");
}));

/** Share this link instead of the app link: it has the title, description and poster in its HTML (link previews do not run JavaScript), then sends people on to the real page. */
publicCourses.get("/public/courses/:slug/share", wrap(async (req, res) => {
  const c = await findPublic(req.params.slug), page = `${frontendUrl()}/c/${c.slug ?? c.id}`, title = c.seoTitle || c.title, desc = (c.seoDescription || c.description || "Video course on ExamForge").replace(/\s+/g, " ").slice(0, 200);
  const img = c.posterUrl ? `${req.protocol}://${req.get("host")}/api/public/courses/${c.slug ?? c.id}/poster` : "";
  res.set("Cache-Control", "public, max-age=300").type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(page)}">${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image">` : ""}
<link rel="canonical" href="${esc(page)}"><meta http-equiv="refresh" content="0;url=${esc(page)}"></head><body><p><a href="${esc(page)}">${esc(title)}</a></p></body></html>`);
}));
