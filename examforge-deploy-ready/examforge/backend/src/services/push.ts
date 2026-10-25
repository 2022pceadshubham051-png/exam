import webpush from "web-push";
import { prisma } from "../lib/db";

let ready: boolean | undefined;
function init() {
  if (ready !== undefined) return ready;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT } = process.env;
  if (pub && priv) { try { webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@examforge.local", pub, priv); ready = true; } catch (e: any) { console.error("Invalid VAPID keys:", e.message); ready = false; } } else ready = false;
  return ready;
}
export const pushEnabled = () => init();
export const pushPublicKey = () => (init() ? process.env.VAPID_PUBLIC_KEY! : null);

export interface PushPayload { title: string; body: string; url?: string; tag?: string }
/** Sends a notification to every device of the given users. Dead subscriptions (404/410) are removed. Never throws. */
export async function notifyUsers(userIds: string[], payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!init() || !userIds.length) return { sent: 0, failed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  let sent = 0, failed = 0; const dead: string[] = [], body = JSON.stringify({ ...payload, url: payload.url ?? "/home" });
  await Promise.all(subs.map(async (s: any) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 }); sent++; }
    catch (e: any) { failed++; if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id); }
  }));
  if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } }).catch(() => {});
  return { sent, failed };
}
