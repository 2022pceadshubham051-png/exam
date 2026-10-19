import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Save, Loader, TriangleAlert, Volume2, Store, UserRound, SlidersHorizontal, Palette, LifeBuoy, LogOut, CircleHelp } from "lucide-react";
import Shell, { Loading } from "../components/Shell"; import NameTag from "../components/NameTag"; import { openTutorial } from "../components/Tutorial"; import { Field, PageHeader, toast } from "../components/ui";
import { api } from "../lib/api"; import { getMe, logout } from "../lib/auth";
import SubNav from "../components/SubNav"; import { Traveler } from "../components/Journey"; import { getLang, setLang, getLite, setLite, getExamDate, setExamDate } from "../lib/prefs"; import { SKINS, SKIN_NAMES, SKIN_HINTS, getSkinPref, setSkinPref, skinForExam, type SkinPref } from "../lib/skin"; import { STYLES, STYLE_NAMES, STYLE_HINTS, getStoredStyle, getMode, getMotion, setStyle, setMode, setMotion, type Mode } from "../lib/theme";
import { levelFromXp, xpFromAttempts, streakDays, saveLevel, saveXp, soundOn, setSound, sfx, instantCheckOn, setInstantCheck } from "../lib/game";
import { loadProfile, setProfile, setCoins, firstName, type Profile } from "../lib/profile"; import { COMMON, mergeExams } from "./Welcome";

const MODES: [Mode, string, string][] = [["system", "System", "Match your device"], ["light", "Light", "Ivory surfaces"], ["dark", "Dark", "Low-glare surfaces"]];

export default function ProfilePage() {
  const admin = getMe()?.role === "ADMIN";
  const [, force] = useState(0); const rerender = () => force((n) => n + 1);
  useEffect(() => { window.addEventListener("ef-theme", rerender); window.addEventListener("ef-skin", rerender); window.addEventListener("ef-prefs", rerender); return () => { window.removeEventListener("ef-theme", rerender); window.removeEventListener("ef-skin", rerender); window.removeEventListener("ef-prefs", rerender); }; }, []);
  const [p, setP] = useState<Profile | null>(null); const [hist, setHist] = useState<any[] | null>(null); const [shop, setShop] = useState<any | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [age, setAge] = useState(""); const [exam, setExam] = useState(""); const [other, setOther] = useState(""); const [score, setScore] = useState("");
  const [exams, setExams] = useState<string[]>(COMMON); const [err, setErr] = useState(""); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);

  const fill = (u: Profile) => {
    setP(u); setName(u.name ?? ""); setEmail(u.email ?? ""); setAge(u.age ? String(u.age) : ""); setScore(u.targetScore ? String(u.targetScore) : ""); setPw("");
    if (u.targetExam) { if (COMMON.includes(u.targetExam)) { setExam(u.targetExam); setOther(""); } else { setExam("__other"); setOther(u.targetExam); } } else { setExam(""); setOther(""); }
  };
  useEffect(() => {
    if (admin) return;
    loadProfile(true).then(fill).catch((e) => setErr(e.message));
    api("/history").then((h) => { const d = (Array.isArray(h) ? h : []).filter((a: any) => a.result); setHist(d); saveXp(xpFromAttempts(d)); saveLevel(levelFromXp(xpFromAttempts(d)).level); }).catch(() => setHist([]));
    api("/shop").then((s) => { setShop(s); setCoins(s.coins); }).catch(() => {});
    api("/tests?limit=100").then((t: any[]) => setExams(mergeExams([...new Set(t.map((x) => String(x.examName)).filter(Boolean))]))).catch(() => {});
  }, []); // eslint-disable-line

  const target = exam === "__other" ? other.trim() : exam;
  const emailChanged = !!p && email.trim().toLowerCase() !== (p.email ?? "").toLowerCase();
  const dirty = !!p && (name.trim() !== (p.name ?? "") || emailChanged || age !== (p.age ? String(p.age) : "") || score !== (p.targetScore ? String(p.targetScore) : "") || target !== (p.targetExam ?? ""));
  const validate = () => {
    const v: Record<string, string> = {}; const a = Number(age);
    if (!name.trim()) v.name = "Enter your name.";
    if (!Number.isInteger(a) || a < 8 || a > 99) v.age = "Enter an age between 8 and 99.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) v.email = "Enter a valid email address.";
    if (emailChanged && !pw) v.pw = "Enter your current password to change your email.";
    if (!target) v.exam = "Pick your target exam.";
    if (score && (!Number.isInteger(Number(score)) || Number(score) < 1 || Number(score) > 100)) v.score = "Use a whole number from 1 to 100.";
    setErrs(v); return !Object.keys(v).length;
  };
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setErr(""); setSaved(false); if (!validate()) return;
    setBusy(true);
    try {
      const r = await api<Profile>("/me", "PUT", { name: name.trim(), age: Number(age), targetExam: target, targetScore: score ? Number(score) : null, ...(emailChanged ? { email: email.trim(), currentPassword: pw } : {}) });
      setProfile(r); fill(r); setSaved(true); toast(`Saved. Your dashboard now follows ${r.targetExam}.`, "ok");
      window.dispatchEvent(new Event("ef-coins")); // lets the navbar pick up the new name
    } catch (x: any) { setErr(x.message || "Could not save. Please try again."); } finally { setBusy(false); }
  };
  const cancel = () => { if (p) fill(p); setErrs({}); setErr(""); setSaved(false); };

  const done = hist ?? [], xp = xpFromAttempts(done), lv = levelFromXp(xp), streak = streakDays(done);
  const item = (id?: string) => shop?.items?.find((i: any) => i.id === id);
  const t = item(shop?.inventory?.equipped?.title), f = shop?.inventory?.equipped?.frame as string | undefined;
  const mode = getMode(), style = getStoredStyle(), snd = soundOn();

  const appearance = <section id="appearance" className="card card-pad stack settings-section" style={{ gap: 18 }} aria-labelledby="appearance-h">
    <div><h2 className="card-title" id="appearance-h">Appearance</h2><p className="sub">Saved on this device and applied to every page, including Lecture Pace.</p></div>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">Style</legend>
      <div className="choice-grid">{STYLES.map((s) => <button type="button" key={s} aria-pressed={style === s} onClick={() => { setStyle(s); toast(`${STYLE_NAMES[s]} style on.`, "ok"); }}><b>{STYLE_NAMES[s]}</b><small>{STYLE_HINTS[s]}</small></button>)}</div></fieldset>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">Journey theme</legend>
      <div className="choice-grid">{(["auto", ...SKINS] as SkinPref[]).map((k) => <button type="button" key={k} aria-pressed={getSkinPref() === k} onClick={() => { setSkinPref(k); toast(k === "auto" ? "Theme now follows your exam." : `${SKIN_NAMES[k]} theme on.`, "ok"); }}>{k !== "auto" && <span className="skin-prev" aria-hidden="true"><Traveler skin={k} puff={false} /></span>}<b>{k === "auto" ? "Match my exam" : SKIN_NAMES[k]}</b><small>{k === "auto" ? `Currently ${SKIN_NAMES[skinForExam(p?.targetExam)]}` : SKIN_HINTS[k]}</small></button>)}</div></fieldset>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">Mode</legend>
      <div className="choice-grid">{MODES.map(([m, l, d]) => <button type="button" key={m} disabled={style === "astra"} aria-pressed={style === "astra" ? m === "dark" : mode === m} onClick={() => setMode(m)}><b>{l}</b><small>{d}</small></button>)}</div>
      {style === "astra" && <p className="hint">Astra is always dark. Switch to Aura to choose Light or System.</p>}</fieldset>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">Language / भाषा</legend>
      <div className="choice-grid">{([["en", "English", "App labels in English"], ["hi", "हिन्दी", "ऐप के लेबल हिन्दी में"]] as const).map(([k, l, d]) => <button type="button" key={k} aria-pressed={getLang() === k} onClick={() => setLang(k)}><b>{l}</b><small>{d}</small></button>)}</div></fieldset>
    <label className="switch"><input type="checkbox" checked={getLite()} onChange={(e) => setLite(e.target.checked)} /><span>Low-data mode<small>No ads and no animation. Faster on slow networks and older phones.</small></span></label>
    <div><label className="label" htmlFor="exam-date">Exam date</label><input id="exam-date" className="input" type="date" defaultValue={getExamDate() ?? ""} onChange={(e) => setExamDate(e.target.value || null)} style={{ maxWidth: 200 }} /><p className="hint">Shows a countdown on Home. Saved on this device.</p></div>
    <label className="switch"><input type="checkbox" checked={getMotion() === "reduce"} onChange={(e) => setMotion(e.target.checked ? "reduce" : "system")} /><span>Reduce motion<small>Turns off animations. Your device's reduced-motion setting is always respected.</small></span></label>
  </section>;

  const prefs = <section id="preferences" className="card card-pad stack settings-section" style={{ gap: 14 }} aria-labelledby="prefs-h">
    <div><h2 className="card-title" id="prefs-h">Sound &amp; practice</h2><p className="sub">Saved on this device.</p></div>
    <label className="switch"><input type="checkbox" checked={snd} onChange={(e) => { setSound(e.target.checked); if (e.target.checked) sfx("pop"); rerender(); }} /><span><Volume2 size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Sound effects<small>Short tones for correct answers, results and level-ups. Nothing plays during timed exams except warnings.</small></span></label>
    {!admin && <label className="switch"><input type="checkbox" checked={instantCheckOn()} onChange={(e) => { setInstantCheck(e.target.checked); rerender(); }} /><span>Check answers automatically in Practice<small>Reveal the answer and explanation right after you pick an option.</small></span></label>}
  </section>;

  const account = <section id="help" className="card card-pad stack settings-section" style={{ gap: 14 }} aria-labelledby="help-h"><h2 className="card-title" id="help-h">Help &amp; account</h2>
    <div className="set-row"><div><b>Quick tour</b><div className="sub">Replay the short walkthrough of ExamForge.</div></div><button className="btn btn-sm" onClick={openTutorial}><CircleHelp size={14} aria-hidden="true" />Open tour</button></div>
    <div className="set-row"><div><b>Log out</b><div className="sub">Sign out on this device.</div></div><button className="btn btn-sm btn-danger" onClick={logout}><LogOut size={14} aria-hidden="true" />Log out</button></div>
  </section>;

  const nav = (items: [string, string, any][]) => <nav className="settings-nav" aria-label="Settings sections">{items.map(([h, l, I]) => <a key={h} href={`#${h}`}><I size={16} aria-hidden="true" />{l}</a>)}</nav>;

  if (admin) return <Shell narrow><div className="stack" style={{ gap: 18 }}><PageHeader title="Settings" sub="Admin account" />{appearance}{prefs}{account}</div></Shell>;
  if (!p) return <Shell>{err ? <div className="alert alert-bad" role="alert">{err}</div> : <Loading text="Loading your profile" />}</Shell>;

  return <Shell><div className="stack" style={{ gap: 24 }}>
    <SubNav group="me" />
    <PageHeader title="Profile & settings" sub={`${p.email}${p.targetExam ? ` · Preparing for ${p.targetExam}` : ""}`} />
    <div className="settings-layout">
      {nav([["details", "Your details", UserRound], ["appearance", "Appearance", Palette], ["preferences", "Sound & practice", SlidersHorizontal], ["rewards", "Level & coins", Store], ["help", "Help & account", LifeBuoy]])}
      <div className="stack" style={{ gap: 20, minWidth: 0 }}>
        <form id="details" className="card card-pad stack settings-section" style={{ gap: 18 }} onSubmit={save} noValidate aria-labelledby="details-h">
          <div><h2 className="card-title" id="details-h">Your details</h2><p className="sub">Your dashboard lists {target || "your"} tests first. Change the exam any time.</p></div>
          <div className="profile-cols">
            <Field label="Name" error={errs.name}><input className="input" required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={80} autoComplete="name" /></Field>
            <Field label="Age" error={errs.age}><input className="input" required type="number" inputMode="numeric" min={8} max={99} value={age} onChange={(e) => { setAge(e.target.value); setSaved(false); }} /></Field>
            <Field label="Email" error={errs.email} hint="This is your login. Changing it needs your current password."><input className="input" required type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} autoComplete="email" /></Field>
            <Field label="Target score" optional error={errs.score} hint="A percentage, 1 to 100."><input className="input" type="number" inputMode="numeric" min={1} max={100} value={score} onChange={(e) => { setScore(e.target.value); setSaved(false); }} placeholder="e.g. 85" /></Field>
          </div>
          {emailChanged && <Field label="Current password" error={errs.pw}><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" style={{ maxWidth: 320 }} /></Field>}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">Target exam</legend>
            <div className="chip-wrap">{exams.map((x) => <button type="button" key={x} aria-pressed={exam === x} className={`chip-pick ${exam === x ? "on" : ""}`} onClick={() => { setExam(x); setSaved(false); }}>{x}</button>)}<button type="button" aria-pressed={exam === "__other"} className={`chip-pick ${exam === "__other" ? "on" : ""}`} onClick={() => setExam("__other")}>Other</button></div>
            {exam === "__other" && <input className="input" style={{ marginTop: 10, maxWidth: 320 }} aria-label="Exam name" value={other} onChange={(e) => { setOther(e.target.value); setSaved(false); }} placeholder="Type your exam name" maxLength={60} />}
            {errs.exam && <div className="field-error" role="alert">{errs.exam}</div>}</fieldset>
          <div role="status" aria-live="polite">{saved && !dirty && <div className="alert alert-ok">Saved. Your dashboard now follows {p.targetExam}.</div>}</div>
          {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} />{err}</div>}
          <div className="save-bar"><button className="btn btn-primary" disabled={busy || !dirty}>{busy ? <><Loader size={16} className="animate-spin" />Saving</> : <><Save size={16} aria-hidden="true" />Save changes</>}</button><button type="button" className="btn" disabled={busy || !dirty} onClick={cancel}>Cancel</button>{dirty && !busy && <span className="sub">Unsaved changes</span>}</div>
        </form>
        {appearance}{prefs}
        <section id="rewards" className="card card-pad stack settings-section" style={{ gap: 14 }} aria-labelledby="rew-h">
          <div className="row between"><h2 className="card-title" id="rew-h">Level &amp; coins</h2><Link to="/shop" className="btn btn-sm"><Store size={14} aria-hidden="true" />Open shop</Link></div>
          <div className="grid-stats"><div className="stat"><div className="stat-l">Level</div><div className="stat-v">{lv.level}</div><div className="stat-d">{lv.title}</div></div><div className="stat"><div className="stat-l">XP</div><div className="stat-v">{hist ? xp : "-"}</div><div className="stat-d">{lv.into} / {lv.need} to next</div></div><div className="stat"><div className="stat-l">Coins</div><div className="stat-v">{shop ? shop.coins : "-"}</div></div><div className="stat"><div className="stat-l">Day streak</div><div className="stat-v">{hist ? streak : "-"}</div></div></div>
          <div className="set-row"><span className="sub">Shown on leaderboards as</span><NameTag r={{ name: firstName(p) || p.name, title: t ? `${t.emoji} ${t.name}` : null, frame: f ? f.replace("frame-", "") : null }} /></div>
          <div className="set-row"><span className="sub">50-50 lifelines</span><b>{shop ? shop.inventory.lifelines : "-"}</b></div>
        </section>
        {account}
      </div>
    </div>
  </div></Shell>;
}
