import { useState } from "react"; import { Sparkles, Send, Loader } from "lucide-react";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { getLang as appLang } from "../lib/prefs";

type Msg = { role: "user" | "assistant"; content: string };
type Lang = "en" | "hi";
const LANGS: [Lang, string][] = [["en", "English"], ["hi", "हिन्दी"]];
/** Starts in the app language; a choice made inside the tutor is remembered. */
const initLang = (): Lang => { try { const v = localStorage.getItem("ef_ai_lang"); if (v === "hi" || v === "en") return v; } catch { /* ignore */ } return appLang(); };

/** "Don't understand?" button: asks the AI tutor to explain one question in English or Hindi, with follow-ups. Works on any screen that has the question text. */
export default function DoubtButton({ text, options, correctKey, selectedKey, explanation, topic }: { text: string; options: { key: string; text: string }[]; correctKey: string | null; selectedKey?: string | null; explanation?: string | null; topic?: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false), [lang, setLang] = useState<Lang>(initLang), [msgs, setMsgs] = useState<Msg[]>([]), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [q, setQ] = useState(""), [off, setOff] = useState(false);
  const ask = async (followup?: string, l: Lang = lang) => {
    if (busy) return; setBusy(true); setErr("");
    try {
      const history = followup ? msgs.slice(-4) : undefined;
      const r = await api<{ text: string; source: string; configured: boolean }>("/ai/explain", "POST", { text, options, correctKey, selectedKey: selectedKey ?? null, explanation: explanation ?? null, topic: topic ?? null, lang: l, ...(followup ? { followup, history } : {}) });
      setOff(r.configured === false);
      setMsgs((m) => (followup ? [...m, { role: "user", content: followup }, { role: "assistant", content: r.text }] : [{ role: "assistant", content: r.text }]));
      setQ("");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const pick = (l: Lang) => { if (l === lang) return; setLang(l); try { localStorage.setItem("ef_ai_lang", l); } catch { /* ignore */ } if (msgs.length) { setMsgs([]); void ask(undefined, l); } };
  if (!open) return <button type="button" className="btn btn-sm eg-doubt" onClick={() => { setOpen(true); void ask(); }}><Sparkles size={14} aria-hidden="true" />{t("Don't understand? Ask the AI tutor")}</button>;
  return <section className="eg-ai stack" style={{ gap: 10 }} aria-label={t("AI tutor")}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
      <b className="row" style={{ gap: 6 }}><Sparkles size={15} aria-hidden="true" />{t("AI tutor")}</b>
      <div className="seg" role="group" aria-label={t("Language")}>{LANGS.map(([k, l]) => <button key={k} type="button" aria-pressed={lang === k} className={lang === k ? "on" : ""} onClick={() => pick(k)}>{l}</button>)}</div>
    </div>
    {msgs.map((m, i) => <p key={i} className={m.role === "user" ? "eg-ai-you" : "eg-ai-bot"}>{m.content}</p>)}
    {busy && <p className="sub row" style={{ gap: 6 }} role="status"><Loader size={14} className="animate-spin" aria-hidden="true" />{t("Thinking…")}</p>}
    {err && <div className="alert alert-bad" role="alert">{err} <button type="button" className="btn btn-sm" onClick={() => ask(msgs.length ? q || undefined : undefined)}>{t("Retry")}</button></div>}
    {off && <p className="sub">{t("The AI tutor is off right now. This is the explanation from the test author.")}</p>}
    {!!msgs.length && !off && <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (q.trim()) void ask(q.trim()); }}>
      <label className="sr" htmlFor="ai-follow">{t("Ask a follow-up")}</label>
      <input id="ai-follow" className="input" style={{ flex: 1, minWidth: 0 }} maxLength={500} placeholder={t("Ask a follow-up (for example: explain more simply)")} value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn btn-primary" disabled={busy || !q.trim()} aria-label={t("Send")}><Send size={15} aria-hidden="true" /></button></form>}
    <p className="sub" style={{ fontSize: ".78rem" }}>{t("The AI can be wrong. Check important facts in your book or the answer key.")}</p>
  </section>;
}
