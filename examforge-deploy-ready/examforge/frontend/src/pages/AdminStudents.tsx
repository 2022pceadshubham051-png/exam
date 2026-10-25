import { useCallback, useEffect, useRef, useState } from "react"; import { Link, useSearchParams } from "react-router-dom";
import { Search, UserPlus, CheckCheck, Check, X, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import Shell from "../components/Shell"; import AdminCourseNav from "../components/AdminCourseNav"; import { Modal, SkeletonRows, toast } from "../components/ui"; import { api } from "../lib/api"; import { rupees } from "../lib/courses";

/** Admin: find students, enroll them by hand (single or a pasted list of emails), approve payments one by one or in bulk. */
export default function AdminStudents() {
  const [qs, setQs] = useSearchParams(); const [q, setQ] = useState(qs.get("q") ?? ""); const [courseId, setCourseId] = useState(qs.get("courseId") ?? ""); const [status, setStatus] = useState(qs.get("status") ?? ""); const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null); const [courses, setCourses] = useState<any[]>([]); const [err, setErr] = useState(""); const [pick, setPick] = useState<Set<string>>(new Set()); const [busy, setBusy] = useState(false);
  const [enroll, setEnroll] = useState<{ emails: string; courseId: string; amount: string } | null>(null); const [result, setResult] = useState<any>(null); const debounce = useRef<number>();
  useEffect(() => { api("/admin/courses").then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const load = useCallback(() => { const p = new URLSearchParams({ q, courseId, status, page: String(page) }); return api(`/admin/students?${p}`).then((d) => { setData(d); setErr(""); }).catch((e) => setErr(e.message)); }, [q, courseId, status, page]);
  useEffect(() => { window.clearTimeout(debounce.current); debounce.current = window.setTimeout(() => void load(), q ? 300 : 0); return () => window.clearTimeout(debounce.current); }, [load]); // eslint-disable-line
  useEffect(() => { setQs((o) => { const n = new URLSearchParams(); if (q) n.set("q", q); if (courseId) n.set("courseId", courseId); if (status) n.set("status", status); return n; }, { replace: true }); }, [q, courseId, status]); // eslint-disable-line
  const filter = (fn: () => void) => { fn(); setPage(1); setPick(new Set()); };
  const pendingIds = (data?.rows ?? []).flatMap((u: any) => u.enrollments.filter((e: any) => e.status === "PENDING" && (!courseId || e.courseId === courseId)).map((e: any) => e.id));
  const act = async (fn: () => Promise<any>, ok: (r: any) => string) => { setBusy(true); try { const r = await fn(); toast(ok(r), "ok"); setPick(new Set()); await load(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); } };
  const approve = (ids: string[]) => act(() => api("/admin/enrollments/bulk-approve", "POST", { ids }), (r) => `${r.approved} approved.`);
  const approveAll = () => { if (confirm(`Approve every pending payment${courseId ? " of this course" : ""}? Check the transaction IDs first.`)) void act(() => api("/admin/enrollments/bulk-approve", "POST", courseId ? { courseId } : { all: true }), (r) => `${r.approved} approved.`); };
  const reject = (id: string) => { if (confirm("Reject this payment?")) void act(() => api(`/admin/enrollments/${id}`, "DELETE"), () => "Rejected."); };
  const submitEnroll = async () => {
    if (!enroll) return; const emails = enroll.emails.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean); setBusy(true); setResult(null);
    try { setResult(await api("/admin/enroll", "POST", { courseId: enroll.courseId, emails, amountInr: Number(enroll.amount) || 0 })); await load(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const toggle = (id: string) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Students</h1><p className="sub">Search students, enroll them yourself and approve payments in bulk.</p></div>
      <button className="btn btn-primary" onClick={() => { setResult(null); setEnroll({ emails: "", courseId: courseId || courses[0]?.id || "", amount: "0" }); }}><UserPlus size={16} />Enroll students</button></div>
    <AdminCourseNav />
    <div className="card card-pad row" style={{ gap: 10, flexWrap: "wrap" }}>
      <div className="search" style={{ flex: 2, minWidth: 220, position: "relative" }}><Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: 13, color: "var(--muted)" }} /><label className="sr" htmlFor="st-q">Search students</label><input id="st-q" className="input" style={{ paddingLeft: 36 }} placeholder="Search name or email" value={q} onChange={(e) => filter(() => setQ(e.target.value))} /></div>
      <select className="select" style={{ flex: 1, minWidth: 180 }} aria-label="Course" value={courseId} onChange={(e) => filter(() => setCourseId(e.target.value))}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <select className="select" style={{ width: 180 }} aria-label="Status" value={status} onChange={(e) => filter(() => setStatus(e.target.value))}><option value="">Any status</option><option value="ACTIVE">Enrolled</option><option value="PENDING">Waiting for approval</option></select></div>
    {(pendingIds.length > 0 || status === "PENDING") && <div className="card card-pad row between" style={{ gap: 10, flexWrap: "wrap", background: "var(--warn-soft)" }}>
      <span><b>{pendingIds.length}</b> payment{pendingIds.length === 1 ? "" : "s"} waiting on this page. Match each transaction ID with your bank/UPI app first.</span>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button className="btn btn-sm" disabled={busy || !pick.size} onClick={() => approve([...pick])}><Check size={14} />Approve selected ({pick.size})</button><button className="btn btn-sm" disabled={busy || !pendingIds.length} onClick={() => setPick(new Set(pendingIds))}>Select all on page</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={approveAll}><CheckCheck size={14} />Approve all pending{courseId ? " (this course)" : ""}</button></div></div>}
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!data ? <SkeletonRows rows={4} /> : data.rows.length ? <div className="stack" style={{ gap: 8 }}>
      <p className="sub" style={{ margin: 0 }}>{data.total} student{data.total === 1 ? "" : "s"}</p>
      {data.rows.map((u: any) => <div key={u.id} className="card card-pad stack" style={{ gap: 8 }}>
        <div className="row between" style={{ gap: 8, flexWrap: "wrap" }}><div style={{ minWidth: 0 }}><b>{u.name}</b> <span className="sub">{u.email}</span></div>
          <div className="row" style={{ gap: 8 }}><span className={`pill ${u.verified ? "pill-ok" : "pill-warn"}`}>{u.verified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}{u.verified ? "Email verified" : "Not verified"}</span><span className="sub">Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button className="btn btn-sm" onClick={() => { setResult(null); setEnroll({ emails: u.email, courseId: courseId || courses[0]?.id || "", amount: "0" }); }}><UserPlus size={13} />Enroll</button></div></div>
        {u.enrollments.length > 0 && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{u.enrollments.map((e: any) => <span key={e.id} className={`enr-chip ${e.status === "PENDING" ? "pend" : ""}`}>
          {e.status === "PENDING" && <input type="checkbox" checked={pick.has(e.id)} onChange={() => toggle(e.id)} aria-label={`Select ${e.title}`} />}
          <span>{e.title}{e.amountInr > 0 ? ` · ${rupees(e.amountInr)}` : ""}{e.source === "MANUAL" ? " · by admin" : ""}</span>
          {e.status === "PENDING" ? <><button type="button" className="chip-btn ok" aria-label={`Approve ${e.title}`} disabled={busy} onClick={() => approve([e.id])}><Check size={13} /></button><button type="button" className="chip-btn bad" aria-label={`Reject ${e.title}`} disabled={busy} onClick={() => reject(e.id)}><X size={13} /></button></> : <span className="pill pill-ok">Enrolled</span>}</span>)}</div>}
      </div>)}
      <div className="row" style={{ justifyContent: "center", gap: 10 }}><button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} />Prev</button><span className="sub">Page {data.page} of {data.pages}</span><button className="btn btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight size={14} /></button></div>
    </div> : <div className="card empty"><p>No students match. {q && <>Try a shorter search.</>}</p></div>}
    <p className="sub">Course-wise payment list: <Link to="/admin/courses">Courses → Manage → Students</Link>.</p>

    <Modal open={!!enroll} onClose={() => !busy && setEnroll(null)} title="Enroll students" width={560} dismissible={!busy}>{enroll && <div className="stack" style={{ gap: 12 }}>
      <div><label className="label" htmlFor="en-c">Course</label><select id="en-c" className="select" value={enroll.courseId} onChange={(e) => setEnroll({ ...enroll, courseId: e.target.value })}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
      <div><label className="label" htmlFor="en-e">Student emails (one per line, or separated by commas)</label><textarea id="en-e" className="textarea mono" rows={6} value={enroll.emails} onChange={(e) => setEnroll({ ...enroll, emails: e.target.value })} placeholder={"asha@gmail.com\nravi@gmail.com"} /><div className="hint">Students must already have an account with this email.</div></div>
      <div style={{ maxWidth: 220 }}><label className="label" htmlFor="en-a">Amount received (₹, for your records)</label><input id="en-a" className="input" type="number" min={0} value={enroll.amount} onChange={(e) => setEnroll({ ...enroll, amount: e.target.value })} /></div>
      {result && <div className="alert alert-ok" role="status"><div><b>{result.enrolled} enrolled.</b>{result.already.length > 0 && <div>Already enrolled: {result.already.join(", ")}</div>}{result.notFound.length > 0 && <div style={{ color: "var(--bad)" }}>No account found: {result.notFound.join(", ")}</div>}</div></div>}
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busy} onClick={() => setEnroll(null)}>{result ? "Close" : "Cancel"}</button><button className="btn btn-primary" disabled={busy || !enroll.courseId || !enroll.emails.trim()} onClick={submitEnroll}><UserPlus size={15} />Enroll</button></div></div>}</Modal>
  </div></Shell>;
}
