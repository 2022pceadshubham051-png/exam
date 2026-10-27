import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, Power, ImagePlus, Film, Eye, MousePointerClick } from "lucide-react";
import Shell from "../components/Shell"; import { ConfirmDialog, Modal, SkeletonRows, toast } from "../components/ui"; import { api } from "../lib/api";

const blank = { title: "", mediaType: "IMAGE" as "IMAGE" | "VIDEO", mediaUrl: "", linkUrl: "", newTab: true, showAlways: false, priority: 0 as number | "", active: true, startsAt: "", expiresAt: "" };
const local = (iso?: string | null) => { if (!iso) return ""; const d = new Date(iso), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const STATE: Record<string, [string, string]> = { live: ["Live", "pill-ok"], scheduled: ["Scheduled", "pill-brand"], expired: ["Expired", "pill-bad"], off: ["Off", ""] };

/** Keeps the picture's shape (no cropping), max 1280 px on the long side, and shrinks quality until it fits the server limit. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error("Please choose an image file (JPG, PNG or WebP)."));
    if (file.type === "image/gif") { const r = new FileReader(); r.onload = () => (String(r.result).length < 650_000 ? resolve(String(r.result)) : reject(new Error("That GIF is too big. Use a short video link instead."))); r.onerror = () => reject(new Error("That image could not be read.")); return r.readAsDataURL(file); }
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That image could not be read.")); };
    img.onload = () => {
      URL.revokeObjectURL(url); const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext("2d"); if (!g) return reject(new Error("Your browser cannot process images."));
      g.drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.88, 0.8, 0.7, 0.6, 0.5, 0.4]) { const d = c.toDataURL("image/jpeg", q); if (d.length < 650_000) return resolve(d); }
      reject(new Error("That image is too detailed. Try a smaller one."));
    };
    img.src = url;
  });
}

/** Admin only: create the popup photo / short video that opens on the site, with an X and a click-through link. */
export default function AdminPromos() {
  const [list, setList] = useState<any[] | null>(null); const [form, setForm] = useState<{ id?: string; v: typeof blank } | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [del, setDel] = useState<any>(null);
  const load = () => api("/admin/promos").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setList([]); });
  useEffect(() => { void load(); }, []);
  const edit = (p?: any) => { setErr(""); setForm(p ? { id: p.id, v: { title: p.title, mediaType: p.mediaType, mediaUrl: p.mediaUrl, linkUrl: p.linkUrl, newTab: p.newTab, showAlways: p.showAlways, priority: p.priority, active: p.active, startsAt: local(p.startsAt), expiresAt: local(p.expiresAt) } } : { v: { ...blank } }); };
  const set = (k: string, v: any) => setForm((o) => (o ? { ...o, v: { ...o.v, [k]: v } } : o));
  const body = (v: typeof blank) => ({ ...v, priority: Number(v.priority) || 0, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null });
  const save = async () => { if (!form) return; setBusy(true); setErr(""); try { if (form.id) await api(`/admin/promos/${form.id}`, "PUT", body(form.v)); else await api("/admin/promos", "POST", body(form.v)); toast("Promo saved.", "ok"); setForm(null); await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const toggle = async (p: any) => { try { await api(`/admin/promos/${p.id}`, "PUT", body({ title: p.title, mediaType: p.mediaType, mediaUrl: p.mediaUrl, linkUrl: p.linkUrl, newTab: p.newTab, showAlways: p.showAlways, priority: p.priority, active: !p.active, startsAt: local(p.startsAt), expiresAt: local(p.expiresAt) })); await load(); } catch (e: any) { toast(e.message, "bad"); } };
  const pick = async (f?: File | null) => { if (!f) return; try { set("mediaUrl", await readImage(f)); setErr(""); } catch (e: any) { setErr(e.message); } };
  const v = form?.v;
  return <Shell><div className="stack" style={{ gap: 18 }}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Promo popup</h1><p className="sub">A photo or short video that opens full-screen when someone visits the site. They can close it with X, or click it to go to your link. Only admins can change it.</p></div><button className="btn btn-primary" onClick={() => edit()}><Plus size={16} />New promo</button></div>
    {err && !form && <div className="alert alert-bad" role="alert">{err}</div>}
    {!list ? <SkeletonRows rows={3} /> : list.length ? <div className="stack" style={{ gap: 8 }}>{list.map((p) => { const [label, cls] = STATE[p.state] ?? ["", ""]; return <div key={p.id} className="card card-pad row between" style={{ gap: 12, flexWrap: "wrap" }}>
      <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
        <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", background: "var(--surface-2)", flex: "none", display: "grid", placeItems: "center" }}>{p.mediaType === "VIDEO" ? <video src={p.mediaUrl} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={p.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
        <div style={{ minWidth: 0 }}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><b>{p.title}</b><span className={`pill ${cls}`}>{label}</span><span className="pill">{p.mediaType === "VIDEO" ? "Video" : "Photo"}</span></div>
          <div className="sub" style={{ marginTop: 4, overflowWrap: "anywhere" }}>→ {p.linkUrl}</div>
          <div className="sub row" style={{ gap: 12, marginTop: 2 }}><span className="row" style={{ gap: 4 }}><Eye size={13} />{p.views}</span><span className="row" style={{ gap: 4 }}><MousePointerClick size={13} />{p.clicks}{p.views ? ` (${Math.round((p.clicks / p.views) * 100)}%)` : ""}</span></div></div></div>
      <div className="row" style={{ gap: 6 }}><button className="btn btn-sm" onClick={() => toggle(p)} aria-pressed={p.active}><Power size={14} />{p.active ? "Switch off" : "Switch on"}</button><button className="btn btn-sm" onClick={() => edit(p)}><Pencil size={14} />Edit</button><button className="btn btn-sm btn-danger" aria-label={`Delete ${p.title}`} onClick={() => setDel(p)}><Trash2 size={14} /></button></div></div>; })}</div>
      : <div className="card empty"><p>No promo yet. Add a photo or short video to show when people open the site.</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => edit()}><Plus size={16} />New promo</button></div>}

    <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.id ? "Edit promo" : "New promo"} width={600} dismissible={!busy}>{form && v && <div className="stack" style={{ gap: 12 }}>
      {err && <div className="alert alert-bad" role="alert">{err}</div>}
      <div><label className="label" htmlFor="pr-title">Name (only you see this)</label><input id="pr-title" className="input" maxLength={120} value={v.title} onChange={(e) => set("title", e.target.value)} /></div>
      <div className="seg" role="tablist" aria-label="Media type"><button type="button" className={v.mediaType === "IMAGE" ? "on" : ""} onClick={() => { set("mediaType", "IMAGE"); set("mediaUrl", ""); }}><ImagePlus size={14} /> Photo</button><button type="button" className={v.mediaType === "VIDEO" ? "on" : ""} onClick={() => { set("mediaType", "VIDEO"); set("mediaUrl", ""); }}><Film size={14} /> Short video</button></div>
      {v.mediaType === "IMAGE" ? <div><label className="label" htmlFor="pr-file">Upload photo</label><input id="pr-file" className="input" type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
        <label className="label" htmlFor="pr-url" style={{ marginTop: 8 }}>…or paste an image link</label><input id="pr-url" className="input" placeholder="https://…" value={v.mediaUrl.startsWith("data:") ? "" : v.mediaUrl} onChange={(e) => set("mediaUrl", e.target.value)} /></div>
        : <div><label className="label" htmlFor="pr-vid">Video link (direct .mp4 / .webm)</label><input id="pr-vid" className="input" placeholder="https://…/offer.mp4" value={v.mediaUrl} onChange={(e) => set("mediaUrl", e.target.value)} /><p className="sub" style={{ marginTop: 4 }}>Keep it short (5–15 s) and small so it loads fast. It plays muted and loops.</p></div>}
      {v.mediaUrl && <div style={{ background: "#000", borderRadius: 12, padding: 8, textAlign: "center" }}>{v.mediaType === "VIDEO" ? <video src={v.mediaUrl} autoPlay muted loop playsInline style={{ maxWidth: "100%", maxHeight: 240 }} /> : <img src={v.mediaUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 240 }} />}</div>}
      <div><label className="label" htmlFor="pr-link">When clicked, go to</label><input id="pr-link" className="input" placeholder="https://example.com/offer" value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} /></div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 190 }}><label className="label" htmlFor="pr-from">Starts (optional)</label><input id="pr-from" className="input" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 190 }}><label className="label" htmlFor="pr-to">Ends (optional)</label><input id="pr-to" className="input" type="datetime-local" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></div>
        <div style={{ width: 120 }}><label className="label" htmlFor="pr-pri">Priority</label><input id="pr-pri" className="input" type="number" min={0} max={1000} value={v.priority} onChange={(e) => set("priority", e.target.value === "" ? "" : +e.target.value)} /></div></div>
      <label className="switch"><input type="checkbox" checked={v.showAlways} onChange={(e) => set("showAlways", e.target.checked)} /><span>Show every time the site opens<small>Off = once per visit (per browser session).</small></span></label>
      <label className="switch"><input type="checkbox" checked={v.newTab} onChange={(e) => set("newTab", e.target.checked)} /><span>Open the link in a new tab</span></label>
      <label className="switch"><input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} /><span>Active<small>Only one promo shows at a time: the live one with the highest priority.</small></span></label>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={busy || !v.title.trim() || !v.mediaUrl || !v.linkUrl.trim()} onClick={save}><Save size={15} />Save promo</button></div></div>}</Modal>
    <ConfirmDialog open={!!del} danger title={`Delete ${del?.title}?`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const p = del; setDel(null); try { await api(`/admin/promos/${p.id}`, "DELETE"); await load(); } catch (e: any) { toast(e.message, "bad"); } }}>The popup stops showing right away.</ConfirmDialog>
  </div></Shell>;
}
