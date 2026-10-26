import { useCallback, useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Send, CircleCheck, Trash2, PlayCircle } from "lucide-react";
import Shell from "../components/Shell"; import AdminCourseNav from "../components/AdminCourseNav"; import { SkeletonRows, toast } from "../components/ui"; import { api } from "../lib/api"; import { clock } from "../components/CoursePlayer";

/** Admin: students' doubts from all lessons. Answering marks the doubt solved and sends the student a push notification. */
export default function AdminDoubts() {
  const [status, setStatus] = useState<"open" | "all">("open"); const [courseId, setCourseId] = useState(""); const [courses, setCourses] = useState<any[]>([]); const [list, setList] = useState<any[] | null>(null); const [err, setErr] = useState("");
  const [text, setText] = useState<Record<string, string>>({}); const [busy, setBusy] = useState("");
  useEffect(() => { api("/admin/courses").then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const load = useCallback(() => api(`/admin/doubts?status=${status}&courseId=${courseId}`).then((d) => { setList(Array.isArray(d) ? d : []); setErr(""); }).catch((e) => { setErr(e.message); setList([]); }), [status, courseId]);
  useEffect(() => { setList(null); void load(); }, [load]);
  const reply = async (id: string) => { setBusy(id); try { await api(`/doubts/${id}/replies`, "POST", { text: text[id] }); setText((o) => ({ ...o, [id]: "" })); toast("Answer sent.", "ok"); await load(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(""); } };
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); await load(); } catch (e: any) { toast(e.message, "bad"); } };
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Doubts</h1><p className="sub">Questions students asked under your lessons. Your answer is shown with a “Teacher” label.</p></div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><div className="seg" role="group" aria-label="Filter"><button type="button" aria-pressed={status === "open"} className={status === "open" ? "on" : ""} onClick={() => setStatus("open")}>Unanswered</button><button type="button" aria-pressed={status === "all"} className={status === "all" ? "on" : ""} onClick={() => setStatus("all")}>All</button></div>
        <select className="select" aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ maxWidth: 240 }}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div></div>
    <AdminCourseNav />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!list ? <SkeletonRows rows={3} /> : list.length ? <div className="stack" style={{ gap: 10 }}>{list.map((d) => <article key={d.id} className="card card-pad stack" style={{ gap: 8 }}>
      <div className="row between" style={{ gap: 8, flexWrap: "wrap" }}><div style={{ minWidth: 0 }}><b>{d.name}</b> <span className="sub">{d.email}</span><div className="sub">{d.course} › {d.lesson}{d.atSec > 0 ? ` · at ${clock(d.atSec)}` : ""} · {new Date(d.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div></div>
        <div className="row" style={{ gap: 6 }}>{d.resolved && <span className="pill pill-ok"><CircleCheck size={12} />Solved</span>}<Link className="btn btn-sm" to={`/courses/${d.courseId}?lesson=${d.lessonId}`}><PlayCircle size={14} />Open lesson</Link>
          <button className="btn btn-sm" onClick={() => act(() => api(`/doubts/${d.id}/resolve`, "POST", { resolved: !d.resolved }))}>{d.resolved ? "Reopen" : "Mark solved"}</button>
          <button className="btn btn-sm btn-danger" aria-label="Delete doubt" onClick={() => { if (confirm("Delete this doubt?")) void act(() => api(`/doubts/${d.id}`, "DELETE")); }}><Trash2 size={14} /></button></div></div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.text}</p>
      {d.replies.map((r: any) => <div key={r.id} className={`doubt-r ${r.kind.toLowerCase()}`}><b>{r.by}</b><p className="doubt-t">{r.text}</p></div>)}
      <div className="row" style={{ gap: 8 }}><label className="sr" htmlFor={`a-${d.id}`}>Your answer</label><input id={`a-${d.id}`} className="input" style={{ flex: 1, minWidth: 0 }} maxLength={1500} value={text[d.id] ?? ""} onChange={(e) => setText((o) => ({ ...o, [d.id]: e.target.value }))} placeholder="Type your answer…" onKeyDown={(e) => e.key === "Enter" && (text[d.id] ?? "").trim().length > 1 && void reply(d.id)} />
        <button className="btn btn-primary" disabled={busy === d.id || (text[d.id] ?? "").trim().length < 2} onClick={() => reply(d.id)}><Send size={15} />Answer</button></div>
    </article>)}</div> : <div className="card empty"><CircleCheck size={32} /><p>{status === "open" ? "No unanswered doubts. Nice!" : "No doubts yet."}</p></div>}
  </div></Shell>;
}
