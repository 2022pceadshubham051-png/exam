import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/db";
export interface AuthedReq extends Request { user?: { id: string; role: "USER" | "ADMIN"; sid?: string } }
const secret = () => process.env.JWT_SECRET!;
export const sign = (u: { id: string; role: string; sid?: string }) => jwt.sign({ id: u.id, role: u.role, ...(u.sid ? { sid: u.sid } : {}) }, secret(), { expiresIn: "7d" });

// A token with a session id (sid) is only valid while its Session row exists (the device limit deletes the oldest one).
// Checked at most once per 30 s per session, so this is not a database hit on every request.
const alive = new Map<string, number>();
export const forgetSession = (sid: string) => alive.delete(sid);
export async function requireAuth(req: AuthedReq, res: Response, next: NextFunction) {
  const t = req.headers.authorization?.replace("Bearer ", "");
  let u: any; try { u = jwt.verify(t ?? "", secret()); } catch { return res.status(401).json({ error: "Unauthorized" }); }
  req.user = u;
  if (!u.sid) return next(); // admin, or a login from before the device limit existed
  try {
    if ((alive.get(u.sid) ?? 0) < Date.now()) {
      const s = await prisma.session.findUnique({ where: { id: u.sid }, select: { id: true } });
      if (!s) { alive.delete(u.sid); return res.status(401).json({ error: "You were signed out because your account was used on another device.", code: "SESSION_REVOKED" }); }
      alive.set(u.sid, Date.now() + 30_000); if (alive.size > 5000) alive.clear();
      void prisma.session.update({ where: { id: u.sid }, data: { lastSeen: new Date() } }).catch(() => {});
    }
  } catch (e) { console.error("Session check failed:", e); } // a database hiccup must not log everyone out
  next();
}
export const requireAdmin = (req: AuthedReq, res: Response, next: NextFunction) =>
  req.user?.role === "ADMIN" ? next() : res.status(403).json({ error: "Admin only" });
