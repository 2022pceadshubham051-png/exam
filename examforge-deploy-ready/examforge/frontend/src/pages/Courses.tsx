import { useEffect, useMemo, useState, type ReactNode } from "react"; import { Link, useParams, useSearchParams } from "react-router-dom";
import { GraduationCap, PlayCircle, Lock, CircleCheck, Circle, FileText, ExternalLink, ChevronLeft, ChevronRight, Clock, Hourglass, BookOpen } from "lucide-react";
import Shell from "../components/Shell"; import Poster from "../components/Poster"; import { Empty, PageHeader, SkeletonRows, toast } from "../components/ui";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { embedUrl, rupees } from "../lib/courses"; import { getMe } from "../lib/auth";

const price = (t: (k: string) => string, n: number) => (n > 0 ? rupees(n) : t("Free"));

/** Small status chip shown on course cards. */
function Badge({ s }: { s: string | null }) {
  const t = useT();
  if (s === "ACTIVE") return <span className="pill pill-ok">{t("Enrolled")}</span>;
  if (s === "PENDING") return <span className="pill pill-warn">{t("Payment under review")}</span>;
  return null;
}

/** Course catalogue: every published course, with my enrolled courses first. */
export default function Courses() {
  const t = useT(); const [list, setList] = useState<any[] | null>(null); const [tab, setTab] = useState<"all" | "mine">("all"); const [err, setErr] = useState("");
  useEffect(() => { api("/courses").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setList([]); }); }, []);
  const mine = useMemo(() => (list ?? []).filter((c) => c.enrollment), [list]);
  const shown = tab === "mine" ? mine : list ?? [];
  return <Shell><div className="stack stagger" style={{ gap: 20 }}>
    <PageHeader title={t("Courses")} sub={t("Video lessons with notes, made for your exam.")} />
    <nav className="seg" aria-label={t("Courses")}>
      <button type="button" className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>{t("All courses")}</button>
      <button type="button" className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>{t("My courses")}{mine.length ? ` (${mine.length})` : ""}</button>
    </nav>
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!list ? <SkeletonRows rows={3} /> : shown.length ? <div className="course-grid">{shown.map((c) => <Link key={c.id} to={`/courses/${c.id}`} className="card course-card tap-card">
      <Poster src={c.posterUrl} title={c.title} />
      <div className="course-body">
        <div className="row between" style={{ gap: 8 }}>{c.examName ? <span className="pill pill-brand">{c.examName}</span> : <span />}<Badge s={c.enrollment} /></div>
        <b className="course-title">{c.title}</b>
        {c.description && <p className="sub course-desc">{c.description}</p>}
        <div className="course-meta"><span><PlayCircle size={14} aria-hidden="true" />{c.lessonCount} {t("lessons")}</span><span><BookOpen size={14} aria-hidden="true" />{c.subjectCount} {t("subjects")}</span></div>
        {c.enrollment === "ACTIVE" ? <div><div className="bar" role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("Progress")}><i style={{ width: `${c.progress}%` }} /></div><span className="sub">{c.progress}% {t("complete")}</span></div>
          : <div className="course-price">{price(t, c.priceInr)}</div>}
      </div></Link>)}</div>
      : <Empty icon={<GraduationCap size={32} />} title={tab === "mine" ? t("You have not enrolled in any course yet") : t("No courses yet")}>{tab === "mine" ? t("Open All courses and pick one to start learning.") : t("New courses will appear here soon.")}</Empty>}
  </div></Shell>;
}

/** Tiny, safe notes renderer: "# heading", "- bullet", blank-line separated paragraphs, and clickable links. Never renders HTML. */
function Notes({ text }: { text: string }) {
  const linkify = (s: string): ReactNode[] => s.split(/(https?:\/\/[^\s)]+)/g).map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p);
  const out: ReactNode[] = []; let bullets: string[] = [];
  const flush = () => { if (bullets.length) { out.push(<ul key={`u${out.length}`}>{bullets.map((b, i) => <li key={i}>{linkify(b)}</li>)}</ul>); bullets = []; } };
  text.split("\n").forEach((raw, i) => {
    const l = raw.trimEnd();
    if (/^\s*[-*•]\s+/.test(l)) { bullets.push(l.replace(/^\s*[-*•]\s+/, "")); return; }
    flush();
    if (/^#{1,3}\s+/.test(l)) out.push(<h4 key={i}>{l.replace(/^#{1,3}\s+/, "")}</h4>);
    else if (l.trim()) out.push(<p key={i}>{linkify(l)}</p>);
  });
  flush(); return <div className="notes">{out}</div>;
}

/** One course: poster, enroll / payment, curriculum, and the player with lecture notes. */
export function CourseDetail() {
  const t = useT(); const { id } = useParams(); const [qs, setQs] = useSearchParams(); const isAdmin = getMe()?.role === "ADMIN";
  const [c, setC] = useState<any>(null); const [err, setErr] = useState(""); const [lesson, setLesson] = useState<any>(null); const [lerr, setLerr] = useState(""); const [busy, setBusy] = useState(false); const [ref, setRef] = useState("");
  const load = () => api(`/courses/${id}`).then(setC).catch((e) => setErr(e.message));
  useEffect(() => { setC(null); void load(); }, [id]); // eslint-disable-line
  const flat = useMemo(() => (c?.subjects ?? []).flatMap((s: any) => s.lessons.map((l: any) => ({ ...l, subject: s.name }))), [c]);
  const lid = qs.get("lesson"); const cur = flat.find((l: any) => l.id === lid);
  useEffect(() => {
    setLesson(null); setLerr(""); if (!lid || !cur || cur.locked) return;
    let live = true; api(`/courses/${id}/lessons/${lid}`).then((d) => live && setLesson(d)).catch((e) => live && setLerr(e.message)); return () => { live = false; };
  }, [lid, id, cur?.locked]); // eslint-disable-line
  const open = (l: any) => { if (l.locked) { toast(t("Enroll to unlock this lesson."), "info"); return; } setQs({ lesson: l.id }, { replace: false }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const idx = flat.findIndex((l: any) => l.id === lid), prev = idx > 0 ? flat[idx - 1] : null, next = idx >= 0 ? flat.slice(idx + 1).find((l: any) => !l.locked) : null;
  const enroll = async () => {
    setBusy(true); setErr("");
    try { const r = await api(`/courses/${id}/enroll`, "POST", c.priceInr > 0 ? { paymentRef: ref } : {}); toast(r.status === "ACTIVE" ? t("You are enrolled. Happy learning!") : t("Payment sent. You get access as soon as it is approved."), "ok"); await load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const mark = async (done: boolean) => { if (!lesson) return; setLesson({ ...lesson, done }); try { await api(`/courses/lessons/${lesson.id}/done`, "POST", { done }); await load(); } catch (e: any) { setLesson({ ...lesson, done: !done }); toast(e.message, "bad"); } };

  if (err && !c) return <Shell narrow><div className="stack"><Link className="sub" to="/courses"><ChevronLeft size={14} aria-hidden="true" />{t("All courses")}</Link><div className="alert alert-bad" role="alert">{err}</div></div></Shell>;
  if (!c) return <Shell narrow><SkeletonRows rows={4} /></Shell>;
  const active = c.enrollment === "ACTIVE" || isAdmin;

  return <Shell><div className="stack" style={{ gap: 18 }}>
    <Link className="sub row" style={{ gap: 4 }} to="/courses"><ChevronLeft size={14} aria-hidden="true" />{t("All courses")}</Link>

    {cur && !cur.locked ? <div className="course-watch">
      <section className="stack" style={{ gap: 12, minWidth: 0 }} aria-label={cur.title}>
        {lerr ? <div className="alert alert-bad" role="alert">{lerr}</div>
          : !lesson ? <div className="player player-wait"><div className="spinner" aria-hidden="true" /></div>
          : lesson.youtubeId ? <div className="player"><iframe src={embedUrl(lesson.youtubeId)} title={lesson.title} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
          : <div className="player player-wait"><span className="sub">{t("No video for this lesson yet.")}</span></div>}
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}><span className="sub">{cur.subject}</span><h2 className="card-title" style={{ margin: 0 }}>{cur.title}</h2></div>
          {lesson && <button className={`btn ${lesson.done ? "" : "btn-primary"}`} onClick={() => mark(!lesson.done)}>{lesson.done ? <CircleCheck size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}{lesson.done ? t("Completed") : t("Mark as complete")}</button>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" disabled={!prev || prev.locked} onClick={() => prev && open(prev)}><ChevronLeft size={15} aria-hidden="true" />{t("Previous")}</button>
          <button className="btn btn-sm" disabled={!next} onClick={() => next && open(next)}>{t("Next lesson")}<ChevronRight size={15} aria-hidden="true" /></button>
        </div>
        {lesson && (lesson.notes || lesson.notesUrl) && <div className="card card-pad stack" style={{ gap: 10 }}>
          <h3 className="card-title row" style={{ gap: 8, margin: 0 }}><FileText size={18} aria-hidden="true" />{t("Lecture notes")}</h3>
          {lesson.notes && <Notes text={lesson.notes} />}
          {lesson.notesUrl && <a className="btn btn-sm" style={{ justifySelf: "start" }} href={lesson.notesUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />{t("Open notes (PDF / link)")}</a>}
        </div>}
      </section>
      <Curriculum c={c} lid={lid} open={open} t={t} />
    </div> : <>
      <div className="course-hero card">
        <Poster src={c.posterUrl} title={c.title} />
        <div className="stack" style={{ gap: 10, padding: "var(--s-5)" }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{c.examName && <span className="pill pill-brand">{c.examName}</span>}<Badge s={c.enrollment} /></div>
          <h1 className="h1" style={{ margin: 0 }}>{c.title}</h1>
          {c.description && <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{c.description}</p>}
          <div className="course-meta"><span><PlayCircle size={14} aria-hidden="true" />{c.lessonCount} {t("lessons")}</span><span><BookOpen size={14} aria-hidden="true" />{c.subjects.length} {t("subjects")}</span></div>
          {active ? <>{c.enrollment === "ACTIVE" && <div><div className="bar"><i style={{ width: `${c.progress}%` }} /></div><span className="sub">{c.progress}% {t("complete")}</span></div>}
              {flat.length > 0 && <button className="btn btn-primary btn-lg" style={{ justifySelf: "start" }} onClick={() => open(flat.find((l: any) => !l.done) ?? flat[0])}><PlayCircle size={18} aria-hidden="true" />{c.progress > 0 ? t("Continue learning") : t("Start learning")}</button>}</>
            : c.enrollment === "PENDING" ? <div className="alert alert-warn" role="status"><Hourglass size={18} aria-hidden="true" /><span>{t("Payment under review")}: {c.paymentRef}. {t("You get access as soon as it is approved.")}</span></div>
            : <div className="stack" style={{ gap: 10 }}>
              <div className="course-price big">{price(t, c.priceInr)}</div>
              {c.priceInr > 0 && <>
                {c.paymentInfo && <div className="card card-pad" style={{ background: "var(--surface-2)" }}><b>{t("How to pay")}</b><p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{c.paymentInfo}</p></div>}
                <label className="label" htmlFor="payref">{t("Payment / UPI transaction ID")}</label>
                <input id="payref" className="input" value={ref} maxLength={80} onChange={(e) => setRef(e.target.value)} placeholder={t("Paste the transaction ID after paying")} style={{ maxWidth: 380 }} />
              </>}
              {err && <div className="alert alert-bad" role="alert">{err}</div>}
              <button className="btn btn-primary btn-lg" style={{ justifySelf: "start" }} disabled={busy || (c.priceInr > 0 && ref.trim().length < 4)} onClick={enroll}><GraduationCap size={18} aria-hidden="true" />{c.priceInr > 0 ? t("Submit payment & enroll") : t("Enroll for free")}</button>
            </div>}
        </div>
      </div>
      <Curriculum c={c} lid={lid} open={open} t={t} wide />
    </>}
  </div></Shell>;
}

function Curriculum({ c, lid, open, t, wide }: { c: any; lid: string | null; open: (l: any) => void; t: (k: string) => string; wide?: boolean }) {
  return <aside className={`card curriculum ${wide ? "wide" : ""}`} aria-label={t("Course content")}>
    <div className="curr-head"><b>{t("Course content")}</b><span className="sub">{c.lessonCount} {t("lessons")}{c.enrollment === "ACTIVE" ? ` · ${c.progress}%` : ""}</span></div>
    {c.subjects.length ? c.subjects.map((s: any) => <details key={s.id} className="curr-sub" open={wide || s.lessons.some((l: any) => l.id === lid) || undefined}>
      <summary><b>{s.name}</b><span className="sub">{s.lessons.length}</span></summary>
      <ul>{s.lessons.map((l: any) => <li key={l.id}><button type="button" className={`curr-lesson ${l.id === lid ? "on" : ""} ${l.locked ? "locked" : ""}`} onClick={() => open(l)} aria-current={l.id === lid ? "true" : undefined}>
        <span className="curr-ico" aria-hidden="true">{l.locked ? <Lock size={15} /> : l.done ? <CircleCheck size={15} /> : <PlayCircle size={15} />}</span>
        <span className="curr-t">{l.title}</span>
        {l.isPreview && c.enrollment !== "ACTIVE" && <span className="pill pill-brand">{t("Free preview")}</span>}
        {l.durationMin ? <span className="sub curr-d"><Clock size={12} aria-hidden="true" />{l.durationMin}m</span> : null}
      </button></li>)}</ul></details>) : <p className="sub" style={{ padding: 14 }}>{t("Lessons are coming soon.")}</p>}
  </aside>;
}
