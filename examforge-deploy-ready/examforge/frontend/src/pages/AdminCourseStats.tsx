import { useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { IndianRupee, UserPlus, GraduationCap, Hourglass, TrendingDown, TrendingUp, Send, Star, BellRing } from "lucide-react";
import Shell from "../components/Shell"; import AdminCourseNav from "../components/AdminCourseNav"; import { SkeletonRows, toast } from "../components/ui"; import { api } from "../lib/api"; import { rupees } from "../lib/courses";

const num = (n: number) => n.toLocaleString("en-IN");
const delta = (now: number, prev: number) => (prev === 0 ? (now > 0 ? null : 0) : Math.round(((now - prev) / prev) * 100));

function Delta({ now, prev }: { now: number; prev: number }) {
  const d = delta(now, prev); if (d === null) return <span className="sub">new</span>; if (d === 0) return <span className="sub">no change</span>;
  const up = d > 0; return <span className={`kpi-delta ${up ? "up" : "down"}`}>{up ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}{up ? "+" : ""}{d}% <span className="sub">vs previous</span></span>;
}
function Kpi({ icon, label, value, foot }: { icon: React.ReactNode; label: string; value: string; foot?: React.ReactNode }) {
  return <div className="card card-pad kpi"><div className="kpi-l">{icon}<span>{label}</span></div><b className="kpi-v">{value}</b><div className="kpi-f">{foot}</div></div>;
}
/** Simple accessible bar chart: one bar per day, value in the tooltip, first/last date and the maximum on the axis. */
function Bars({ data, get, fmt, label }: { data: any[]; get: (d: any) => number; fmt: (n: number) => string; label: string }) {
  const max = Math.max(1, ...data.map(get)), W = 640, H = 150, bw = W / data.length;
  return <figure className="chart" style={{ margin: 0 }}><svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={label} preserveAspectRatio="none" style={{ width: "100%", height: 190 }}>
    <line x1="0" x2={W} y1={H} y2={H} stroke="var(--border)" />{[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--border)" strokeDasharray="3 5" />)}
    {data.map((d, i) => { const v = get(d), h = (v / max) * (H - 6); return <g key={d.day}><rect x={i * bw + bw * 0.14} width={Math.max(1, bw * 0.72)} y={H - h} height={h} rx={Math.min(3, bw / 4)} fill="var(--brand)" opacity={v ? 1 : 0.15}><title>{`${d.day}: ${fmt(v)}`}</title></rect></g>; })}
    <text x="0" y={H + 16} fontSize="11" fill="var(--muted)">{data[0]?.day.slice(5)}</text><text x={W} y={H + 16} fontSize="11" fill="var(--muted)" textAnchor="end">{data[data.length - 1]?.day.slice(5)}</text>
    <text x={W} y="11" fontSize="11" fill="var(--muted)" textAnchor="end">max {fmt(max)}</text></svg></figure>;
}

export default function AdminCourseStats() {
  const [days, setDays] = useState(30); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [sel, setSel] = useState<string>("");
  useEffect(() => { setD(null); api(`/admin/course-stats?days=${days}`).then((r) => { setD(r); setSel((s) => s || r.courses[0]?.id || ""); }).catch((e) => setErr(e.message)); }, [days]);
  const t = d?.totals;
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Course dashboard</h1><p className="sub">Money, new students, what is working, and where students stop watching.</p></div>
      <div className="seg" role="group" aria-label="Period">{[7, 30, 90].map((n) => <button key={n} type="button" aria-pressed={days === n} className={days === n ? "on" : ""} onClick={() => setDays(n)}>{n} days</button>)}</div></div>
    <AdminCourseNav />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!d ? <SkeletonRows rows={4} /> : <>
      <div className="kpi-grid">
        <Kpi icon={<IndianRupee size={16} />} label={`Revenue (${days} days)`} value={rupees(t.revenuePeriod) === "Free" ? "₹0" : rupees(t.revenuePeriod)} foot={<Delta now={t.revenuePeriod} prev={t.revenuePrev} />} />
        <Kpi icon={<UserPlus size={16} />} label="New students" value={num(t.newStudents)} foot={<Delta now={t.newStudents} prev={t.newStudentsPrev} />} />
        <Kpi icon={<GraduationCap size={16} />} label="New enrollments" value={num(t.enrollmentsPeriod)} foot={<Delta now={t.enrollmentsPeriod} prev={t.enrollmentsPrev} />} />
        <Kpi icon={<Hourglass size={16} />} label="Waiting for approval" value={num(t.pending)} foot={t.pending ? <Link to="/admin/students?status=PENDING">Review now</Link> : <span className="sub">All clear</span>} />
      </div>
      <p className="sub" style={{ margin: 0 }}>All time: {num(t.students)} students · {num(t.activeEnrollments)} enrollments · {rupees(t.revenue) === "Free" ? "₹0" : rupees(t.revenue)} revenue{t.discountPeriod > 0 ? ` · ${rupees(t.discountPeriod)} given as coupon discounts in this period` : ""}.</p>
      <div className="chart-grid">
        <section className="card card-pad stack" style={{ gap: 8 }}><b>Revenue per day</b><Bars data={d.series} get={(x) => x.revenue} fmt={(n) => `₹${num(n)}`} label="Revenue per day" /></section>
        <section className="card card-pad stack" style={{ gap: 8 }}><b>New students per day</b><Bars data={d.series} get={(x) => x.signups} fmt={(n) => num(n)} label="New students per day" /></section>
      </div>

      <section className="card stack" style={{ gap: 0, overflow: "hidden" }} aria-label="Courses ranked">
        <div className="card-pad"><b>Which course is running?</b><p className="sub" style={{ margin: "2px 0 0" }}>Ranked by new enrollments in the last {days} days. Tap a row to see where its students drop off.</p></div>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Course</th><th className="num">New</th><th className="num">Revenue</th><th className="num">Students</th><th className="num">Watched</th><th className="num">Rating</th></tr></thead><tbody>
          {d.courses.map((c: any, i: number) => <tr key={c.id} className={`tbl-click ${sel === c.id ? "sel" : ""}`} tabIndex={0} onClick={() => setSel(c.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(c.id)} aria-selected={sel === c.id}>
            <td><b>{i + 1}. {c.title}</b>{!c.published && <span className="pill pill-warn" style={{ marginLeft: 6 }}>Draft</span>}{c.pending > 0 && <span className="pill pill-warn" style={{ marginLeft: 6 }}>{c.pending} pending</span>}</td>
            <td className="num">{num(c.enrollmentsPeriod)}</td><td className="num">₹{num(c.revenuePeriod)}</td><td className="num">{num(c.students)}</td>
            <td className="num"><span className="mini-bar" aria-hidden="true"><i style={{ width: `${c.completionPct}%` }} /></span> {c.completionPct}%</td><td className="num">{c.ratingCount ? <><Star size={12} aria-hidden="true" style={{ verticalAlign: "-1px" }} /> {c.rating.toFixed(1)} ({c.ratingCount})</> : "–"}</td></tr>)}
          {!d.courses.length && <tr><td colSpan={6} className="sub" style={{ padding: 16 }}>No courses yet.</td></tr>}</tbody></table></div>
      </section>
      {sel && <DropOff key={sel} id={sel} courses={d.courses} onPick={setSel} />}
      <PushCard courses={d.courses} />
    </>}
  </div></Shell>;
}

function DropOff({ id, courses, onPick }: { id: string; courses: any[]; onPick: (id: string) => void }) {
  const [r, setR] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/admin/courses/${id}/dropoff`).then(setR).catch((e) => setErr(e.message)); }, [id]);
  const worst = r?.worst ? r.lessons[r.worst.index] : null, before = r?.worst ? r.lessons[r.worst.index - 1] : null;
  return <section className="card card-pad stack" style={{ gap: 12 }} aria-label="Drop-off">
    <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}><div><b>Where do students drop off?</b><p className="sub" style={{ margin: "2px 0 0" }}>Share of enrolled students who marked each lesson complete.</p></div>
      <select className="select" value={id} onChange={(e) => onPick(e.target.value)} aria-label="Course" style={{ maxWidth: 320 }}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!r ? <SkeletonRows rows={3} /> : r.students === 0 ? <p className="sub">No enrolled students yet.</p> : <>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className="pill">{r.students} students</span><span className="pill">{r.started} started</span><span className={`pill ${r.neverStarted ? "pill-warn" : ""}`}>{r.neverStarted} never started</span></div>
      {worst && <div className="alert alert-warn" role="status"><TrendingDown size={17} aria-hidden="true" /><span>Biggest drop: <b>{r.worst.dropPct}%</b> fewer students finish “{worst.title}” than the lesson before{before ? ` (“${before.title}”)` : ""}. Check that video, its length or the notes.</span></div>}
      <ol className="funnel">{r.lessons.map((l: any, i: number) => <li key={l.id} className={worst && r.worst.index === i ? "worst" : ""}>
        <div className="funnel-t"><span className="sub">{l.subject}</span><b>{l.title}</b></div>
        <div className="funnel-bar" title={`${l.done} of ${r.students} students`}><i style={{ width: `${l.pct}%` }} /></div><span className="funnel-n">{l.pct}%<small>{l.done}</small></span>
        <span className={`funnel-d ${l.dropPct >= 25 ? "bad" : ""}`}>{i > 0 && l.dropPct > 0 ? `−${l.dropPct}%` : ""}</span></li>)}</ol></>}
  </section>;
}

function PushCard({ courses }: { courses: any[] }) {
  const [st, setSt] = useState<any>(null); const [f, setF] = useState({ title: "", body: "", url: "", courseId: "" }); const [busy, setBusy] = useState(false); const [res, setRes] = useState<any>(null);
  useEffect(() => { api("/admin/push/status").then(setSt).catch(() => setSt({ enabled: false, devices: 0, users: 0 })); }, []);
  const send = async () => { setBusy(true); setRes(null); try { setRes(await api("/admin/push", "POST", { ...f, url: f.url || undefined })); toast("Notification sent.", "ok"); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); } };
  const set = (k: string) => (e: { target: { value: string } }) => setF((o) => ({ ...o, [k]: e.target.value }));
  return <section className="card card-pad stack" style={{ gap: 10 }} aria-label="Send notification">
    <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}><b className="row" style={{ gap: 8 }}><BellRing size={18} aria-hidden="true" />Send a push notification</b>{st && <span className="sub">{st.enabled ? `${st.users} students on ${st.devices} devices have notifications on` : "Not set up yet"}</span>}</div>
    {st && !st.enabled && <div className="alert alert-warn">Add VAPID keys to the backend to switch notifications on (steps in DEPLOY.md).</div>}
    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}><div style={{ flex: 2, minWidth: 200 }}><label className="label" htmlFor="pn-t">Title</label><input id="pn-t" className="input" maxLength={80} value={f.title} onChange={set("title")} placeholder="New batch starts Monday" /></div>
      <div style={{ flex: 1, minWidth: 180 }}><label className="label" htmlFor="pn-c">Send to</label><select id="pn-c" className="select" value={f.courseId} onChange={set("courseId")}><option value="">Everyone with notifications on</option>{courses.map((c) => <option key={c.id} value={c.id}>Students of: {c.title}</option>)}</select></div></div>
    <div><label className="label" htmlFor="pn-b">Message</label><textarea id="pn-b" className="textarea" rows={2} maxLength={240} value={f.body} onChange={set("body")} placeholder="Live doubt session at 7 pm. Join from the Courses tab." /></div>
    <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}><div style={{ flex: 1, minWidth: 200 }}><label className="label" htmlFor="pn-u">Opens (optional)</label><input id="pn-u" className="input" value={f.url} onChange={set("url")} placeholder="/courses" /></div>
      <button className="btn btn-primary" disabled={busy || !st?.enabled || f.title.trim().length < 2 || f.body.trim().length < 2} onClick={send}><Send size={15} aria-hidden="true" />Send</button></div>
    {res && <p className="sub" style={{ margin: 0 }}>Delivered to {res.sent} devices{res.failed ? `, ${res.failed} failed` : ""} ({res.audience} students targeted).</p>}
  </section>;
}
