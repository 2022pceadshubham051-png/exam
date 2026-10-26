import { useEffect, useState, type MutableRefObject } from "react";
import { MessageCircleQuestion, Send, Sparkles, CircleCheck, Trash2, GraduationCap } from "lucide-react";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { getLang } from "../lib/prefs"; import { clock, type PlayerApi } from "./CoursePlayer"; import { toast } from "./ui";

/** Q&A under a lesson: ask a doubt (pinned to the video time), classmates and the teacher reply, the asker can call the AI tutor. */
export default function Doubts({ lessonId, apiRef }: { lessonId: string; apiRef: MutableRefObject<PlayerApi | null> }) {
  const t = useT(); const [list, setList] = useState<any[] | null>(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(""); const [reply, setReply] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => { let live = true; setList(null); api(`/lessons/${lessonId}/doubts`).then((d) => live && setList(Array.isArray(d) ? d : [])).catch(() => live && setList([])); return () => { live = false; }; }, [lessonId]);
  const swap = (d: any) => setList((l) => (l ?? []).map((x) => (x.id === d.id ? d : x)));
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(""); } };
  const ask = () => run("ask", async () => { const d = await api(`/lessons/${lessonId}/doubts`, "POST", { text, atSec: apiRef.current?.time() ?? 0 }); setList((l) => [d, ...(l ?? [])]); setText(""); toast(t("Doubt posted."), "ok"); });
  const send = (id: string) => run(id, async () => { swap(await api(`/doubts/${id}/replies`, "POST", { text: reply!.text })); setReply(null); });
  const ai = (id: string) => run(`ai${id}`, async () => swap(await api(`/doubts/${id}/ai`, "POST", { lang: getLang() })));
  const done = (d: any) => run(d.id, async () => { await api(`/doubts/${d.id}/resolve`, "POST", { resolved: !d.resolved }); swap({ ...d, resolved: !d.resolved }); });
  const del = (id: string) => { if (confirm(t("Delete this doubt?"))) void run(id, async () => { await api(`/doubts/${id}`, "DELETE"); setList((l) => (l ?? []).filter((x) => x.id !== id)); }); };
  return <section className="card card-pad stack" style={{ gap: 12 }} aria-label={t("Doubts")}>
    <h3 className="card-title row" style={{ gap: 8, margin: 0 }}><MessageCircleQuestion size={18} aria-hidden="true" />{t("Doubts")}</h3>
    <label className="sr" htmlFor="db-text">{t("Ask your doubt")}</label>
    <textarea id="db-text" className="textarea" rows={2} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Ask your doubt about this lesson…")} />
    <div><button type="button" className="btn btn-primary btn-sm" disabled={busy === "ask" || text.trim().length < 5} onClick={ask}><Send size={14} aria-hidden="true" />{t("Post doubt")}</button></div>
    {list === null ? <span className="sub">…</span> : list.length ? <ul className="doubt-list">{list.map((d) => <li key={d.id} className={`doubt ${d.resolved ? "done" : ""}`}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><b>{d.by}</b>{d.atSec > 0 && <button type="button" className="ln-time" onClick={() => apiRef.current?.seek(d.atSec)} disabled={!apiRef.current}>{clock(d.atSec)}</button>}{d.resolved && <span className="pill pill-ok"><CircleCheck size={12} aria-hidden="true" />{t("Solved")}</span>}</div>
      <p className="doubt-t">{d.text}</p>
      {d.replies.map((r: any) => <div key={r.id} className={`doubt-r ${r.kind.toLowerCase()}`}><div className="row" style={{ gap: 6 }}>{r.kind === "AI" ? <Sparkles size={13} aria-hidden="true" /> : r.kind === "TEACHER" ? <GraduationCap size={13} aria-hidden="true" /> : null}<b>{r.kind === "AI" ? t("AI tutor") : r.kind === "TEACHER" ? t("Teacher") : r.by}</b></div><p className="doubt-t">{r.text}</p></div>)}
      {reply?.id === d.id ? <div className="row" style={{ gap: 6 }}><input className="input" style={{ flex: 1, minWidth: 0 }} autoFocus maxLength={1500} value={reply!.text} onChange={(e) => setReply({ id: d.id, text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && reply!.text.trim().length > 1 && void send(d.id)} aria-label={t("Your answer")} /><button type="button" className="btn btn-sm btn-primary" disabled={busy === d.id || reply!.text.trim().length < 2} onClick={() => send(d.id)}>{t("Send")}</button><button type="button" className="btn btn-sm" onClick={() => setReply(null)}>{t("Cancel")}</button></div>
        : <div className="row" style={{ gap: 6, flexWrap: "wrap" }}><button type="button" className="btn btn-sm" onClick={() => setReply({ id: d.id, text: "" })}>{t("Reply")}</button>
          {d.mine && !d.replies.some((r: any) => r.kind === "AI") && <button type="button" className="btn btn-sm" disabled={busy === `ai${d.id}`} onClick={() => ai(d.id)}><Sparkles size={14} aria-hidden="true" />{busy === `ai${d.id}` ? t("Thinking…") : t("Ask AI tutor")}</button>}
          {d.mine && <button type="button" className="btn btn-sm" onClick={() => done(d)}><CircleCheck size={14} aria-hidden="true" />{d.resolved ? t("Reopen") : t("Mark solved")}</button>}
          {d.mine && <button type="button" className="btn btn-sm btn-ghost icon-btn" onClick={() => del(d.id)} aria-label={t("Delete")}><Trash2 size={14} /></button>}</div>}
    </li>)}</ul> : <p className="sub" style={{ margin: 0 }}>{t("No doubts yet. Be the first to ask.")}</p>}
  </section>;
}
