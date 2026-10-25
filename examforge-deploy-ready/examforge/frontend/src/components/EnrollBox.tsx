import { useState } from "react";
import { GraduationCap, Tag, X, Check } from "lucide-react";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { rupees } from "../lib/courses"; import { toast } from "./ui";

/** Price, optional coupon code, payment instructions and the enroll button. A coupon that makes the course free skips the payment step. */
export default function EnrollBox({ c, reload }: { c: any; reload: () => Promise<unknown> }) {
  const t = useT(); const [code, setCode] = useState(""); const [applied, setApplied] = useState<{ code: string; discountInr: number; finalInr: number } | null>(null); const [cerr, setCerr] = useState("");
  const [ref, setRef] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const id = c.slug ?? c.id; const final = applied ? applied.finalInr : c.priceInr; const free = final <= 0;
  const apply = async () => { setCerr(""); if (!code.trim()) return; setBusy(true); try { setApplied(await api(`/courses/${id}/coupon`, "POST", { code })); } catch (e: any) { setApplied(null); setCerr(e.message); } finally { setBusy(false); } };
  const enroll = async () => {
    setBusy(true); setErr("");
    try { const r = await api(`/courses/${id}/enroll`, "POST", { ...(free ? {} : { paymentRef: ref }), ...(applied ? { coupon: applied.code } : {}) }); toast(r.status === "ACTIVE" ? t("You are enrolled. Happy learning!") : t("Payment sent. You get access as soon as it is approved."), "ok"); await reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return <div className="stack" style={{ gap: 10 }}>
    <div className="row" style={{ gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
      <div className="course-price big">{final > 0 ? rupees(final) : t("Free")}</div>
      {applied && c.priceInr > 0 && <><s className="sub">{rupees(c.priceInr)}</s><span className="pill pill-ok">{t("You save {amount}", { amount: rupees(applied.discountInr) })}</span></>}
    </div>
    {c.priceInr > 0 && <div className="stack" style={{ gap: 6 }}>
      {applied ? <div className="row coupon-on" style={{ gap: 8 }}><Check size={16} aria-hidden="true" /><span><b>{applied.code}</b> {t("applied")}</span><button type="button" className="btn btn-sm btn-ghost icon-btn" onClick={() => { setApplied(null); setCode(""); }} aria-label={t("Remove coupon")}><X size={14} /></button></div>
        : <form className="row" style={{ gap: 8, flexWrap: "wrap" }} onSubmit={(e) => { e.preventDefault(); void apply(); }}>
          <label className="sr" htmlFor="coupon">{t("Coupon code")}</label>
          <input id="coupon" className="input" style={{ maxWidth: 220, textTransform: "uppercase" }} value={code} maxLength={40} onChange={(e) => { setCode(e.target.value); setCerr(""); }} placeholder={t("Have a coupon code?")} autoCapitalize="characters" autoComplete="off" />
          <button className="btn btn-sm" disabled={busy || !code.trim()}><Tag size={14} aria-hidden="true" />{t("Apply")}</button></form>}
      {cerr && <div className="field-error" role="alert">{cerr}</div>}
    </div>}
    {!free && <>
      {c.paymentInfo && <div className="card card-pad" style={{ background: "var(--surface-2)" }}><b>{t("How to pay")}</b>{applied && <p className="sub" style={{ margin: "2px 0 0" }}>{t("Pay the discounted amount: {amount}", { amount: rupees(final) })}</p>}<p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{c.paymentInfo}</p></div>}
      <label className="label" htmlFor="payref">{t("Payment / UPI transaction ID")}</label>
      <input id="payref" className="input" value={ref} maxLength={80} onChange={(e) => setRef(e.target.value)} placeholder={t("Paste the transaction ID after paying")} style={{ maxWidth: 380 }} />
    </>}
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    <button className="btn btn-primary btn-lg" style={{ justifySelf: "start" }} disabled={busy || (!free && ref.trim().length < 4)} onClick={enroll}><GraduationCap size={18} aria-hidden="true" />{free ? t("Enroll for free") : t("Submit payment & enroll")}</button>
  </div>;
}
