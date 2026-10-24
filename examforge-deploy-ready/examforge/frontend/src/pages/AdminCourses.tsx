import { useCallback, useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, ArrowLeft, ArrowUp, ArrowDown, Save, ImagePlus, Eye, EyeOff, Users, PlayCircle, FileText, CircleCheck, CircleX, Check, X, ShieldCheck } from "lucide-react";
import Shell from "../components/Shell"; import Poster from "../components/Poster"; import { ConfirmDialog, Modal, SkeletonRows, toast } from "../components/ui";
import { api } from "../lib/api"; import { readPoster, rupees, thumbUrl, youtubeId } from "../lib/courses";

const blank = { title: "", description: "", posterUrl: "", examName: "", priceInr: 0, paymentInfo: "", published: false, featured: true };
const blankLesson = { title: "", video: "", notes: "", notesUrl: "", durationMin: "" as number | "", isPreview: false };

/** Admin: build courses (poster, price, subjects, YouTube lessons with notes) and approve student payments. */
export default function AdminCourses() {
  const [list, setList] = useState<any[] | null>(null); const [openId, setOpenId] = useState<string | "new" | null>(null); const [msg, setMsg] = useState<{ ok: boolean; m: string } | null>(null);
  const load = useCallback(() => api("/admin/courses").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setMsg({ ok: false, m: e.message }); setList([]); }), []);
  useEffect(() => { void load(); }, [load]);
  const back = () => { setOpenId(null); void load(); };
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
      <div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Courses</h1><p className="sub">Create video courses, set the price and publish them. Students see the poster on their Home screen.</p></div>
      <div className="row">{openId ? <button className="btn" onClick={back}><ArrowLeft size={16} />All courses</button> : <><Link className="btn" to="/admin"><ShieldCheck size={16} />Tests</Link><button className="btn btn-primary" onClick={() => setOpenId("new")}><Plus size={16} />New course</button></>}</div>
    </div>
    {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-bad"}`} role="alert">{msg.ok ? <CircleCheck size={18} /> : <CircleX size={18} />}<span style={{ flex: 1 }}>{msg.m}</span></div>}
    {openId ? <Editor key={openId} id={openId} onSaved={(id) => setOpenId(id)} onDeleted={back} /> : !list ? <SkeletonRows rows={3} />
      : list.length ? <div className="course-grid">{list.map((c) => <article key={c.id} className="card course-card">
        <Poster src={c.posterUrl} title={c.title} />
        <div className="course-body">
          <div className="row between"><span className={`pill ${c.published ? "pill-ok" : "pill-warn"}`}>{c.published ? "Published" : "Draft"}</span><b>{rupees(c.priceInr)}</b></div>
          <b className="course-title">{c.title}</b>
          <div className="course-meta"><span><PlayCircle size={14} />{c.lessonCount} lessons</span><span><Users size={14} />{c.students} students</span></div>
          {c.pending > 0 && <span className="pill pill-warn">{c.pending} payment{c.pending > 1 ? "s" : ""} to approve</span>}
          <button className="btn btn-primary btn-sm" style={{ marginTop: 4 }} onClick={() => setOpenId(c.id)}><Pencil size={14} />Manage</button>
        </div></article>)}</div>
        : <div className="card empty"><PlayCircle size={36} /><p>No courses yet. Create your first one.</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setOpenId("new")}><Plus size={16} />New course</button></div>}
  </div></Shell>;
}

function Editor({ id, onSaved, onDeleted }: { id: string; onSaved: (id: string) => void; onDeleted: () => void }) {
  const isNew = id === "new"; const [f, setF] = useState<any>(blank); const [course, setCourse] = useState<any>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [delCourse, setDelCourse] = useState(false);
  const [tab, setTab] = useState<"content" | "students">("content");
  const reload = useCallback(async () => { const c = await api(`/admin/courses/${id}`); setCourse(c); setF({ title: c.title, description: c.description ?? "", posterUrl: c.posterUrl ?? "", examName: c.examName ?? "", priceInr: c.priceInr, paymentInfo: c.paymentInfo ?? "", published: c.published, featured: c.featured }); }, [id]);
  useEffect(() => { if (!isNew) reload().catch((e) => setErr(e.message)); }, [isNew, reload]);
  const set = (k: string, v: any) => setF((o: any) => ({ ...o, [k]: v }));
  const pick = async (file?: File | null) => { if (!file) return; try { set("posterUrl", await readPoster(file)); setErr(""); } catch (e: any) { setErr(e.message); } };
  const save = async () => {
    if (f.title.trim().length < 2) return setErr("Give the course a title.");
    setBusy(true); setErr("");
    try { const body = { ...f, priceInr: Number(f.priceInr) || 0 }; if (isNew) { const c = await api("/admin/courses", "POST", body); toast("Course created. Now add subjects and lessons.", "ok"); onSaved(c.id); } else { await api(`/admin/courses/${id}`, "PUT", body); toast("Saved.", "ok"); await reload(); } }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const del = async () => { try { await api(`/admin/courses/${id}`, "DELETE"); toast("Course deleted.", "ok"); onDeleted(); } catch (e: any) { setDelCourse(false); setErr(e.message); } };
  if (!isNew && !course && !err) return <SkeletonRows rows={4} />;
  const lessonTotal = course?.subjects?.reduce((a: number, s: any) => a + s.lessons.length, 0) ?? 0;

  return <div className="stack" style={{ gap: 16 }}>
    {err && <div className="alert alert-bad" role="alert"><CircleX size={18} /><span style={{ flex: 1 }}>{err}</span></div>}
    <section className="card card-pad stack" style={{ gap: 14 }} aria-label="Course details">
      <b>Course details</b>
      <div className="poster-pick">
        <div className="stack" style={{ gap: 8 }}>
          <Poster src={f.posterUrl} title={f.title || "Poster preview"} />
          <label className="btn btn-sm" style={{ cursor: "pointer" }}><ImagePlus size={15} />Upload poster<input type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
          {f.posterUrl && <button type="button" className="btn btn-sm" onClick={() => set("posterUrl", "")}><X size={14} />Remove poster</button>}
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <div><label className="label" htmlFor="c-title">Course title</label><input id="c-title" className="input" maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. SSC CGL Maths Complete Course" /></div>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}><label className="label" htmlFor="c-exam">Exam (optional)</label><input id="c-exam" className="input" maxLength={80} value={f.examName} onChange={(e) => set("examName", e.target.value)} placeholder="SSC CGL" /></div>
            <div style={{ width: 160 }}><label className="label" htmlFor="c-price">Price in ₹ (0 = free)</label><input id="c-price" className="input" type="number" min={0} max={1000000} value={f.priceInr} onChange={(e) => set("priceInr", e.target.value === "" ? "" : +e.target.value)} /></div>
          </div>
          <div><label className="label" htmlFor="c-desc">Description</label><textarea id="c-desc" className="textarea" rows={4} maxLength={4000} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="What will students learn? Who is it for?" /></div>
          <div><label className="label" htmlFor="c-pay">Payment instructions (shown to students for paid courses)</label><textarea id="c-pay" className="textarea" rows={2} maxLength={500} value={f.paymentInfo} onChange={(e) => set("paymentInfo", e.target.value)} placeholder="Pay ₹499 to UPI ID yourname@upi and paste the transaction ID below." /></div>
          <div className="stack" style={{ gap: 8 }}>
            <label className="switch"><input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} /><span>Published<small>Students can see and enroll only when this is on.</small></span></label>
            <label className="switch"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /><span>Show poster on Home<small>Featured courses appear first, and on the student Home screen.</small></span></label>
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {!isNew ? <button className="btn btn-danger btn-sm" onClick={() => setDelCourse(true)}><Trash2 size={14} />Delete course</button> : <span />}
        <button className="btn btn-primary" disabled={busy} onClick={save}><Save size={16} />{isNew ? "Create course" : "Save changes"}</button>
      </div>
    </section>

    {!isNew && course && <>
      <nav className="seg" aria-label="Course sections"><button type="button" className={tab === "content" ? "on" : ""} onClick={() => setTab("content")}>Subjects &amp; lessons ({lessonTotal})</button><button type="button" className={tab === "students" ? "on" : ""} onClick={() => setTab("students")}>Students</button></nav>
      {tab === "content" ? <Content course={course} reload={reload} setErr={setErr} /> : <Students id={id} setErr={setErr} />}
    </>}
    <ConfirmDialog open={delCourse} danger title={`Delete "${course?.title ?? ""}"?`} confirmLabel="Delete" onCancel={() => setDelCourse(false)} onConfirm={del}>All subjects, lessons, notes, enrollments and progress of this course will be removed permanently.</ConfirmDialog>
  </div>;
}

function Content({ course, reload, setErr }: { course: any; reload: () => Promise<void>; setErr: (m: string) => void }) {
  const [subName, setSubName] = useState(""); const [lesson, setLesson] = useState<{ subjectId: string; id?: string; v: typeof blankLesson } | null>(null); const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<{ kind: "subjects" | "lessons"; id: string; name: string } | null>(null);
  const run = async (fn: () => Promise<unknown>) => { try { setErr(""); await fn(); await reload(); } catch (e: any) { setErr(e.message); } };
  const addSub = () => run(async () => { if (!subName.trim()) return; await api(`/admin/courses/${course.id}/subjects`, "POST", { name: subName.trim() }); setSubName(""); });
  const rename = (s: any) => { const n = prompt("Subject name", s.name)?.trim(); if (n && n !== s.name) void run(() => api(`/admin/subjects/${s.id}`, "PUT", { name: n })); };
  const move = (kind: string, id: string, dir: "up" | "down") => run(() => api(`/admin/${kind}/${id}/move`, "POST", { dir }));
  const editLesson = (subjectId: string, l?: any) => setLesson({ subjectId, id: l?.id, v: l ? { title: l.title, video: l.youtubeId ? `https://youtu.be/${l.youtubeId}` : "", notes: l.notes ?? "", notesUrl: l.notesUrl ?? "", durationMin: l.durationMin ?? "", isPreview: l.isPreview } : blankLesson });
  const saveLesson = async () => {
    if (!lesson) return; const v = lesson.v;
    if (v.title.trim().length < 2) return setErr("Give the lesson a title.");
    if (v.video.trim() && !youtubeId(v.video)) return setErr("That does not look like a YouTube link.");
    setSaving(true);
    try { setErr(""); if (lesson.id) await api(`/admin/lessons/${lesson.id}`, "PUT", v); else await api(`/admin/subjects/${lesson.subjectId}/lessons`, "POST", v); setLesson(null); await reload(); toast("Lesson saved.", "ok"); }
    catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  const lv = lesson?.v, vid = lv?.video.trim() ? youtubeId(lv.video) : null;
  const setL = (k: string, val: any) => setLesson((o) => (o ? { ...o, v: { ...o.v, [k]: val } } : o));
  return <div className="stack" style={{ gap: 12 }}>
    {course.subjects.map((s: any, si: number) => <section key={s.id} className="adm-sub" aria-label={s.name}>
      <div className="adm-sub-h"><b style={{ flex: 1 }}>{s.name}</b>
        <button className="btn btn-sm icon-btn" aria-label="Move subject up" disabled={si === 0} onClick={() => move("subjects", s.id, "up")}><ArrowUp size={14} /></button>
        <button className="btn btn-sm icon-btn" aria-label="Move subject down" disabled={si === course.subjects.length - 1} onClick={() => move("subjects", s.id, "down")}><ArrowDown size={14} /></button>
        <button className="btn btn-sm" onClick={() => rename(s)}><Pencil size={14} />Rename</button>
        <button className="btn btn-sm btn-danger" onClick={() => setDel({ kind: "subjects", id: s.id, name: s.name })}><Trash2 size={14} /></button>
        <button className="btn btn-sm btn-primary" onClick={() => editLesson(s.id)}><Plus size={14} />Lesson</button></div>
      {s.lessons.map((l: any, li: number) => <div key={l.id} className="adm-lesson">
        {l.youtubeId ? <img src={thumbUrl(l.youtubeId)} alt="" loading="lazy" /> : <span className="sub" style={{ width: 72, textAlign: "center" }}>No video</span>}
        <div style={{ flex: 1, minWidth: 160 }}><b>{l.title}</b><div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{l.isPreview && <span className="pill pill-brand">Free preview</span>}{(l.notes || l.notesUrl) && <span className="pill"><FileText size={12} />Notes</span>}{l.durationMin ? <span className="sub">{l.durationMin} min</span> : null}</div></div>
        <button className="btn btn-sm icon-btn" aria-label="Move lesson up" disabled={li === 0} onClick={() => move("lessons", l.id, "up")}><ArrowUp size={14} /></button>
        <button className="btn btn-sm icon-btn" aria-label="Move lesson down" disabled={li === s.lessons.length - 1} onClick={() => move("lessons", l.id, "down")}><ArrowDown size={14} /></button>
        <button className="btn btn-sm" onClick={() => editLesson(s.id, l)}><Pencil size={14} />Edit</button>
        <button className="btn btn-sm btn-danger" aria-label="Delete lesson" onClick={() => setDel({ kind: "lessons", id: l.id, name: l.title })}><Trash2 size={14} /></button>
      </div>)}
      {!s.lessons.length && <p className="sub" style={{ padding: "10px 14px", margin: 0 }}>No lessons yet.</p>}
    </section>)}
    <form className="card card-pad row" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); void addSub(); }}>
      <label className="sr" htmlFor="new-sub">New subject</label><input id="new-sub" className="input" style={{ flex: 1, minWidth: 180 }} maxLength={80} value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="New subject, e.g. Algebra" />
      <button className="btn btn-primary" disabled={!subName.trim()}><Plus size={16} />Add subject</button>
    </form>

    <Modal open={!!lesson} onClose={() => !saving && setLesson(null)} title={lesson?.id ? "Edit lesson" : "New lesson"} width={640} dismissible={!saving}>{lesson && lv && <div className="stack" style={{ gap: 10 }}>
      <div><label className="label" htmlFor="l-title">Lesson title</label><input id="l-title" className="input" maxLength={160} value={lv.title} onChange={(e) => setL("title", e.target.value)} placeholder="e.g. Percentage: basics and tricks" /></div>
      <div><label className="label" htmlFor="l-video">YouTube link</label><input id="l-video" className="input" value={lv.video} onChange={(e) => setL("video", e.target.value)} placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…" />
        {lv.video.trim() && (vid ? <div className="row" style={{ gap: 10, marginTop: 8 }}><img src={thumbUrl(vid)} alt="" style={{ width: 120, borderRadius: 8 }} /><span className="pill pill-ok"><Check size={12} />Video found</span></div> : <div className="field-error" role="alert">Not a valid YouTube link.</div>)}
        <div className="hint">Tip: use an Unlisted video so only your students can find it.</div></div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ width: 150 }}><label className="label" htmlFor="l-dur">Length (minutes)</label><input id="l-dur" className="input" type="number" min={0} max={1000} value={lv.durationMin} onChange={(e) => setL("durationMin", e.target.value === "" ? "" : +e.target.value)} /></div>
        <label className="switch" style={{ flex: 1, minWidth: 220 }}><input type="checkbox" checked={lv.isPreview} onChange={(e) => setL("isPreview", e.target.checked)} /><span>Free preview<small>Anyone can watch this lesson without enrolling.</small></span></label>
      </div>
      <div><label className="label" htmlFor="l-notes">Lecture notes</label><textarea id="l-notes" className="textarea" rows={9} maxLength={30000} value={lv.notes} onChange={(e) => setL("notes", e.target.value)} placeholder={"# Key formulas\n- Percentage = (part / whole) × 100\n- Increase 20% then decrease 20% = 4% loss\n\nWrite plain text. Lines starting with # are headings, - are bullets."} /></div>
      <div><label className="label" htmlFor="l-url">Notes PDF / Drive link (optional)</label><input id="l-url" className="input" value={lv.notesUrl} onChange={(e) => setL("notesUrl", e.target.value)} placeholder="https://drive.google.com/…" /></div>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={saving} onClick={() => setLesson(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={saveLesson}><Save size={15} />Save lesson</button></div>
    </div>}</Modal>
    <ConfirmDialog open={!!del} danger title={`Delete "${del?.name}"?`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const d = del!; setDel(null); await run(() => api(`/admin/${d.kind}/${d.id}`, "DELETE")); }}>{del?.kind === "subjects" ? "All lessons inside this subject are deleted too." : "The lesson and its notes will be removed."}</ConfirmDialog>
  </div>;
}

function Students({ id, setErr }: { id: string; setErr: (m: string) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => api(`/admin/courses/${id}/enrollments`).then((d) => setRows(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setRows([]); }), [id, setErr]);
  useEffect(() => { void load(); }, [load]);
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); await load(); } catch (e: any) { setErr(e.message); } };
  if (!rows) return <SkeletonRows rows={3} />;
  if (!rows.length) return <div className="card empty"><Users size={32} /><p>No students yet.</p></div>;
  return <div className="stack" style={{ gap: 8 }}>
    <p className="sub">Paid courses: check the transaction ID in your bank/UPI app, then approve to unlock the course.</p>
    {rows.map((e) => <div key={e.id} className="card card-pad row between" style={{ gap: 10, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}><b>{e.name}</b> <span className="sub">{e.email}</span>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className={`pill ${e.status === "ACTIVE" ? "pill-ok" : "pill-warn"}`}>{e.status === "ACTIVE" ? "Enrolled" : "Waiting for approval"}</span>{e.amountInr > 0 && <span className="sub">{rupees(e.amountInr)}</span>}{e.paymentRef && <span className="sub">Txn: <b style={{ color: "var(--text)" }}>{e.paymentRef}</b></span>}</div></div>
      <div className="row">{e.status === "PENDING" && <button className="btn btn-primary btn-sm" onClick={() => act(() => api(`/admin/enrollments/${e.id}/approve`, "POST"))}><Eye size={14} />Approve</button>}
        <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(e.status === "PENDING" ? "Reject this payment?" : "Remove this student from the course?")) void act(() => api(`/admin/enrollments/${e.id}`, "DELETE")); }}><EyeOff size={14} />{e.status === "PENDING" ? "Reject" : "Remove"}</button></div>
    </div>)}
  </div>;
}
