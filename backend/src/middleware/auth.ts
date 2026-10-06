import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
export interface AuthedReq extends Request { user?: { id: string; role: "USER" | "ADMIN" } }
const secret = () => process.env.JWT_SECRET!;
export const sign = (u: { id: string; role: string }) => jwt.sign(u, secret(), { expiresIn: "7d" });
export function requireAuth(req: AuthedReq, res: Response, next: NextFunction) {
  const t = req.headers.authorization?.replace("Bearer ", "");
  try { req.user = jwt.verify(t ?? "", secret()) as any; next(); } catch { res.status(401).json({ error: "Unauthorized" }); }
}
export const requireAdmin = (req: AuthedReq, res: Response, next: NextFunction) =>
  req.user?.role === "ADMIN" ? next() : res.status(403).json({ error: "Admin only" });
