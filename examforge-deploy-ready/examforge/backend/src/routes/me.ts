import { Router } from "express"; import { z } from "zod"; import bcrypt from "bcrypt";
import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import { award, WELCOME_COINS } from "../services/coins";

export const me = Router();
me.use(requireAuth);
const view = (u: any) => ({ id: u.id, role: u.role, name: u.name, email: u.email, age: u.age, targetExam: u.targetExam, targetScore: u.targetScore,
  // Admins skip onboarding. Name is only asked when the account has none (register already collects it).
  onboarded: u.role === "ADMIN" || !!u.onboarded, needsName: !String(u.name ?? "").trim() });

me.get("/me", async (req: AuthedReq, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!u) return res.status(404).json({ error: "Account not found" });
  res.json(view(u));
});

const body = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(120).optional(),
  currentPassword: z.string().max(128).optional(),
  age: z.coerce.number().int().min(8).max(99),
  targetExam: z.string().trim().min(2).max(60),
  targetScore: z.coerce.number().int().min(1).max(100).optional().nullable(),
});
me.put("/me", async (req: AuthedReq, res) => {
  const p = body.parse(req.body);
  const cur = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!cur) return res.status(404).json({ error: "Account not found" });
  if (cur.role === "ADMIN") return res.status(403).json({ error: "The admin account has no student profile." });
  if (!String(cur.name ?? "").trim() && !p.name) return res.status(400).json({ error: "Please enter your name." });
  const emailChanged = !!p.email && p.email !== cur.email.toLowerCase();
  if (emailChanged) {
    // Changing the login email needs the current password, so a borrowed session cannot take over the account.
    if (!p.currentPassword || !(await bcrypt.compare(p.currentPassword, cur.passwordHash))) return res.status(400).json({ error: "Enter your current password to change your email." });
    if (await prisma.user.findUnique({ where: { email: p.email! } })) return res.status(409).json({ error: "That email is already used by another account." });
  }
  const u = await prisma.user.update({ where: { id: cur.id }, data: { age: p.age, targetExam: p.targetExam, targetScore: p.targetScore ?? null, onboarded: true, ...(p.name ? { name: p.name } : {}), ...(emailChanged ? { email: p.email! } : {}) } });
  const gift = !cur.onboarded ? await award(cur.id, WELCOME_COINS, "welcome", "once") : false;
  res.json({ ...view(u), welcomeCoins: gift ? WELCOME_COINS : 0 });
});
