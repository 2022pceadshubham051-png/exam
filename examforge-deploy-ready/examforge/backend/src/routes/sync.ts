import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";

/** One JSON blob per student: notebook cards, saved questions and small preferences, so a new phone shows the same data. */
export const sync = Router();
sync.use(requireAuth);
sync.get("/sync", async (req: AuthedReq, res) => {
  const row = await prisma.userSync.findUnique({ where: { userId: req.user!.id } });
  res.json({ data: row?.data ?? null, updatedAt: row?.updatedAt ?? null });
});
sync.put("/sync", async (req: AuthedReq, res) => {
  const { data } = z.object({ data: z.record(z.string(), z.unknown()) }).parse(req.body);
  if (JSON.stringify(data).length > 400_000) return res.status(413).json({ error: "Your notebook is too large to sync. Remove some saved questions." });
  const row = await prisma.userSync.upsert({ where: { userId: req.user!.id }, create: { userId: req.user!.id, data: data as any }, update: { data: data as any } });
  res.json({ updatedAt: row.updatedAt });
});
