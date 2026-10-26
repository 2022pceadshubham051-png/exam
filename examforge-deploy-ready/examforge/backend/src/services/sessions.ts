import { prisma } from "../lib/db"; import { forgetSession } from "../middleware/auth";

export const maxDevices = () => Math.max(1, Math.min(10, Math.floor(+(process.env.MAX_DEVICES ?? 2)) || 2));
/** Which sessions to remove so that, after adding one new device, at most `max` remain: the least recently used ones. */
export function pickEvictions<T extends { id: string; lastSeen: Date }>(existing: T[], max: number): T[] {
  const sorted = [...existing].sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()), keep = Math.max(0, max - 1);
  return sorted.slice(keep);
}
export const deviceLabel = (ua = "") => { const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iPhone/iPad" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Device", br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : ""; return `${os}${br ? ` · ${br}` : ""}`; };

/** Registers this device for the student and signs out the oldest ones above the limit. Returns the session id for the token. */
export async function startSession(userId: string, deviceId: string, ua?: string): Promise<string> {
  const id = deviceId.replace(/[^\w-]/g, "").slice(0, 64) || "unknown", label = deviceLabel(ua);
  const same = await prisma.session.findUnique({ where: { userId_deviceId: { userId, deviceId: id } } });
  if (same) { await prisma.session.update({ where: { id: same.id }, data: { lastSeen: new Date(), label } }); return same.id; }
  const others = await prisma.session.findMany({ where: { userId }, select: { id: true, lastSeen: true } }), drop = pickEvictions(others, maxDevices());
  if (drop.length) { await prisma.session.deleteMany({ where: { id: { in: drop.map((d) => d.id) } } }); drop.forEach((d) => forgetSession(d.id)); }
  return (await prisma.session.create({ data: { userId, deviceId: id, label } })).id;
}
