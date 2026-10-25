import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Bookmark, NotebookPen, Pencil, Trash2, Check, X, Play } from "lucide-react";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { clock, type PlayerApi } from "./CoursePlayer"; import { toast } from "./ui";
import { getOffline, type OfflineNote } from "../lib/offline";

export interface LessonNote extends OfflineNote { lessonId?: string }
/** The student's own notes and bookmarks for one lesson, each pinned to a moment of the video (tap the time to jump there). */
export default function LessonNotes({ lessonId, apiRef, onChange, addBookmarkRef }: { lessonId: string; apiRef: MutableRefObject<PlayerApi | null>; onChange?: (notes: LessonNote[]) => void; addBookmarkRef?: MutableRefObject<(() => void) | null> }) {
  const t = useT(); const [list, setList] = useState<LessonNote[] | null>(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [edit, setEdit] = useState<{ id: string; text: string } | null>(null); const [offline, setOffline] = useState(false);
  const cb = useRef(onChange); cb.current = onChange;
  const put = (n: LessonNote[]) => { const s = [...n].sort((a, b) => a.atSec - b.atSec); setList(s); cb.current?.(s); };
  useEffect(() => {
    let live = true; setList(null); setText(""); setOffline(false);
    api(`/lessons/${lessonId}/notes`).then((d) => live && put(Array.isArray(d) ? d : []))
      .catch(async () => { const o = await getOffline(lessonId).catch(() => null); if (!live) return; setOffline(true); setList(o?.myNotes ?? []); });
    return () => { live = false; };
  }, [lessonId]); // eslint-disable-line
  const add = async (kind: "NOTE" | "BOOKMARK", body = text) => {
    if (busy) return; if (kind === "NOTE" && !body.trim()) return; const atSec = apiRef.current?.time() ?? 0; setBusy(true);
    try { const n = await api<LessonNote>(`/lessons/${lessonId}/notes`, "POST", { atSec, kind, text: kind === "NOTE" ? body.trim() : "" }); put([...(list ?? []), n]); if (kind === "NOTE") setText(""); toast(kind === "NOTE" ? t("Note saved at {time}", { time: clock(atSec) }) : t("Bookmarked at {time}", { time: clock(atSec) }), "ok"); }
    catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  useEffect(() => { if (addBookmarkRef) { addBookmarkRef.current = () => void add("BOOKMARK", ""); return () => { addBookmarkRef.current = null; }; } }); // eslint-disable-line
  const save = async () => { if (!edit) return; try { const n = await api<LessonNote>(`/notes/${edit.id}`, "PUT", { text: edit.text }); put((list ?? []).map((x) => (x.id === n.id ? n : x))); setEdit(null); } catch (e: any) { toast(e.message, "bad"); } };
  const del = async (id: string) => { try { await api(`/notes/${id}`, "DELETE"); put((list ?? []).filter((x) => x.id !== id)); } catch (e: any) { toast(e.message, "bad"); } };

  return <section className="card card-pad stack" style={{ gap: 10 }} aria-label={t("My notes")}>
    <h3 className="card-title row" style={{ gap: 8, margin: 0 }}><NotebookPen size={18} aria-hidden="true" />{t("My notes & bookmarks")}</h3>
    {offline ? <p className="sub" style={{ margin: 0 }}>{t("You are offline. Showing the saved copy.")}</p> : <>
      <label className="sr" htmlFor="ln-text">{t("Write a note for this moment")}</label>
      <textarea id="ln-text" className="textarea" rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Write a note for this moment of the video…")} />
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !text.trim()} onClick={() => add("NOTE")}><NotebookPen size={15} aria-hidden="true" />{t("Add note at current time")}</button>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => add("BOOKMARK", "")}><Bookmark size={15} aria-hidden="true" />{t("Bookmark this moment")}</button>
      </div></>}
    {list === null ? <span className="sub">…</span> : list.length ? <ul className="ln-list">{list.map((n) => <li key={n.id} className={`ln-item ${n.kind === "BOOKMARK" ? "bm" : ""}`}>
      <button type="button" className="ln-time" onClick={() => apiRef.current?.seek(n.atSec)} disabled={!apiRef.current} aria-label={t("Jump to {time}", { time: clock(n.atSec) })}>{n.kind === "BOOKMARK" ? <Bookmark size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}{clock(n.atSec)}</button>
      {edit?.id === n.id ? <><input className="input" style={{ flex: 1, minWidth: 0 }} value={edit.text} maxLength={2000} autoFocus onChange={(e) => setEdit({ id: n.id, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setEdit(null); }} aria-label={t("Edit note")} />
        <button type="button" className="btn btn-sm icon-btn" onClick={save} aria-label={t("Save")}><Check size={14} /></button><button type="button" className="btn btn-sm icon-btn" onClick={() => setEdit(null)} aria-label={t("Cancel")}><X size={14} /></button></>
        : <><span className="ln-text">{n.text || t("Bookmark")}</span>{!offline && <><button type="button" className="btn btn-sm icon-btn btn-ghost" onClick={() => setEdit({ id: n.id, text: n.text })} aria-label={t("Edit note")}><Pencil size={14} /></button><button type="button" className="btn btn-sm icon-btn btn-ghost" onClick={() => del(n.id)} aria-label={t("Delete note")}><Trash2 size={14} /></button></>}</>}
    </li>)}</ul> : <p className="sub" style={{ margin: 0 }}>{t("No notes yet. Pause the video and write what you want to remember.")}</p>}
  </section>;
}
