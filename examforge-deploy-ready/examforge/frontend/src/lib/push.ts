import { api } from "./api";

export type PushState = "unsupported" | "denied" | "on" | "off";
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const toKey = (b64: string) => { const p = "=".repeat((4 - (b64.length % 4)) % 4), raw = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };
const ready = () => Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Notifications work in the installed app. Open the live site and try again.")), 4000))]);

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported"; if (Notification.permission === "denied") return "denied";
  try { return (await (await ready()).pushManager.getSubscription()) ? "on" : "off"; } catch { return "off"; }
}
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("This browser does not support notifications.");
  const { key } = await api<{ key: string | null }>("/push/key"); if (!key) throw new Error("Notifications are not switched on for this site yet.");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications are blocked. Allow them in your browser settings.");
  const reg = await ready(), sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
  await api("/push/subscribe", "POST", sub.toJSON());
}
export async function disablePush(): Promise<void> {
  const sub = await (await ready()).pushManager.getSubscription(); if (!sub) return;
  await api("/push/unsubscribe", "POST", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe();
}
