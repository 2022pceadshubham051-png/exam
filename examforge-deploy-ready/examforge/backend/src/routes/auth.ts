import { Router } from "express"; import bcrypt from "bcrypt"; import { randomBytes } from "node:crypto"; import rateLimit from "express-rate-limit"; import { z } from "zod";
import { prisma } from "../lib/db"; import { sign } from "../middleware/auth";
import { startSession } from "../services/sessions"; import { issueToken, consumeToken } from "../services/authTokens"; import { mailEnabled, sendVerifyMail, sendResetMail } from "../services/mail";
export const auth = Router();
const creds = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128), name: z.string().trim().min(1).max(80).optional(), ref: z.string().trim().max(12).optional() });
/** Logs the student in on this device (see services/sessions: max 2 devices). Admins are not limited. */
const session = async (u: { id: string; name: string; role: string }, req: any) => {
  const sid = u.role === "ADMIN" ? undefined : await startSession(u.id, String(req.headers["x-device-id"] ?? ""), String(req.headers["user-agent"] ?? ""));
  return { token: sign({ id: u.id, role: u.role, sid }), user: { id: u.id, name: u.name, role: u.role } };
};
// Mail-sending endpoints get a tighter limit than the rest of /auth so they cannot be used to spam an inbox.
const mailLimit = rateLimit({ windowMs: 15 * 60_000, max: 8, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests. Please try again in a few minutes." } });

auth.post("/register", async (req, res) => {
  const p = creds.safeParse(req.body); if (!p.success || !p.data.name) return res.status(400).json({ error: "Invalid input" });
  if (await prisma.user.findUnique({ where: { email: p.data.email } })) return res.status(409).json({ error: "Email exists" });
  // A valid invite code links the new student to the friend who shared it (rewarded later, after the first finished test).
  const inviter = p.data.ref ? await prisma.user.findUnique({ where: { refCode: p.data.ref.toUpperCase() }, select: { id: true } }) : null;
  // With SMTP configured the student must confirm the email first; without it (local dev) sign-up works as before.
  const needVerify = mailEnabled();
  const u = await prisma.user.create({ data: { email: p.data.email, name: p.data.name, passwordHash: await bcrypt.hash(p.data.password, 12), emailVerified: !needVerify, ...(inviter ? { referredBy: inviter.id } : {}) } });
  if (needVerify) { await sendVerifyMail(u.email, u.name, await issueToken(u.id, "VERIFY")); return res.json({ verify: true, email: u.email }); }
  res.json(await session(u, req));
});

auth.post("/login", async (req, res) => {
  const p = z.object({ identifier: z.string().min(1), password: z.string().min(1).max(128) }).safeParse({ identifier: req.body.identifier ?? req.body.email, password: req.body.password });
  if (!p.success) return res.status(400).json({ error: "Invalid input" });
  const u = await prisma.user.findFirst({ where: { OR: [{ email: p.data.identifier.trim().toLowerCase() }, { username: p.data.identifier.trim() }] } });
  if (!u || !(await bcrypt.compare(p.data.password, u.passwordHash))) return res.status(401).json({ error: "Wrong credentials" });
  if (!u.emailVerified && u.role !== "ADMIN") return res.status(403).json({ error: "Please verify your email first. We sent you a link when you registered.", code: "EMAIL_NOT_VERIFIED", email: u.email });
  res.json(await session(u, req));
});

/** Opens the link from the verification email. Logs the student in so they land straight in the app. */
auth.post("/verify-email", async (req, res) => {
  const id = await consumeToken(String(req.body?.token ?? ""), "VERIFY");
  if (!id) return res.status(400).json({ error: "This verification link is invalid or has expired. Request a new one from the login page." });
  const u = await prisma.user.update({ where: { id }, data: { emailVerified: true } });
  res.json(await session(u, req));
});

// Same answer whether or not the email exists, so this cannot be used to find out who has an account.
auth.post("/resend-verification", mailLimit, async (req, res) => {
  const email = z.string().trim().toLowerCase().email().safeParse(req.body?.email); if (!email.success) return res.status(400).json({ error: "Enter a valid email." });
  const u = await prisma.user.findUnique({ where: { email: email.data } });
  if (u && !u.emailVerified) await sendVerifyMail(u.email, u.name, await issueToken(u.id, "VERIFY"));
  res.json({ ok: true });
});

auth.post("/forgot-password", mailLimit, async (req, res) => {
  const email = z.string().trim().toLowerCase().email().safeParse(req.body?.email); if (!email.success) return res.status(400).json({ error: "Enter a valid email." });
  const u = await prisma.user.findUnique({ where: { email: email.data } });
  if (u && u.role !== "ADMIN") await sendResetMail(u.email, u.name, await issueToken(u.id, "RESET"));
  res.json({ ok: true, mail: mailEnabled() });
});

auth.post("/reset-password", async (req, res) => {
  const p = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) }).safeParse(req.body); if (!p.success) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const id = await consumeToken(p.data.token, "RESET");
  if (!id) return res.status(400).json({ error: "This reset link is invalid or has expired. Ask for a new one." });
  // Resetting through the emailed link also proves the address belongs to the student.
  const u = await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(p.data.password, 12), emailVerified: true } });
  res.json(await session(u, req));
});

/** "Continue with Google": the browser sends the Google ID token; we check it with Google and match/create the account. */
auth.get("/config", (_req, res) => res.json({ google: process.env.GOOGLE_CLIENT_ID ?? null, mail: mailEnabled() }));
auth.post("/google", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID; if (!clientId) return res.status(501).json({ error: "Google login is not set up on this server." });
  const cred = z.string().min(20).max(4000).safeParse(req.body?.credential); if (!cred.success) return res.status(400).json({ error: "Invalid input" });
  let g: any; try { const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(cred.data)}`); g = await r.json(); if (!r.ok) g = null; } catch { g = null; }
  if (!g || g.aud !== clientId || !["accounts.google.com", "https://accounts.google.com"].includes(g.iss) || String(g.email_verified) !== "true" || !g.email || !g.sub) return res.status(401).json({ error: "Google sign-in failed. Please try again." });
  const email = String(g.email).toLowerCase(); let u = await prisma.user.findFirst({ where: { OR: [{ googleId: g.sub }, { email }] } });
  if (u) { if (u.googleId !== g.sub || !u.emailVerified) u = await prisma.user.update({ where: { id: u.id }, data: { googleId: g.sub, emailVerified: true } }); }
  else {
    const inviter = req.body?.ref ? await prisma.user.findUnique({ where: { refCode: String(req.body.ref).toUpperCase().slice(0, 12) }, select: { id: true } }) : null;
    u = await prisma.user.create({ data: { email, name: String(g.name ?? email.split("@")[0]).slice(0, 80), googleId: g.sub, emailVerified: true, passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10), ...(inviter ? { referredBy: inviter.id } : {}) } });
  }
  res.json(await session(u, req));
});
