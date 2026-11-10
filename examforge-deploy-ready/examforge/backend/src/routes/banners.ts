import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, requireAdmin } from "../middleware/auth"; import { wrap, fail } from "./util";

/** Home banners. Public: read the live ones + count views/clicks. Admin only: create, edit, delete.
 *  HOME banners slide on top of the home screen and open an in-app page (a course, an exam) or a web link; PLAN banners are cover photos for the "Today's plan" card. */
export const banners = Router();

const img = z.string().trim().max(700_000).refine((v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v), "Banner must be an https image link or an uploaded image.");
const link = z.string().trim().max(2000).refine((v) => v === "" || /^https?:\/\//i.test(v) || /^\/[^/]/.test(v), "Link must start with / (a page in this app, like /courses/ID or /exam/ID) or https://");
const body = z.object({
  title: z.string().trim().min(1).max(120), placement: z.enum(["HOME", "PLAN"]).default("HOME"), imageUrl: img, linkUrl: link.default(""),
  priority: z.number().int().min(0).max(1000).default(0), active: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional(),
}).superRefine((v, c) => { if (v.placement === "HOME" && !v.linkUrl) c.addIssue({ code: "custom", path: ["linkUrl"], message: "A home banner needs a link (pick a course or exam, or paste a link)." }); });
const data = (b: z.infer<typeof body>) => ({ ...b, startsAt: b.startsAt ? new Date(b.startsAt) : null, expiresAt: b.expiresAt ? new Date(b.expiresAt) : null });
const state = (p: any, now = new Date()) => !p.active ? "off" : p.startsAt && p.startsAt > now ? "scheduled" : p.expiresAt && p.expiresAt <= now ? "expired" : "live";
const live = () => { const now = new Date(); return { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] }; };

// ---- public ----
banners.get("/banners", wrap(async (_req, res) => {
  const list = await prisma.banner.findMany({ where: live(), orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 30, select: { id: true, placement: true, imageUrl: true, linkUrl: true, title: true } });
  res.set("Cache-Control", "public, max-age=60").json(list);
}));
banners.post("/banners/:id/view", wrap(async (req, res) => { await prisma.banner.updateMany({ where: { id: req.params.id }, data: { views: { increment: 1 } } }); res.json({ ok: true }); }));
banners.post("/banners/:id/click", wrap(async (req, res) => { await prisma.banner.updateMany({ where: { id: req.params.id }, data: { clicks: { increment: 1 } } }); res.json({ ok: true }); }));

// ---- admin only ----
banners.use("/admin/banners", requireAuth, requireAdmin);
banners.get("/admin/banners", wrap(async (_req, res) => { res.json((await prisma.banner.findMany({ orderBy: [{ createdAt: "desc" }], take: 200 })).map((p) => ({ ...p, state: state(p) }))); }));
banners.post("/admin/banners", wrap(async (req, res) => { res.json(await prisma.banner.create({ data: data(body.parse(req.body)) })); }));
banners.put("/admin/banners/:id", wrap(async (req, res) => { if (!(await prisma.banner.findUnique({ where: { id: req.params.id }, select: { id: true } }))) throw fail(404, "Banner not found."); res.json(await prisma.banner.update({ where: { id: req.params.id }, data: data(body.parse(req.body)) })); }));
banners.delete("/admin/banners/:id", wrap(async (req, res) => { await prisma.banner.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));
