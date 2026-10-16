import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Save, Loader, TriangleAlert, GraduationCap, Volume2, VolumeX, Sun, Moon, CircleHelp, LogOut, Store, Flame, Trophy, Coins, KeyRound, ClipboardList } from "lucide-react";
import Shell, { Loading } from "../components/Shell"; import { TeacherScene } from "../components/Scenes"; import NameTag from "../components/NameTag"; import { openTutorial } from "../components/Tutorial";
import { api } from "../lib/api"; import { getMe, logout, STYLES, STYLE_NAMES, getStyle, setStyle, isDark, isAstra } from "../lib/auth";
import { levelFromXp, xpFromAttempts, streakDays, saveLevel, saveXp, soundOn, toggleSound, sfx } from "../lib/game";
import { loadProfile, setProfile, setCoins, firstName, type Profile } from "../lib/profile"; import { COMMON } from "./Welcome";

const setMode = (dark: boolean) => {
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  if (isAstra() && !dark) setStyle("aura"); else document.documentElement.classList.toggle("dark", dark || isAstra());
};

export default function ProfilePage() {
  const admin = getMe()?.role === "ADMIN";
  const [, force] = useState(0); const rerender = () => force((n) => n + 1);
  const [p, setP] = useState<Profile | null>(null); const [hist, setHist] = useState<any[] | null>(null); const [shop, setShop] = useState<any | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [age, setAge] = useState(""); const [exam, setExam] = useState(""); const [other, setOther] = useState(""); const [score, setScore] = useState("");
  const [exams, setExams] = useState<string[]>(COMMON); const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);

  const fill = (u: Profile) => {
    setP(u); setName(u.name ?? ""); setEmail(u.email ?? ""); setAge(u.age ? String(u.age) : ""); setScore(u.targetScore ? String(u.targetScore) : "");
    if (u.targetExam) { if (COMMON.includes(u.targetExam)) { setExam(u.targetExam); setOther(""); } else { setExam("__other"); setOther(u.targetExam); } }
  };
  useEffect(() => {
    if (admin) return;
    loadProfile(true).then(fill).catch((e) => setErr(e.message));
    api("/history").then((h) => { const d = (Array.isArray(h) ? h : []).filter((a: any) => a.result); setHist(d); const lv = levelFromXp(xpFromAttempts(d)); saveXp(xpFromAttempts(d)); saveLevel(lv.level); }).catch(() => setHist([]));
    api("/shop").then((s) => { setShop(s); setCoins(s.coins); }).catch(() => {});
    api("/tests?limit=100").then((t: any[]) => { const live = [...new Set(t.map((x) => String(x.examName)).filter(Boolean))]; setExams([...live, ...COMMON.filter((c) => !live.some((l) => l.toLowerCase() === c.toLowerCase()))]); }).catch(() => {});
  }, []); // eslint-disable-line

  const target = exam === "__other" ? other.trim() : exam;
  const emailChanged = !!p && email.trim().toLowerCase() !== (p.email ?? "").toLowerCase();
  const save = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setOk("");
    if (!target) return setErr("Please pick your target exam.");
    setBusy(true);
    try {
      const r = await api<Profile>("/me", "PUT", { name: name.trim(), age: Number(age), targetExam: target, targetScore: score ? Number(score) : null, ...(emailChanged ? { email: email.trim(), currentPassword: pw } : {}) });
      setProfile(r); fill(r); setPw(""); setOk("Saved! Your dashboard now follows " + r.targetExam + "."); sfx("win");
      window.dispatchEvent(new Event("ef-coins")); // lets the navbar pick up the new name
    } catch (x: any) { setErr(x.message || "Could not save. Please try again."); } finally { setBusy(false); }
  };

  const done = hist ?? [], xp = xpFromAttempts(done), lv = levelFromXp(xp), streak = streakDays(done);
  const item = (id?: string) => shop?.items?.find((i: any) => i.id === id);
  const t = item(shop?.inventory?.equipped?.title), f = shop?.inventory?.equipped?.frame as string | undefined;
  const look = getStyle();

  const looks = <div className="card card-pad stack" style={{ gap: 16 }}>
    <h2 className="card-title">Look &amp; sound</h2>
    <div><label className="label">Visual style</label><div className="chip-wrap">{STYLES.map((s) => <button type="button" key={s} className={`chip-pick ${look === s ? "on" : ""}`} onClick={() => { setStyle(s); sfx("level"); rerender(); }}>{STYLE_NAMES[s]}</button>)}</div></div>
    <div><label className="label">Mode</label><div className="chip-wrap">
      <button type="button" className={`chip-pick ${!isDark() ? "on" : ""}`} onClick={() => { setMode(false); sfx("pop"); rerender(); }}><Sun size={14} style={{ verticalAlign: "-2px" }} /> Light</button>
      <button type="button" className={`chip-pick ${isDark() ? "on" : ""}`} onClick={() => { setMode(true); sfx("pop"); rerender(); }}><Moon size={14} style={{ verticalAlign: "-2px" }} /> Dark</button></div>
      {isAstra() && <p className="sub" style={{ marginTop: 6 }}>Astra is always dark. Choosing Light switches back to Aura.</p>}</div>
    <div><label className="label">Sound effects</label><div className="chip-wrap">
      <button type="button" className={`chip-pick ${soundOn() ? "on" : ""}`} onClick={() => { if (!soundOn()) toggleSound(); sfx("pop"); rerender(); }}><Volume2 size={14} style={{ verticalAlign: "-2px" }} /> On</button>
      <button type="button" className={`chip-pick ${!soundOn() ? "on" : ""}`} onClick={() => { if (soundOn()) toggleSound(); rerender(); }}><VolumeX size={14} style={{ verticalAlign: "-2px" }} /> Off</button></div></div>
  </div>;

  const account = <div className="card card-pad stack" style={{ gap: 14 }}>
    <h2 className="card-title">Help &amp; account</h2>
    <div className="set-row"><div><b>How to play</b><div className="sub">Replay the quick tour of ExamForge.</div></div><button className="btn btn-sm" onClick={openTutorial}><CircleHelp size={14} />Open tour</button></div>
    <div className="set-row"><div><b>Log out</b><div className="sub">Sign out on this device.</div></div><button className="btn btn-sm btn-danger" onClick={logout}><LogOut size={14} />Logout</button></div>
  </div>;

  if (admin) return <Shell narrow><div className="stack" style={{ gap: 18 }}><div><h1 style={{ margin: 0 }}>Settings</h1><p className="sub">Admin account</p></div>{looks}{account}</div></Shell>;
  if (!p) return <Shell>{err ? <div className="alert alert-bad">{err}</div> : <Loading text="Loading your profile" />}</Shell>;

  return <Shell><div className="stack" style={{ gap: 22 }}>
    <section className="hero">
      <div className="blob" style={{ width: 220, height: 220, background: "#22d3ee", right: -40, top: -60 }} />
      <div className="hero-mascot"><TeacherScene className="sc-round" /></div>
      <h1>{p.name || "My profile"}</h1>
      <p>{p.email}{p.targetExam ? ` · Preparing for ${p.targetExam}` : ""}</p>
      <div className="xp-card"><div className="row between"><b>Lv {lv.level} · {lv.title}</b><span>{streak > 0 ? `🔥 ${streak}-day streak` : "🔥 Start a streak today"}</span></div><div className="xpbar"><i style={{ width: `${Math.max(4, lv.pct)}%` }} /></div><small>{lv.into} / {lv.need} XP to Level {lv.level + 1}</small></div>
    </section>

    <section className="grid-stats">
      <div className="stat"><div className="stat-l"><Trophy size={14} />Level</div><div className="stat-v">{lv.level}</div></div>
      <div className="stat"><div className="stat-l"><Flame size={14} />Total XP</div><div className="stat-v">{xp}</div></div>
      <Link to="/shop" className="stat" style={{ textDecoration: "none", color: "inherit" }}><div className="stat-l"><Coins size={14} />Coins</div><div className="stat-v">{shop ? shop.coins : "-"}</div></Link>
      <div className="stat"><div className="stat-l"><ClipboardList size={14} />Tests taken</div><div className="stat-v">{hist ? done.length : "-"}</div></div>
    </section>

    <form className="card card-pad stack" style={{ gap: 16 }} onSubmit={save}>
      <div><h2 className="card-title">Your details</h2><p className="sub">Your dashboard shows {target || "your"} tests first. Change the exam any time.</p></div>
      <div className="profile-cols">
        <div><label className="label">Name</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></div>
        <div><label className="label">Age</label><input className="input" required type="number" inputMode="numeric" min={8} max={99} value={age} onChange={(e) => setAge(e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><label className="label">Target score <small>(optional, %)</small></label><input className="input" type="number" inputMode="numeric" min={1} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" /></div>
      </div>
      {emailChanged && <div className="fade-in"><label className="label"><KeyRound size={14} style={{ verticalAlign: "-2px" }} /> Current password <small>(needed to change your email)</small></label><input className="input" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" style={{ maxWidth: 320 }} /></div>}
      <div><label className="label"><GraduationCap size={14} style={{ verticalAlign: "-2px" }} /> Course / target exam</label>
        <div className="chip-wrap">{exams.map((x) => <button type="button" key={x} className={`chip-pick ${exam === x ? "on" : ""}`} onClick={() => setExam(x)}>{x}</button>)}<button type="button" className={`chip-pick ${exam === "__other" ? "on" : ""}`} onClick={() => setExam("__other")}>Other</button></div>
        {exam === "__other" && <input className="input" style={{ marginTop: 10, maxWidth: 320 }} value={other} onChange={(e) => setOther(e.target.value)} placeholder="Type your exam name" maxLength={60} />}</div>
      {err && <div className="alert alert-bad"><TriangleAlert size={17} />{err}</div>}{ok && <div className="alert alert-ok">{ok}</div>}
      <div><button className="btn btn-primary" disabled={busy}>{busy ? <Loader size={16} className="animate-spin" /> : <><Save size={16} />Save changes</>}</button></div>
    </form>

    <section className="profile-cols">
      <div className="card card-pad stack" style={{ gap: 14 }}>
        <div className="row between"><h2 className="card-title">Coins &amp; shop</h2><Link to="/shop" className="btn btn-sm"><Store size={14} />Open shop</Link></div>
        <div className="set-row"><span className="sub">Balance</span><span className="coin-chip" style={{ cursor: "default" }}><i className="coin" />{shop ? shop.coins : "-"}</span></div>
        <div className="set-row"><span className="sub">Wearing on leaderboards</span><span><NameTag r={{ name: firstName(p) || p.name, title: t ? `${t.emoji} ${t.name}` : null, frame: f ? f.replace("frame-", "") : null }} /></span></div>
        <div className="set-row"><span className="sub">50-50 lifelines</span><b>{shop ? shop.inventory.lifelines : "-"}</b></div>
        <div className="set-row"><span className="sub">Items owned</span><b>{shop ? shop.inventory.owned.length : "-"}</b></div>
      </div>
      {looks}
    </section>
    {account}
  </div></Shell>;
}
