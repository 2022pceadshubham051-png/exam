import { useEffect, useState } from "react"; import { Download, WifiOff, X } from "lucide-react"; import { useT } from "../lib/i18n";

/** A small "Add to home screen" card (once per 14 days) and an offline banner. */
export default function InstallPrompt() {
  const t = useT(), [ev, setEv] = useState<any>(null), [off, setOff] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  useEffect(() => {
    const on = () => setOff(false), no = () => setOff(true);
    const bip = (e: Event) => { e.preventDefault(); try { if (Date.now() - Number(localStorage.getItem("ef_install_no") || 0) < 14 * 864e5) return; } catch { /* ignore */ } setEv(e); };
    window.addEventListener("online", on); window.addEventListener("offline", no); window.addEventListener("beforeinstallprompt", bip);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", no); window.removeEventListener("beforeinstallprompt", bip); };
  }, []);
  const later = () => { try { localStorage.setItem("ef_install_no", String(Date.now())); } catch { /* ignore */ } setEv(null); };
  return <>
    {off && <div className="offline-bar" role="status"><WifiOff size={15} aria-hidden="true" />{t("You are offline. Saved pages still work.")}</div>}
    {ev && <div className="install" role="dialog" aria-label={t("Install the app")}><Download size={18} aria-hidden="true" /><div><b>{t("Install ExamForge")}</b><div className="sub">{t("Open it like an app and load faster.")}</div></div>
      <button type="button" className="btn btn-primary btn-sm" onClick={async () => { ev.prompt(); try { await ev.userChoice; } catch { /* ignore */ } setEv(null); }}>{t("Install")}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={later} aria-label={t("Not now")}><X size={15} aria-hidden="true" /></button></div>}
  </>;
}
