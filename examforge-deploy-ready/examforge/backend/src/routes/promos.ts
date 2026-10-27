import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, requireAdmin } from "../middleware/auth"; import { wrap, fail } from "./util";

/** Promo popup (photo / short video ad). Public: read the live promo + count views/clicks. Admin only: create, edit, delete. */
export const promos = Router();

const url = z.string().trim().max(700_000).refine((v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v), "Media must be an https link or an uploaded image.");
const link = z.string().trim().max(2000).refine((v) => /^https?:\/\//i.test(v) || /^\/[^/]/.test(v), "Link must start with https:// (or / for a page on this site).");
const body = z.object({
  title: z.string().trim().min(1).max(120), mediaType: z.enum(["IMAGE", "VIDEO"]), mediaUrl: url, linkUrl: link,
  newTab: z.boolean().default(true), showAlways: z.boolean().default(false), priority: z.number().int().min(0).max(1000).default(0), active: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional(),
}).superRefine((v, c) => { if (v.mediaType === "VIDEO" && !/^https?:\/\//i.test(v.mediaUrl)) c.addIssue({ code: "custom", path: ["mediaUrl"], message: "A video needs an https link to an .mp4 / .webm file." }); });
const data = (b: z.infer<typeof body>) => ({ ...b, startsAt: b.startsAt ? new Date(b.startsAt) : null, expiresAt: b.expiresAt ? new Date(b.expiresAt) : null });
const state = (p: any, now = new Date()) => !p.active ? "off" : p.startsAt && p.startsAt > now ? "scheduled" : p.expiresAt && p.expiresAt <= now ? "expired" : "live";
const live = () => { const now = new Date(); return { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] }; };

// ---- public (no login) ----
promos.get("/promo/active", wrap(async (_req, res) => {
  const p = await prisma.promo.findFirst({ where: live(), orderBy: [{ priority: "desc" }, { createdAt: "desc" }], select: { id: true, mediaType: true, mediaUrl: true, linkUrl: true, newTab: true, showAlways: true } });
  res.set("Cache-Control", "public, max-age=60").json(p ?? null);
}));
promos.post("/promo/:id/view", wrap(async (req, res) => { await prisma.promo.updateMany({ where: { id: req.params.id }, data: { views: { increment: 1 } } }); res.json({ ok: true }); }));
promos.post("/promo/:id/click", wrap(async (req, res) => { await prisma.promo.updateMany({ where: { id: req.params.id }, data: { clicks: { increment: 1 } } }); res.json({ ok: true }); }));

// ---- admin only ----
promos.use("/admin/promos", requireAuth, requireAdmin);
promos.get("/admin/promos", wrap(async (_req, res) => { res.json((await prisma.promo.findMany({ orderBy: [{ createdAt: "desc" }], take: 200 })).map((p) => ({ ...p, state: state(p) }))); }));
promos.post("/admin/promos", wrap(async (req, res) => { res.json(await prisma.promo.create({ data: data(body.parse(req.body)) })); }));
promos.put("/admin/promos/:id", wrap(async (req, res) => { if (!(await prisma.promo.findUnique({ where: { id: req.params.id }, select: { id: true } }))) throw fail(404, "Promo not found."); res.json(await prisma.promo.update({ where: { id: req.params.id }, data: data(body.parse(req.body)) })); }));
promos.delete("/admin/promos/:id", wrap(async (req, res) => { await prisma.promo.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }));
