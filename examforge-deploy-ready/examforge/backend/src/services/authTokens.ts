import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/db";

export type TokenKind = "VERIFY" | "RESET";
const TTL: Record<TokenKind, number> = { VERIFY: 24 * 3600_000, RESET: 3600_000 };
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates a one-time token for the user and returns the raw value (only its SHA-256 is stored). Older unused tokens of the same kind are invalidated. */
export async function issueToken(userId: string, kind: TokenKind): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.authToken.deleteMany({ where: { userId, kind, usedAt: null } });
  await prisma.authToken.create({ data: { userId, kind, hash: hashToken(raw), expiresAt: new Date(Date.now() + TTL[kind]) } });
  return raw;
}
/** Marks the token used and returns its user id, or null if it is unknown, expired, of another kind, or already used. */
export async function consumeToken(raw: string, kind: TokenKind): Promise<string | null> {
  if (!raw || raw.length < 20 || raw.length > 200) return null;
  const row = await prisma.authToken.findUnique({ where: { hash: hashToken(raw) } });
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  const r = await prisma.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1 ? row.userId : null;
}
