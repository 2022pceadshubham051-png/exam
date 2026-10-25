import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useT } from "../lib/i18n"; import { disablePush, enablePush, pushState, type PushState } from "../lib/push"; import { toast } from "./ui";

/** One-tap switch for course notifications (new approvals, messages from the teacher). Hidden where the browser cannot do push. */
export default function PushToggle() {
  const t = useT(); const [s, setS] = useState<PushState | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { void pushState().then(setS); }, []);
  if (!s || s === "unsupported") return null;
  const flip = async () => { setBusy(true); try { if (s === "on") await disablePush(); else await enablePush(); setS(await pushState()); toast(s === "on" ? t("Notifications are off.") : t("Notifications are on."), "ok"); } catch (e: any) { toast(e.message, "bad"); setS(await pushState()); } finally { setBusy(false); } };
  return <button type="button" className={`btn btn-sm ${s === "on" ? "" : "btn-primary"}`} disabled={busy || s === "denied"} onClick={flip} title={s === "denied" ? t("Notifications are blocked in your browser settings.") : undefined}>{s === "on" ? <BellOff size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}{s === "on" ? t("Turn off notifications") : t("Turn on notifications")}</button>;
}
