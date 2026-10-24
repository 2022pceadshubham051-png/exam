import { useState } from "react"; import { Flag } from "lucide-react"; import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { toast } from "./ui";

const REASONS: [string, string][] = [["wrong_answer", "The answer key looks wrong"], ["unclear", "The question is unclear"], ["typo", "Spelling or typing mistake"], ["other", "Something else"]];
/** Lets a student flag a question that looks wrong. Admins see the list. */
export default function ReportQuestion({ questionId }: { questionId?: string }) {
  const t = useT(), [open, setOpen] = useState(false), [reason, setReason] = useState("wrong_answer"), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  if (!questionId) return null;
  const send = async () => { setBusy(true); try { await api("/questions/report", "POST", { questionId, reason, note: note.trim() || undefined }); setSent(true); setOpen(false); toast(t("Thank you! We will check this question."), "ok"); } catch (e: any) { toast(e?.message || t("Could not send. Try again."), "bad"); } finally { setBusy(false); } };
  if (sent) return <span className="sub">{t("Reported")}</span>;
  return <div className="report">
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}><Flag size={14} aria-hidden="true" />{t("Report this question")}</button>
    {open && <div className="report-box">
      <fieldset className="report-opts"><legend className="sub">{t("What is wrong?")}</legend>{REASONS.map(([k, label]) => <label key={k}><input type="radio" name={"r-" + questionId} checked={reason === k} onChange={() => setReason(k)} /> {t(label)}</label>)}</fieldset>
      <textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Add a short note (optional)")} aria-label={t("Add a short note (optional)")} />
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={send}>{t("Send report")}</button>
    </div>}
  </div>;
}
