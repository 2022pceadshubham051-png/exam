import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader, TriangleAlert, GraduationCap, Save } from "lucide-react";
import { TeacherScene } from "../components/Scenes"; import { api } from "../lib/api"; import { Logo } from "../components/Shell";
import { loadProfile, setProfile, refreshCoins, type Profile } from "../lib/profile"; import { confetti } from "../components/Confetti"; import { sfx } from "../lib/game";

export const COMMON = ["SSC CGL", "SSC CHSL", "UPSC CSE", "IBPS PO", "SBI PO", "RRB NTPC", "JEE Main", "NEET UG", "CAT", "GATE", "CUET", "CTET"];

function ProfileForm({ edit }: { edit?: boolean }) {
  const nav = useNavigate(); const [qs] = useSearchParams();
  const [p, setP] = useState<Profile | null>(null); const [name, setName] = useState(""); const [age, setAge] = useState(""); const [exam, setExam] = useState(""); const [other, setOther] = useState(""); const [score, setScore] = useState("");
  const [exams, setExams] = useState<string[]>(COMMON); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  useEffect(() => {
    loadProfile(true).then((u) => {
      if (u.onboarded && !edit) { nav("/dashboard", { replace: true }); return; }
      setP(u); setName(u.name ?? ""); setAge(u.age ? String(u.age) : ""); setScore(u.targetScore ? String(u.targetScore) : "");
      if (u.targetExam) { if (COMMON.includes(u.targetExam)) setExam(u.targetExam); else { setExam("__other"); setOther(u.targetExam); } }
    }).catch((e) => setErr(e.message));
    // Exams that really exist on the platform come first, so students can pick content that is actually available.
    api("/tests?limit=100").then((t: any[]) => { const live = [...new Set(t.map((x) => String(x.examName)).filter(Boolean))]; setExams([...live, ...COMMON.filter((c) => !live.some((l) => l.toLowerCase() === c.toLowerCase()))]); }).catch(() => {});
  }, []); // eslint-disable-line
  const target = exam === "__other" ? other.trim() : exam;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setSaved(false);
    if (!target) return setErr("Please pick your target exam.");
    setBusy(true);
    try {
      const r = await api<Profile>("/me", "PUT", { ...(p?.needsName || edit ? { name: name.trim() || undefined } : {}), age: Number(age), targetExam: target, targetScore: score ? Number(score) : null });
      setProfile(r); void refreshCoins();
      if (r.welcomeCoins) { sfx("win"); confetti(60, { x: 0.5, y: 0.4 }); }
      if (edit) { setSaved(true); return; }
      const t = qs.get("test"); nav(t ? `/exam/${t}` : "/dashboard", { replace: true });
    } catch (e: any) { setErr(e.message || "Could not save. Please try again."); } finally { setBusy(false); }
  };
  if (!p && !err) return <div className="card card-pad"><p className="sub">Loading...</p></div>;
  return <form className="card card-pad stack fade-in" style={{ width: "100%", maxWidth: 520, gap: 18 }} onSubmit={submit}>
    <div><h2 style={{ fontSize: "1.55rem", fontWeight: 800 }}>{edit ? "My profile" : p?.name ? `Welcome, ${p.name.split(" ")[0]}!` : "Welcome!"}</h2>
      <p className="sub" style={{ marginTop: 4 }}>{edit ? "Update your details. Your tests and dashboard follow your target exam." : "Pick your exam to get started. You also get 50 free coins."}</p></div>
    {(p?.needsName || edit) && <div><label className="label">Your name</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" maxLength={80} /></div>}
    <div><label className="label">Your age</label><input className="input" required type="number" inputMode="numeric" min={8} max={99} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 19" style={{ maxWidth: 160 }} /></div>
    <div><label className="label"><GraduationCap size={14} style={{ verticalAlign: "-2px" }} /> Which exam are you preparing for?</label>
      <div className="chip-wrap">{exams.map((x) => <button type="button" key={x} className={`chip-pick ${exam === x ? "on" : ""}`} onClick={() => setExam(x)}>{x}</button>)}<button type="button" className={`chip-pick ${exam === "__other" ? "on" : ""}`} onClick={() => setExam("__other")}>Other</button></div>
      {exam === "__other" && <input className="input" style={{ marginTop: 10 }} value={other} onChange={(e) => setOther(e.target.value)} placeholder="Type your exam name" maxLength={60} autoFocus />}</div>
    <div><label className="label">Target score <small>(optional)</small></label><input className="input" type="number" inputMode="numeric" min={1} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" style={{ maxWidth: 160 }} /></div>
    {err && <div className="alert alert-bad"><TriangleAlert size={17} />{err}</div>}
    {saved && <div className="alert alert-ok">Saved! Your dashboard now follows {target}.</div>}
    <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <Loader size={18} className="animate-spin" /> : edit ? <><Save size={18} />Save profile</> : <>Start practising<ArrowRight size={18} /></>}</button>
  </form>;
}

export default function Welcome() {
  return <div className="auth">
    <section className="auth-hero">
      <div className="blob" style={{ width: 300, height: 300, background: "#22d3ee", top: -80, right: -60 }} />
      <div className="blob" style={{ width: 260, height: 260, background: "#f472b6", bottom: -60, left: 40, animationDelay: "-4s" }} />
      <div className="brand" style={{ color: "#fff" }}><Logo />ExamForge</div>
      
      <TeacherScene className="sc-round" />
      <div><h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, lineHeight: 1.1 }}>Just 2 quick questions.</h1>
        <p style={{ opacity: .85, marginTop: 14, maxWidth: 440, lineHeight: 1.6 }}>We use your answers to show the right tests first.</p></div>
      <div style={{ opacity: .6, fontSize: ".78rem" }}>ExamForge Mock Test Platform</div>
    </section>
    <section className="auth-form"><ProfileForm /></section>
  </div>;
}
