import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, Power, ImagePlus, Eye, MousePointerClick, GraduationCap, ClipboardList, Link2, Sparkles } from "lucide-react";
import Shell from "../components/Shell"; import AdminCourseNav from "../components/AdminCourseNav"; import { ConfirmDialog, Modal, SkeletonRows, toast } from "../components/ui"; import { api } from "../lib/api"; import { readImage } from "./AdminPromos";

type Place = "HOME" | "PLAN"; type Kind = "course" | "exam" | "custom";
const blank = { title: "", placement: "HOME" as Place, imageUrl: "", linkUrl: "", priority: 0 as number | "", active: true, startsAt: "", expiresAt: "" };
const local = (iso?: string | null) => { if (!iso) return ""; const d = new Date(iso), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const STATE: Record<string, [string, string]> = { live: ["Live", "pill-ok"], scheduled: ["Scheduled", "pill-brand"], expired: ["Expired", "pill-bad"], off: ["Off", ""] };
const kindOf = (u: string): Kind => (u.startsWith("/courses/") ? "course" : u.startsWith("/exam/") ? "exam" : "custom");

/** Admin only: the sliding home-screen ads (a banner that opens a course / exam / link) and the cover photos of the "Today's plan" card. */
export default function AdminBanners() {
  const [list, setList] = useState<any[] | null>(null); const [courses, setCourses] = useState<any[]>([]); const [tests, setTests] = useState<any[]>([]);
  const [form, setForm] = useState<{ id?: string; v: typeof blank } | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [del, setDel] = useState<any>(null);
  const load = () => api("/admin/banners").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setList([]); });
  useEffect(() => { void load(); api("/admin/courses").then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {}); api("/tests?limit=200&q=").then((d) => setTests(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const edit = (p?: any) => { setErr(""); setForm(p ? { id: p.id, v: { title: p.title, placement: p.placement, imageUrl: p.imageUrl, linkUrl: p.linkUrl, priority: p.priority, active: p.active, startsAt: local(p.startsAt), expiresAt: local(p.expiresAt) } } : { v: { ...blank } }); };
  const set = (k: string, v: any) => setForm((o) => (o ? { ...o, v: { ...o.v, [k]: v } } : o));
  const body = (v: typeof blank) => ({ ...v, priority: Number(v.priority) || 0, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null });
  const save = async () => { if (!form) return; setBusy(true); setErr(""); try { if (form.id) await api(`/admin/banners/${form.id}`, "PUT", body(form.v)); else await api("/admin/banners", "POST", body(form.v)); toast("Banner saved.", "ok"); setForm(null); await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const toggle = async (p: any) => { try { await api(`/admin/banners/${p.id}`, "PUT", body({ title: p.title, placement: p.placement, imageUrl: p.imageUrl, linkUrl: p.linkUrl, priority: p.priority, active: !p.active, startsAt: local(p.startsAt), expiresAt: local(p.expiresAt) })); await load(); } catch (e: any) { toast(e.message, "bad"); } };
  const pick = async (f?: File | null) => { if (!f) return; try { set("imageUrl", await readImage(f)); setErr(""); } catch (e: any) { setErr(e.message); } };
  const v = form?.v, kind: Kind = v ? kindOf(v.linkUrl) : "custom"; const [forceCustom, setForceCustom] = useState(false);
  const shownKind: Kind = forceCustom ? "custom" : kind;
  const nameOf = useMemo(() => (u: string) => { const c = courses.find((x) => u === `/courses/${x.id}`); if (c) return `Course: ${c.title}`; const t = tests.find((x) => u === `/exam/${x.id}`); return t ? `Exam: ${t.name}` : u || "—"; }, [courses, tests]);
  const home = (list ?? []).filter((b) => b.placement === "HOME"), plan = (list ?? []).filter((b) => b.placement === "PLAN");
  const row = (p: any) => { const [label, cls] = STATE[p.state] ?? ["", ""]; return <div key={p.id} className="card card-pad row between" style={{ gap: 12, flexWrap: "wrap" }}>
    <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
      <div style={{ width: 128, aspectRatio: "2 / 1", borderRadius: 10, overflow: "hidden", background: "var(--surface-2)", flex: "none" }}><img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
      <div style={{ minWidth: 0 }}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><b>{p.title}</b><span className={`pill ${cls}`}>{label}</span></div>
        {p.placement === "HOME" && <div className="sub" style={{ marginTop: 4, overflowWrap: "anywhere" }}>→ {nameOf(p.linkUrl)}</div>}
        <div className="sub row" style={{ gap: 12, marginTop: 2 }}><span className="row" style={{ gap: 4 }}><Eye size={13} />{p.views}</span>{p.placement === "HOME" && <span className="row" style={{ gap: 4 }}><MousePointerClick size={13} />{p.clicks}{p.views ? ` (${Math.round((p.clicks / p.views) * 100)}%)` : ""}</span>}</div></div></div>
    <div className="row" style={{ gap: 6 }}><button className="btn btn-sm" onClick={() => toggle(p)} aria-pressed={p.active}><Power size={14} />{p.active ? "Switch off" : "Switch on"}</button><button className="btn btn-sm" onClick={() => { setForceCustom(false); edit(p); }}><Pencil size={14} />Edit</button><button className="btn btn-sm btn-danger" aria-label={`Delete ${p.title}`} onClick={() => setDel(p)}><Trash2 size={14} /></button></div></div>; };
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <AdminCourseNav />
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Home banners</h1><p className="sub">Run your own ads on the student home screen: a banner that opens one of your courses or exams. You can also add cover photos for the “Today’s plan” card.</p></div><button className="btn btn-primary" onClick={() => { setForceCustom(false); edit(); }}><Plus size={16} />New banner</button></div>
    {err && !form && <div className="alert alert-bad" role="alert">{err}</div>}
    {!list ? <SkeletonRows rows={3} /> : <>
      <section className="stack" style={{ gap: 8 }}><h2 className="card-title row" style={{ gap: 8 }}><Sparkles size={17} />Home banners (sliding ads)</h2>
        {home.length ? home.map(row) : <div className="card empty"><p>No banner yet. Until you add one, students see the default slides (Daily Challenge, a course, Duel).</p></div>}</section>
      <section className="stack" style={{ gap: 8 }}><h2 className="card-title row" style={{ gap: 8 }}><ClipboardList size={17} />Today’s plan photos</h2>
        {plan.length ? plan.map(row) : <div className="card empty"><p>No photo yet. The Today’s plan card shows a plain icon. Add one or more photos and one is picked each day.</p></div>}</section></>}

    <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.id ? "Edit banner" : "New banner"} width={620} dismissible={!busy}>{form && v && <div className="stack" style={{ gap: 12 }}>
      {err && <div className="alert alert-bad" role="alert">{err}</div>}
      <div className="seg" role="tablist" aria-label="Where it shows"><button type="button" className={v.placement === "HOME" ? "on" : ""} onClick={() => set("placement", "HOME")}><Sparkles size={14} /> Home banner</button><button type="button" className={v.placement === "PLAN" ? "on" : ""} onClick={() => set("placement", "PLAN")}><ClipboardList size={14} /> Today’s plan photo</button></div>
      <div><label className="label" htmlFor="bn-title">Name (only you see this)</label><input id="bn-title" className="input" maxLength={120} value={v.title} onChange={(e) => set("title", e.target.value)} /></div>
      <div><label className="label" htmlFor="bn-file">Photo {v.placement === "HOME" ? "(wide, about 2:1, e.g. 1600×800)" : "(square or wide)"}</label><input id="bn-file" className="input" type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
        <label className="label" htmlFor="bn-url" style={{ marginTop: 8 }}>…or paste an image link</label><input id="bn-url" className="input" placeholder="https://…" value={v.imageUrl.startsWith("data:") ? "" : v.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} /></div>
      {v.imageUrl && <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: 8, display: "grid", placeItems: "center" }}><img src={v.imageUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, objectFit: "contain" }} /></div>}
      {v.placement === "HOME" && <div className="stack" style={{ gap: 8 }}><span className="label" style={{ margin: 0 }}>When a student taps it, open…</span>
        <div className="seg" role="tablist" aria-label="Link type"><button type="button" className={shownKind === "course" ? "on" : ""} onClick={() => { setForceCustom(false); if (kind !== "course") set("linkUrl", courses[0] ? `/courses/${courses[0].id}` : ""); }}><GraduationCap size={14} /> My course</button><button type="button" className={shownKind === "exam" ? "on" : ""} onClick={() => { setForceCustom(false); if (kind !== "exam") set("linkUrl", tests[0] ? `/exam/${tests[0].id}` : ""); }}><ClipboardList size={14} /> An exam</button><button type="button" className={shownKind === "custom" ? "on" : ""} onClick={() => { setForceCustom(true); if (kind !== "custom") set("linkUrl", ""); }}><Link2 size={14} /> Other link</button></div>
        {shownKind === "course" && <select className="input" aria-label="Course" value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)}>{courses.length ? courses.map((c) => <option key={c.id} value={`/courses/${c.id}`}>{c.title}</option>) : <option value="">No courses yet</option>}</select>}
        {shownKind === "exam" && <select className="input" aria-label="Exam" value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)}>{tests.length ? tests.map((t) => <option key={t.id} value={`/exam/${t.id}`}>{t.name}{t.examName ? ` · ${t.examName}` : ""}</option>) : <option value="">No exams yet</option>}</select>}
        {shownKind === "custom" && <input className="input" aria-label="Link" placeholder="/shop, /daily or https://…" value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} />}
        <p className="sub">Course and exam links open inside the app. A link starting with https:// opens in a new tab.</p></div>}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 190 }}><label className="label" htmlFor="bn-from">Starts (optional)</label><input id="bn-from" className="input" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 190 }}><label className="label" htmlFor="bn-to">Ends (optional)</label><input id="bn-to" className="input" type="datetime-local" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></div>
        <div style={{ width: 120 }}><label className="label" htmlFor="bn-pri">Priority</label><input id="bn-pri" className="input" type="number" min={0} max={1000} value={v.priority} onChange={(e) => set("priority", e.target.value === "" ? "" : +e.target.value)} /></div></div>
      <label className="switch"><input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} /><span>Active<small>Higher priority slides first. Today’s plan photos rotate by day.</small></span></label>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={busy || !v.title.trim() || !v.imageUrl || (v.placement === "HOME" && !v.linkUrl.trim())} onClick={save}><Save size={15} />Save banner</button></div>
    </div>}</Modal>
    <ConfirmDialog open={!!del} danger title={`Delete ${del?.title}?`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const p = del; setDel(null); try { await api(`/admin/banners/${p.id}`, "DELETE"); await load(); } catch (e: any) { toast(e.message, "bad"); } }}>The banner will disappear from the home screen.</ConfirmDialog>
  </div></Shell>;
}
