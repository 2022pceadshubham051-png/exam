import { useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { CloudOff, FileText, ExternalLink, ChevronLeft, Trash2, Bookmark, Play, WifiOff } from "lucide-react";
import Shell from "../components/Shell"; import Notes from "../components/Notes"; import { Empty, PageHeader, SkeletonRows } from "../components/ui";
import { useT } from "../lib/i18n"; import { listOffline, removeOffline, type OfflineLesson } from "../lib/offline"; import { clock } from "../components/CoursePlayer";

/** Lecture notes the student saved on this device. Works without internet (text and links only, never the video). */
export default function OfflineNotes() {
  const t = useT(); const [rows, setRows] = useState<OfflineLesson[] | null>(null); const [openId, setOpenId] = useState<string | null>(null); const [online, setOnline] = useState(navigator.onLine);
  const load = () => listOffline().then(setRows).catch(() => setRows([]));
  useEffect(() => { void load(); const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  const groups = useMemo(() => { const m = new Map<string, OfflineLesson[]>(); for (const r of rows ?? []) m.set(r.courseTitle, [...(m.get(r.courseTitle) ?? []), r]); return [...m.entries()]; }, [rows]);
  const cur = rows?.find((r) => r.lessonId === openId) ?? null;
  const del = async (id: string) => { await removeOffline(id); if (openId === id) setOpenId(null); await load(); };

  return <Shell narrow><div className="stack" style={{ gap: 16 }}>
    <Link className="sub row" style={{ gap: 4 }} to="/courses"><ChevronLeft size={14} aria-hidden="true" />{t("All courses")}</Link>
    <PageHeader title={t("Offline notes")} sub={t("Notes you saved on this phone. They open without internet.")} />
    {!online && <div className="alert alert-info" role="status"><WifiOff size={17} aria-hidden="true" />{t("You are offline. Saved pages still work.")}</div>}
    {!rows ? <SkeletonRows rows={3} /> : cur ? <article className="card card-pad stack" style={{ gap: 12 }}>
      <button type="button" className="btn btn-sm" style={{ justifySelf: "start" }} onClick={() => setOpenId(null)}><ChevronLeft size={14} aria-hidden="true" />{t("All saved notes")}</button>
      <div><span className="sub">{cur.courseTitle}{cur.subject ? ` · ${cur.subject}` : ""}</span><h2 className="card-title" style={{ margin: 0 }}>{cur.title}</h2></div>
      {cur.notes && <Notes text={cur.notes} />}
      {cur.notesUrl && <a className="btn btn-sm" style={{ justifySelf: "start" }} href={cur.notesUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />{t("Open notes (PDF / link)")}</a>}
      {cur.myNotes.length > 0 && <div className="stack" style={{ gap: 6 }}><b>{t("My notes & bookmarks")}</b><ul className="ln-list">{cur.myNotes.map((n) => <li key={n.id} className={`ln-item ${n.kind === "BOOKMARK" ? "bm" : ""}`}><span className="ln-time static">{n.kind === "BOOKMARK" ? <Bookmark size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}{clock(n.atSec)}</span><span className="ln-text">{n.text || t("Bookmark")}</span></li>)}</ul></div>}
    </article>
    : groups.length ? groups.map(([course, ls]) => <section key={course} className="stack" style={{ gap: 8 }}><h2 className="card-title" style={{ margin: 0 }}>{course}</h2>
      {ls.map((l) => <div key={l.lessonId} className="card card-pad row between" style={{ gap: 10 }}>
        <button type="button" className="row off-open" style={{ gap: 10, flex: 1, minWidth: 0, textAlign: "left" }} onClick={() => setOpenId(l.lessonId)}><FileText size={18} aria-hidden="true" /><span style={{ minWidth: 0 }}><b>{l.title}</b><span className="sub" style={{ display: "block" }}>{l.subject}</span></span></button>
        <button type="button" className="btn btn-sm btn-ghost icon-btn" onClick={() => del(l.lessonId)} aria-label={t("Remove offline copy")}><Trash2 size={15} /></button></div>)}</section>)
    : <Empty icon={<CloudOff size={32} />} title={t("Nothing saved yet")}>{t("Open a lesson and tap “Save notes offline”.")}</Empty>}
  </div></Shell>;
}
