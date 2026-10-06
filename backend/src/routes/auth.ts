import { Router } from "express"; import bcrypt from "bcrypt"; import { z } from "zod";
import { prisma } from "../lib/db"; import { sign } from "../middleware/auth";
export const auth = Router();
const creds = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).optional() });
auth.post("/register", async (req, res) => {
  const p = creds.safeParse(req.body); if (!p.success || !p.data.name) return res.status(400).json({ error: "Invalid input" });
  if (await prisma.user.findUnique({ where: { email: p.data.email } })) return res.status(409).json({ error: "Email exists" });
  const u = await prisma.user.create({ data: { email: p.data.email, name: p.data.name, passwordHash: await bcrypt.hash(p.data.password, 12) } });
  res.json({ token: sign(u), user: { id: u.id, name: u.name, role: u.role } });
});
auth.post("/login", async (req, res) => {
  const p = z.object({ identifier: z.string().min(1), password: z.string().min(1) }).safeParse({ identifier: req.body.identifier ?? req.body.email, password: req.body.password });
  if (!p.success) return res.status(400).json({ error: "Invalid input" });
  const u = await prisma.user.findFirst({ where: { OR: [{ email: p.data.identifier }, { username: p.data.identifier }] } });
  if (!u || !(await bcrypt.compare(p.data.password, u.passwordHash))) return res.status(401).json({ error: "Wrong credentials" });
  res.json({ token: sign(u), user: { id: u.id, name: u.name, role: u.role } });
});
