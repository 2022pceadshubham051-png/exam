import { useCallback, useEffect, useMemo, useRef, useState } from "react"; import { Link, useParams, useSearchParams } from "react-router-dom";
import { GraduationCap, PlayCircle, Lock, CircleCheck, Circle, FileText, ExternalLink, ChevronLeft, ChevronRight, Clock, Hourglass, BookOpen, CloudDownload, CloudOff, Share2, Link2, WifiOff } from "lucide-react";
import Shell from "../components/Shell"; import Poster from "../components/Poster"; import { Empty, PageHeader, SkeletonRows, toast } from "../components/ui";
import Notes from "../components/Notes"; import CoursePlayer, { type PlayerApi } from "../components/CoursePlayer"; import LessonNotes, { type LessonNote } from "../components/LessonNotes";
import CourseReviews, { RatingLine } from "../components/CourseReviews"; import EnrollBox from "../components/EnrollBox"; import PushToggle from "../components/PushToggle";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { rupees, shareUrl, courseUrl } from "../lib/courses"; import { getMe } from "../lib/auth"; import { useSeo } from "../lib/seo";
import { getOffline, removeOffline, saveOffline, savedIds, listOffline } from "../lib/offline";

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
    <PageHeader title={t("Courses")} sub={t("Video lessons with notes, made for your exam.")} actions={<div className="row" style={{ gap: 8, flexWrap: "wrap" }}><PushToggle /><Link className="btn btn-sm" to="/offline-notes"><CloudDownload size={15} aria-hidden="true" />{t("Offline notes")}</Link></div>} />
    <nav className="seg" aria-label={t("Courses")}>
      <button type="button" className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>{t("All courses")}</button>
      <button type="button" className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>{t("My courses")}{mine.length ? ` (${mine.length})` : ""}</button>
    </nav>
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!list ? <SkeletonRows rows={3} /> : shown.length ? <div className="course-grid">{shown.map((c) => <Link key={c.id} to={`/courses/${c.slug ?? c.id}`} className="card course-card tap-card">
      <Poster src={c.posterUrl} title={c.title} />
      <div className="course-body">
        <div className="row between" style={{ gap: 8 }}>{c.examName ? <span className="pill pill-brand">{c.examName}</span> : <span />}<Badge s={c.enrollment} /></div>
        <b className="course-title">{c.title}</b>
        <RatingLine rating={c.rating ?? 0} count={c.ratingCount ?? 0} />
        {c.description && <p className="sub course-desc">{c.description}</p>}
        <div className="course-meta"><span><PlayCircle size={14} aria-hidden="true" />{c.lessonCount} {t("lessons")}</span><span><BookOpen size={14} aria-hidden="true" />{c.subjectCount} {t("subjects")}</span></div>
        {c.enrollment === "ACTIVE" ? <div><div className="bar" role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("Progress")}><i style={{ width: `${c.progress}%` }} /></div><span className="sub">{c.progress}% {t("complete")}</span></div>
          : <div className="course-price">{price(t, c.priceInr)}</div>}
      </div></Link>)}</div>
      : <Empty icon={<GraduationCap size={32} />} title={tab === "mine" ? t("You have not enrolled in any course yet") : t("No courses yet")}>{tab === "mine" ? t("Open All courses and pick one to start learning.") : t("New courses will appear here soon.")}</Empty>}
  </div></Shell>;
}

/** One course: poster, enroll / payment, curriculum, and the player with lecture notes. */
export function CourseDetail() {
  const t = useT(); const { id } = useParams(); const [qs, setQs] = useSearchParams(); const isAdmin = getMe()?.role === "ADMIN";
  const [c, setC] = useState<any>(null); const [err, setErr] = useState(""); const [lesson, setLesson] = useState<any>(null); const [lerr, setLerr] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set()); const [offBusy, setOffBusy] = useState(false); const [hasOffline, setHasOffline] = useState(false);
  const apiRef = useRef<PlayerApi | null>(null); const bookmarkRef = useRef<(() => void) | null>(null); const myNotes = useRef<LessonNote[]>([]);
  const load = useCallback(() => api(`/courses/${id}`).then(setC).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { setC(null); setErr(""); void load(); }, [id]); // eslint-disable-line
  useEffect(() => { void listOffline().then((r) => setHasOffline(r.length > 0)).catch(() => {}); }, []);
  useEffect(() => { if (c) void savedIds(c.id).then(setSaved).catch(() => {}); }, [c?.id]); // eslint-disable-line
  useSeo(c ? { title: `${c.seoTitle || c.title} | ExamForge`, description: c.seoDescription || c.description?.slice(0, 160) || null } : null);
  const flat = useMemo(() => (c?.subjects ?? []).flatMap((s: any) => s.lessons.map((l: any) => ({ ...l, subject: s.name }))), [c]);
  const lid = qs.get("lesson"); const cur = flat.find((l: any) => l.id === lid);
  useEffect(() => {
    setLesson(null); setLerr(""); if (!lid || !cur || cur.locked) return;
    let live = true;
    api(`/courses/${id}/lessons/${lid}`).then((d) => live && setLesson(d)).catch(async (e) => {
      if (!live) return; const o = await getOffline(lid).catch(() => null); // no internet: show the saved notes instead of an error
      if (o) setLesson({ id: o.lessonId, title: o.title, youtubeId: null, notes: o.notes, notesUrl: o.notesUrl, done: false, offlineCopy: true }); else setLerr(e.message);
    });
    return () => { live = false; };
  }, [lid, id, cur?.locked]); // eslint-disable-line
  const open = (l: any) => { if (l.locked) { toast(t("Enroll to unlock this lesson."), "info"); return; } setQs({ lesson: l.id }, { replace: false }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const idx = flat.findIndex((l: any) => l.id === lid), prev = idx > 0 ? flat[idx - 1] : null, next = idx >= 0 ? flat.slice(idx + 1).find((l: any) => !l.locked) : null;
  const mark = async (done: boolean) => { if (!lesson || lesson.offlineCopy) return; setLesson({ ...lesson, done }); try { await api(`/courses/lessons/${lesson.id}/done`, "POST", { done }); await load(); } catch (e: any) { setLesson({ ...lesson, done: !done }); toast(e.message, "bad"); } };

  // ---- offline notes (text only; the video always needs internet) ----
  const record = (l: any, notes: LessonNote[]) => ({ lessonId: l.id, courseId: c.id, courseTitle: c.title, subject: flat.find((x: any) => x.id === l.id)?.subject ?? "", title: l.title, notes: l.notes ?? null, notesUrl: l.notesUrl ?? null, myNotes: notes.map((n) => ({ id: n.id, atSec: n.atSec, kind: n.kind, text: n.text })) });
  const toggleSaved = async () => {
    if (!lesson || lesson.offlineCopy) return; setOffBusy(true);
    try { if (saved.has(lesson.id)) { await removeOffline(lesson.id); setSaved((s) => { const n = new Set(s); n.delete(lesson.id); return n; }); toast(t("Removed from offline notes."), "ok"); }
      else { await saveOffline(record(lesson, myNotes.current)); void import("./OfflineNotes"); setSaved((s) => new Set(s).add(lesson.id)); setHasOffline(true); toast(t("Saved. You can read these notes without internet."), "ok"); } }
    catch (e: any) { toast(e.message, "bad"); } finally { setOffBusy(false); }
  };
  const onNotesChange = (n: LessonNote[]) => { myNotes.current = n; if (lesson && saved.has(lesson.id) && !lesson.offlineCopy) void saveOffline(record(lesson, n)).catch(() => {}); };
  const saveAll = async () => {
    setOffBusy(true); let n = 0;
    try {
      const all: LessonNote[] = await api(`/courses/${id}/my-notes`).catch(() => []), by = new Map<string, LessonNote[]>(); for (const x of all as any[]) by.set(x.lessonId, [...(by.get(x.lessonId) ?? []), x]);
      for (const l of flat.filter((x: any) => x.hasNotes && !x.locked)) { const d = await api(`/courses/${id}/lessons/${l.id}`); if (d.notes || d.notesUrl) { await saveOffline({ ...record(d, by.get(l.id) ?? []), subject: l.subject }); n++; } }
      void import("./OfflineNotes"); setSaved(await savedIds(c.id)); setHasOffline(true); toast(t("Saved notes of {n} lessons for offline reading.", { n }), "ok");
    } catch (e: any) { toast(e.message, "bad"); } finally { setOffBusy(false); }
  };
  const share = async (how: "copy" | "wa") => {
    const page = courseUrl(c.slug ?? c.id);
    if (how === "wa") { window.open(`https://wa.me/?text=${encodeURIComponent(`${c.title}\n${shareUrl(c.slug ?? c.id)}`)}`, "_blank", "noopener"); return; }
    try { if (navigator.share) await navigator.share({ title: c.title, url: page }); else { await navigator.clipboard.writeText(page); toast(t("Link copied."), "ok"); } } catch { /* cancelled */ }
  };

  if (err && !c) return <Shell narrow><div className="stack"><Link className="sub" to="/courses"><ChevronLeft size={14} aria-hidden="true" />{t("All courses")}</Link><div className="alert alert-bad" role="alert">{err}</div>
    {hasOffline && <Link className="btn" style={{ justifySelf: "start" }} to="/offline-notes"><WifiOff size={16} aria-hidden="true" />{t("Open saved offline notes")}</Link>}</div></Shell>;
  if (!c) return <Shell narrow><SkeletonRows rows={4} /></Shell>;
  const active = c.enrollment === "ACTIVE" || isAdmin; const isSaved = !!lesson && saved.has(lesson.id); const hasNotes = !!lesson && (lesson.notes || lesson.notesUrl);

  return <Shell><div className="stack" style={{ gap: 18 }}>
    <Link className="sub row" style={{ gap: 4 }} to="/courses"><ChevronLeft size={14} aria-hidden="true" />{t("All courses")}</Link>

    {cur && !cur.locked ? <div className="course-watch">
      <section className="stack" style={{ gap: 12, minWidth: 0 }} aria-label={cur.title}>
        {lerr ? <div className="alert alert-bad" role="alert">{lerr}</div>
          : !lesson ? <div className="player player-wait"><div className="spinner" aria-hidden="true" /></div>
          : lesson.offlineCopy ? <div className="player player-wait"><span className="sub row" style={{ gap: 6 }}><WifiOff size={16} aria-hidden="true" />{t("You are offline. Your saved notes are below.")}</span></div>
          : lesson.youtubeId || lesson.bunnySrc ? <CoursePlayer key={lesson.id} videoId={lesson.youtubeId ?? undefined} bunnySrc={lesson.bunnySrc} title={lesson.title} watermark={lesson.watermark || "ExamForge"} apiRef={apiRef} onBookmark={() => bookmarkRef.current?.()} onEnded={() => { if (!lesson.done) void mark(true); }} />
          : <div className="player player-wait"><span className="sub">{t("No video for this lesson yet.")}</span></div>}
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}><span className="sub">{cur.subject}</span><h2 className="card-title" style={{ margin: 0 }}>{cur.title}</h2></div>
          {lesson && !lesson.offlineCopy && <button className={`btn ${lesson.done ? "" : "btn-primary"}`} onClick={() => mark(!lesson.done)}>{lesson.done ? <CircleCheck size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}{lesson.done ? t("Completed") : t("Mark as complete")}</button>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" disabled={!prev || prev.locked} onClick={() => prev && open(prev)}><ChevronLeft size={15} aria-hidden="true" />{t("Previous")}</button>
          <button className="btn btn-sm" disabled={!next} onClick={() => next && open(next)}>{t("Next lesson")}<ChevronRight size={15} aria-hidden="true" /></button>
        </div>
        {hasNotes && <div className="card card-pad stack" style={{ gap: 10 }}>
          <div className="row between" style={{ gap: 8, flexWrap: "wrap" }}><h3 className="card-title row" style={{ gap: 8, margin: 0 }}><FileText size={18} aria-hidden="true" />{t("Lecture notes")}</h3>
            {!lesson.offlineCopy && <div className="row" style={{ gap: 6, flexWrap: "wrap" }}><button type="button" className="btn btn-sm" disabled={offBusy} onClick={toggleSaved}>{isSaved ? <CloudOff size={15} aria-hidden="true" /> : <CloudDownload size={15} aria-hidden="true" />}{isSaved ? t("Remove offline copy") : t("Save notes offline")}</button>
              {flat.filter((x: any) => x.hasNotes).length > 1 && <button type="button" className="btn btn-sm" disabled={offBusy} onClick={saveAll}>{t("Save all notes of this course")}</button>}</div>}</div>
          {lesson.notes && <Notes text={lesson.notes} />}
          {lesson.notesUrl && <a className="btn btn-sm" style={{ justifySelf: "start" }} href={lesson.notesUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />{t("Open notes (PDF / link)")}</a>}
        </div>}
        {lesson && <LessonNotes lessonId={lesson.id} apiRef={apiRef} onChange={onNotesChange} addBookmarkRef={bookmarkRef} />}
      </section>
      <Curriculum c={c} lid={lid} open={open} t={t} />
    </div> : <>
      <div className="course-hero card">
        <Poster src={c.posterUrl} title={c.title} />
        <div className="stack" style={{ gap: 10, padding: "var(--s-5)" }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{c.examName && <span className="pill pill-brand">{c.examName}</span>}<Badge s={c.enrollment} /></div>
          <h1 className="h1" style={{ margin: 0 }}>{c.title}</h1>
          <RatingLine rating={c.rating ?? 0} count={c.ratingCount ?? 0} />
          {c.description && <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{c.description}</p>}
          <div className="course-meta"><span><PlayCircle size={14} aria-hidden="true" />{c.lessonCount} {t("lessons")}</span><span><BookOpen size={14} aria-hidden="true" />{c.subjects.length} {t("subjects")}</span></div>
          {active ? <>{c.enrollment === "ACTIVE" && <div><div className="bar"><i style={{ width: `${c.progress}%` }} /></div><span className="sub">{c.progress}% {t("complete")}</span></div>}
              {flat.length > 0 && <button className="btn btn-primary btn-lg" style={{ justifySelf: "start" }} onClick={() => open(flat.find((l: any) => !l.done) ?? flat[0])}><PlayCircle size={18} aria-hidden="true" />{c.progress > 0 ? t("Continue learning") : t("Start learning")}</button>}</>
            : c.enrollment === "PENDING" ? <div className="alert alert-warn" role="status"><Hourglass size={18} aria-hidden="true" /><span>{t("Payment under review")}: {c.paymentRef}. {t("You get access as soon as it is approved.")}</span></div>
            : <EnrollBox c={c} reload={load} />}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button type="button" className="btn btn-sm" onClick={() => share("copy")}><Link2 size={15} aria-hidden="true" />{t("Share")}</button><button type="button" className="btn btn-sm" onClick={() => share("wa")}><Share2 size={15} aria-hidden="true" />WhatsApp</button></div>
        </div>
      </div>
      <Curriculum c={c} lid={lid} open={open} t={t} wide />
    </>}
    <CourseReviews course={c} reload={load} />
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
