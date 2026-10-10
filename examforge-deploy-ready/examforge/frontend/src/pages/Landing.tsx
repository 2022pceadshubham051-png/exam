import { useEffect } from "react"; import { Link, Navigate } from "react-router-dom";
import { Timer, BarChart3, ShieldCheck, Sparkles, BrainCircuit, Trophy, ArrowRight } from "lucide-react";
import PublicShell from "../components/PublicShell"; import AdSlot from "../components/AdSlot"; import { getMe } from "../lib/auth"; import { SITE, TIPS } from "../lib/content";

const features = [
  [Timer, "Real exam timers", "Full-length mock tests with test, section and optional per-question timers, just like the actual paper."],
  [Sparkles, "Untimed practice", "Learn at your own pace in practice mode with instant answers and explanations."],
  [BrainCircuit, "Adaptive practice", "Practice sets built from your weaker topics and slower areas, based on your earlier attempts."],
  [BarChart3, "Detailed analysis", "Accuracy, attempt rate, section, subject and topic-wise performance after every test."],
  [Trophy, "Leaderboard", "See how your official exam attempts rank against other students."],
  [ShieldCheck, "Fair and secure", "Correct answers stay on the server during the exam and scoring happens after you submit."],
] as const;

export default function Landing() {
  useEffect(() => { document.title = `${SITE} | Free online mock tests with analysis`; }, []);
  const me = getMe(); if (me) return <Navigate to={me.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
  return <PublicShell>
    <div className="stack" style={{ gap: 36 }}>
      <section className="pub-hero"><h1>Practice like it is the real exam.</h1>
        <p>{SITE} gives you full-length mock tests with section timers, instant results and a clear picture of what to improve next.</p>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}><Link className="btn btn-primary btn-lg" to="/login">Start practising<ArrowRight size={18} /></Link><Link className="btn btn-lg" to="/tips">Read exam tips</Link></div></section>
      <section className="stack" style={{ gap: 14 }}><h2 className="card-title" style={{ fontSize: "1.35rem" }}>What you get</h2>
        <div className="grid-auto">{features.map(([I, t, d]) => <article key={t} className="card card-pad stack" style={{ gap: 8 }}><span className="pub-ico"><I size={20} /></span><h3 style={{ fontWeight: 800 }}>{t}</h3><p className="sub">{d}</p></article>)}</div></section>
      <AdSlot />
      <section className="stack" style={{ gap: 14 }}><h2 className="card-title" style={{ fontSize: "1.35rem" }}>How it works</h2>
        <div className="grid-auto">{[["1. Create a free account", "Register with your email and pick a mock test from the library."], ["2. Take the test", "Choose timed exam mode or untimed practice. Answers autosave as you go."], ["3. Review and improve", "Read the analysis, check explanations and practise your weak topics."]].map(([t, d]) => <div key={t} className="card card-pad stack" style={{ gap: 6 }}><b>{t}</b><p className="sub">{d}</p></div>)}</div></section>
      <section className="stack" style={{ gap: 14 }}><div className="row between"><h2 className="card-title" style={{ fontSize: "1.35rem" }}>Exam preparation tips</h2><Link className="btn btn-sm" to="/tips">All articles<ArrowRight size={14} /></Link></div>
        <div className="grid-auto">{TIPS.slice(0, 3).map((t) => <Link key={t.slug} to={`/tips/${t.slug}`} className="card card-pad stack pub-link" style={{ gap: 6 }}><b>{t.title}</b><span className="sub">{t.summary}</span></Link>)}</div></section>
    </div>
  </PublicShell>;
}
