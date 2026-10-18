import { StartPath } from "../components/Journey"; import { takeAfterLogin } from "../lib/prefs"; import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader, TriangleAlert } from "lucide-react";
import { api } from "../lib/api"; import { BrandLockup } from "../components/LogoMark"; import { Field, toast } from "../components/ui";
import { loadProfile, setProfile, refreshCoins, type Profile } from "../lib/profile"; import { sfx } from "../lib/game";

export const COMMON = ["SSC CGL", "SSC CHSL", "UPSC CSE", "IBPS PO", "SBI PO", "RRB NTPC", "JEE Main", "NEET UG", "CAT", "GATE", "CUET", "CTET"];

/** Merge exams that really exist on the platform (first) with the common list. */
export const mergeExams = (live: string[]) => [...live, ...COMMON.filter((c) => !live.some((l) => l.toLowerCase() === c.toLowerCase()))];

function ProfileForm() {
  const nav = useNavigate(); const [qs] = useSearchParams();
  const [p, setP] = useState<Profile | null>(null); const [name, setName] = useState(""); const [age, setAge] = useState(""); const [exam, setExam] = useState(""); const [other, setOther] = useState(""); const [score, setScore] = useState("");
  const [exams, setExams] = useState<string[]>(COMMON); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    loadProfile(true).then((u) => {
      if (u.onboarded) { nav(takeAfterLogin() ?? "/home", { replace: true }); return; }
      setP(u); setName(u.name ?? ""); setAge(u.age ? String(u.age) : ""); setScore(u.targetScore ? String(u.targetScore) : "");
      if (u.targetExam) { if (COMMON.includes(u.targetExam)) setExam(u.targetExam); else { setExam("__other"); setOther(u.targetExam); } }
    }).catch((e) => setErr(e.message));
    api("/tests?limit=100").then((t: any[]) => setExams(mergeExams([...new Set(t.map((x) => String(x.examName)).filter(Boolean))]))).catch(() => {});
  }, []); // eslint-disable-line
  const target = exam === "__other" ? other.trim() : exam;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setErr("");
    const v: Record<string, string> = {}; const a = Number(age);
    if (p?.needsName && !name.trim()) v.name = "Enter your name.";
    if (!Number.isInteger(a) || a < 8 || a > 99) v.age = "Enter an age between 8 and 99.";
    if (!target) v.exam = "Pick your target exam."; if (score && (Number(score) < 1 || Number(score) > 100)) v.score = "Use a number from 1 to 100.";
    setErrs(v); if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await api<Profile>("/me", "PUT", { ...(p?.needsName ? { name: name.trim() } : {}), age: a, targetExam: target, targetScore: score ? Number(score) : null });
      setProfile(r); void refreshCoins();
      if (r.welcomeCoins) { sfx("win"); toast(`Welcome! ${r.welcomeCoins} coins added to your account.`, "gold"); }
      const t = qs.get("test"); nav(t ? `/exam/${t}` : takeAfterLogin() ?? "/home", { replace: true });
    } catch (x: any) { setErr(x.message || "Could not save. Please try again."); } finally { setBusy(false); }
  };
  if (!p && !err) return <div className="card card-pad" role="status"><p className="sub">Loading</p></div>;
  return <form className="card card-pad stack fade-in" style={{ width: "100%", maxWidth: 520, gap: 18 }} onSubmit={submit} noValidate>
    <div><h1 style={{ fontSize: "1.6rem" }}>{p?.name ? `Welcome, ${p.name.split(" ")[0]}` : "Welcome"}</h1>
      <p className="sub" style={{ marginTop: 4 }}>Pick your exam to get started. New accounts also get free coins.</p></div>
    {p?.needsName && <Field label="Your name" error={errs.name}><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" maxLength={80} /></Field>}
    <Field label="Your age" error={errs.age}><input className="input" required type="number" inputMode="numeric" min={8} max={99} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 19" style={{ maxWidth: 160 }} /></Field>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">Which exam are you preparing for?</legend>
      <div className="chip-wrap">{exams.map((x) => <button type="button" key={x} aria-pressed={exam === x} className={`chip-pick ${exam === x ? "on" : ""}`} onClick={() => setExam(x)}>{x}</button>)}<button type="button" aria-pressed={exam === "__other"} className={`chip-pick ${exam === "__other" ? "on" : ""}`} onClick={() => setExam("__other")}>Other</button></div>
      {exam === "__other" && <input className="input" style={{ marginTop: 10 }} aria-label="Exam name" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Type your exam name" maxLength={60} autoFocus />}
      {errs.exam && <div className="field-error" role="alert">{errs.exam}</div>}</fieldset>
    <Field label="Target score" optional error={errs.score} hint="A percentage you are aiming for."><input className="input" type="number" inputMode="numeric" min={1} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" style={{ maxWidth: 160 }} /></Field>
    {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} />{err}</div>}
    <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <Loader size={18} className="animate-spin" /> : <>Start practising<ArrowRight size={18} /></>}</button>
  </form>;
}

export default function Welcome() {
  return <div className="auth">
    <section className="auth-hero on-dark" aria-label="About ExamForge">
      <BrandLockup size={40} tagline onDark />
      <div><h1>Two quick questions.</h1><p className="lead">We use your answers to show the right tests first. You can change them any time in Profile &amp; settings.</p></div>
      <StartPath at={1} />
      <div className="auth-foot">ExamForge Mock Test Platform</div>
    </section>
    <section className="auth-form"><ProfileForm /></section>
  </div>;
}
