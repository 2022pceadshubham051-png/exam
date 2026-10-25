import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, Dices, Power } from "lucide-react";
import Shell from "../components/Shell"; import AdminCourseNav from "../components/AdminCourseNav"; import { ConfirmDialog, Modal, SkeletonRows, toast } from "../components/ui"; import { api } from "../lib/api";

const blank = { code: "", type: "percent" as "percent" | "flat", value: 10 as number | "", courseId: "", startsAt: "", expiresAt: "", maxUses: "" as number | "", active: true };
const local = (iso?: string | null) => { if (!iso) return ""; const d = new Date(iso), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : null);
const STATE: Record<string, [string, string]> = { active: ["Live", "pill-ok"], scheduled: ["Scheduled", "pill-brand"], expired: ["Expired", "pill-bad"], exhausted: ["Used up", "pill-warn"], off: ["Off", ""] };
const gen = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from({ length: 8 }, () => a[Math.floor(Math.random() * a.length)]).join(""); };

/** Admin: make discount codes, change their discount and validity period, switch them off. */
export default function AdminCoupons() {
  const [list, setList] = useState<any[] | null>(null); const [courses, setCourses] = useState<any[]>([]); const [form, setForm] = useState<{ id?: string; v: typeof blank } | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [del, setDel] = useState<any>(null);
  const load = () => api("/admin/coupons").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setList([]); });
  useEffect(() => { void load(); api("/admin/courses").then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const edit = (c?: any) => { setErr(""); setForm(c ? { id: c.id, v: { code: c.code, type: c.type, value: c.value, courseId: c.courseId ?? "", startsAt: local(c.startsAt), expiresAt: local(c.expiresAt), maxUses: c.maxUses ?? "", active: c.active } } : { v: { ...blank, code: gen() } }); };
  const set = (k: string, v: any) => setForm((o) => (o ? { ...o, v: { ...o.v, [k]: v } } : o));
  const body = (v: typeof blank) => ({ ...v, value: Number(v.value) || 0, courseId: v.courseId || null, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null, maxUses: v.maxUses === "" ? null : Number(v.maxUses) });
  const save = async () => { if (!form) return; setBusy(true); setErr(""); try { if (form.id) await api(`/admin/coupons/${form.id}`, "PUT", body(form.v)); else await api("/admin/coupons", "POST", body(form.v)); toast("Coupon saved.", "ok"); setForm(null); await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const toggle = async (c: any) => { try { await api(`/admin/coupons/${c.id}`, "PUT", body({ code: c.code, type: c.type, value: c.value, courseId: c.courseId ?? "", startsAt: local(c.startsAt), expiresAt: local(c.expiresAt), maxUses: c.maxUses ?? "", active: !c.active })); await load(); } catch (e: any) { toast(e.message, "bad"); } };
  const v = form?.v;
  const preview = useMemo(() => { if (!v) return ""; const n = Number(v.value) || 0; return v.type === "percent" ? `${n}% off a ₹1,000 course → pay ₹${(1000 - Math.floor((1000 * Math.min(100, n)) / 100)).toLocaleString("en-IN")}` : `₹${n} off a ₹1,000 course → pay ₹${Math.max(0, 1000 - n).toLocaleString("en-IN")}`; }, [v]);
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Coupons</h1><p className="sub">Discount codes students type before paying. Change the discount or the dates any time.</p></div><button className="btn btn-primary" onClick={() => edit()}><Plus size={16} />New coupon</button></div>
    <AdminCourseNav />
    {err && !form && <div className="alert alert-bad" role="alert">{err}</div>}
    {!list ? <SkeletonRows rows={3} /> : list.length ? <div className="stack" style={{ gap: 8 }}>{list.map((c) => { const [label, cls] = STATE[c.state] ?? ["", ""]; return <div key={c.id} className="card card-pad row between" style={{ gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: 1 }}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><b className="mono" style={{ fontSize: "1.05rem", letterSpacing: ".04em" }}>{c.code}</b><span className={`pill ${cls}`}>{label}</span><span className="pill pill-brand">{c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}</span></div>
        <div className="sub" style={{ marginTop: 4 }}>{c.courseTitle ? `Only: ${c.courseTitle}` : "All courses"} · Used {c.used}{c.maxUses ? ` of ${c.maxUses}` : ""} times · {c.startsAt || c.expiresAt ? `${fmt(c.startsAt) ?? "Now"} → ${fmt(c.expiresAt) ?? "No end date"}` : "No time limit"}</div></div>
      <div className="row" style={{ gap: 6 }}><button className="btn btn-sm" onClick={() => toggle(c)} aria-pressed={c.active}><Power size={14} />{c.active ? "Switch off" : "Switch on"}</button><button className="btn btn-sm" onClick={() => edit(c)}><Pencil size={14} />Edit</button><button className="btn btn-sm btn-danger" aria-label={`Delete ${c.code}`} onClick={() => setDel(c)}><Trash2 size={14} /></button></div></div>; })}</div>
      : <div className="card empty"><p>No coupons yet. Make one for a festival offer or a friend.</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => edit()}><Plus size={16} />New coupon</button></div>}

    <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.id ? "Edit coupon" : "New coupon"} width={560} dismissible={!busy}>{form && v && <div className="stack" style={{ gap: 12 }}>
      {err && <div className="alert alert-bad" role="alert">{err}</div>}
      <div><label className="label" htmlFor="cp-code">Code students type</label><div className="row" style={{ gap: 8 }}><input id="cp-code" className="input mono" style={{ flex: 1, textTransform: "uppercase" }} maxLength={24} value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase())} /><button type="button" className="btn" onClick={() => set("code", gen())}><Dices size={15} />Random</button></div></div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 150 }}><label className="label" htmlFor="cp-type">Discount type</label><select id="cp-type" className="select" value={v.type} onChange={(e) => set("type", e.target.value)}><option value="percent">Percent (%)</option><option value="flat">Flat amount (₹)</option></select></div>
        <div style={{ width: 140 }}><label className="label" htmlFor="cp-val">{v.type === "percent" ? "Percent off" : "Rupees off"}</label><input id="cp-val" className="input" type="number" min={1} max={v.type === "percent" ? 100 : 1000000} value={v.value} onChange={(e) => set("value", e.target.value === "" ? "" : +e.target.value)} /></div></div>
      <p className="sub" style={{ margin: "-4px 0 0" }}>{preview}{v.type === "percent" && Number(v.value) === 100 ? ". Students enroll for free without payment." : ""}</p>
      <div><label className="label" htmlFor="cp-course">Works on</label><select id="cp-course" className="select" value={v.courseId} onChange={(e) => set("courseId", e.target.value)}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 190 }}><label className="label" htmlFor="cp-from">Starts (optional)</label><input id="cp-from" className="input" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 190 }}><label className="label" htmlFor="cp-to">Ends (optional)</label><input id="cp-to" className="input" type="datetime-local" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></div></div>
      <div style={{ maxWidth: 220 }}><label className="label" htmlFor="cp-max">Total uses allowed (blank = unlimited)</label><input id="cp-max" className="input" type="number" min={1} value={v.maxUses} onChange={(e) => set("maxUses", e.target.value === "" ? "" : +e.target.value)} /></div>
      <label className="switch"><input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} /><span>Active<small>Turn off to stop it without deleting.</small></span></label>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={busy || v.code.trim().length < 3 || !v.value} onClick={save}><Save size={15} />Save coupon</button></div></div>}</Modal>
    <ConfirmDialog open={!!del} danger title={`Delete ${del?.code}?`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const c = del; setDel(null); try { await api(`/admin/coupons/${c.id}`, "DELETE"); await load(); } catch (e: any) { toast(e.message, "bad"); } }}>Students who already used it keep their discount. The code stops working.</ConfirmDialog>
  </div></Shell>;
}
