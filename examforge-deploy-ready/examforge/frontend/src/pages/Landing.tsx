import { useEffect, useState } from "react"; import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Check, Timer, Sparkles, BrainCircuit } from "lucide-react";
import { Traveler } from "../components/Journey"; import PublicShell from "../components/PublicShell"; import AdSlot from "../components/AdSlot"; import { getMe } from "../lib/auth"; import { SITE, TIPS } from "../lib/content";

const after = [
  ["Score, accuracy and time", "See marks, attempted vs skipped, and how long each section took."],
  ["Section, subject and topic breakdown", "Find the topics that cost you marks instead of guessing."],
  ["Answer review with explanations", "Go through every question, your answer and the correct one."],
  ["Smart Coach", "Ranks what to practise next from the questions you have actually attempted."],
  ["Leaderboard", "Exam-mode attempts are ranked; practice never affects the standings."],
] as const;
const modes = [
  [Timer, "Exam mode", "Test, section and optional per-question timers, with negative marking as set for the test."],
  [Sparkles, "Practice mode", "No timer. The answer and explanation appear right after each question."],
  [BrainCircuit, "Smart practice", "Question sets built from your weaker topics, based on your earlier attempts."],
] as const;
const EXAMS = ["SSC CGL", "RRB NTPC", "UPSC Prelims", "JEE Main", "NEET UG", "Bank PO", "GATE"];

/** Static preview of the real exam screen, assembled from the same classes the exam uses. The content is a sample, not user data. */
function ExamPreview() {
  // Sample screen that plays a short answering loop; stays static when motion is reduced.
  const base = ["ANSWERED", "ANSWERED", "ANSWERED_REVIEW", "NOT_ANSWERED", "", "", "REVIEW", "", "ANSWERED", "", "", "", "", "", "", ""];
  const [step, setStep] = useState(4); // 0..4 = question 5 phase
  useEffect(() => {
    const r = document.documentElement.classList.contains("reduce-motion") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (r) return; setStep(0);
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1400); return () => clearInterval(t);
  }, []);
  const sel = step >= 2 ? "B" : step === 1 ? "C" : "";
  const states = base.map((s, i) => (i === 4 ? (step >= 3 ? "ANSWERED" : "") : i === 5 ? (step >= 4 ? "ANSWERED" : "") : s));
  const cur = step >= 3 ? 5 : 4;
  return <figure className="card lp-preview" aria-label="Preview of the exam screen" style={{ margin: 0 }}>
    <div className="row between"><span className="pill pill-brand">Quantitative Aptitude · Q{cur + 1} of 16</span><span className="pill" aria-label="Sample, not a real test">Sample screen</span></div>
    <p style={{ fontWeight: 600, lineHeight: 1.6 }}>A train 120 m long crosses a pole in 6 seconds. What is its speed?</p>
    <div className="stack" style={{ gap: 8 }}>
      {[["A", "12 m/s"], ["B", "20 m/s"], ["C", "24 m/s"], ["D", "72 m/s"]].map(([k, t]) => <div key={k} className={`opt ${sel === k ? "sel" : ""}`} aria-hidden="true"><span className="opt-k">{k}</span><span>{t}</span></div>)}
    </div>
    <div className="lp-pal" aria-hidden="true">{states.map((s, i) => <span key={i} className={`qb ${i === cur ? `cur ${sel ? "qb-ANSWERED" : ""}` : s ? `qb-${s}` : ""}`} style={{ display: "grid", placeItems: "center" }}>{i + 1}</span>)}</div>
    <p className="sub" style={{ fontSize: ".78rem" }}>Palette: filled = answered · dashed or flagged = marked for review · red = not answered · outlined = current.</p>
  </figure>;
}

export default function Landing() {
  useEffect(() => { document.title = `${SITE} | Free online mock tests with analysis`; }, []);
  const me = getMe(); if (me) return <Navigate to={me.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
  return <PublicShell>
    <div className="lp">
      <section className="lp-hero" aria-labelledby="hero-h">
        <div>
          <p className="eyebrow">Mock tests for competitive exams</p>
          <h1 id="hero-h" style={{ marginTop: 10 }}>Practice like it is <em>the real exam.</em></h1>
          <p className="lead">{SITE} gives you full-length mock tests with section timers, instant results and a clear picture of what to improve next.</p>
          <div className="lp-actions"><Link className="btn btn-primary btn-lg" to="/login">Start practising<ArrowRight size={18} aria-hidden="true" /></Link><Link className="btn btn-lg" to="/tips">Read exam tips</Link></div>
          <p className="lp-note">Register with your email, pick a test, and your answers save as you go.</p>
        </div>
        <ExamPreview />
      </section>

      <section className="lp-section" data-reveal aria-labelledby="how-h"><h2 id="how-h">How it works</h2>
        <ol className="lp-steps">
          {[["1", "Create a free account", "Register with your email and choose your target exam. Tests for that exam are listed first."], ["2", "Take a test", "Pick timed exam mode or untimed practice. Mark questions for review and come back to them."], ["3", "Review and improve", "Read the analysis, check explanations, then practise the topics that cost you marks."]].map(([n, t, d]) => <li key={n} data-reveal><span className="n" aria-hidden="true">{n}</span><h3>{t}</h3><p className="sub">{d}</p></li>)}
        </ol><div className="rail-scene" aria-hidden="true"><div className="rail" /><div className="rail-train"><Traveler /></div></div></section>

      <section className="lp-split" data-reveal aria-labelledby="modes-h">
        <div><h2 id="modes-h">Three ways to practise</h2><p className="sub" style={{ marginTop: 10, fontSize: "1rem" }}>Switch modes on the same test, depending on whether you are building skill or rehearsing the paper.</p>
          <div className="lp-exams" style={{ marginTop: 20 }} aria-label="Exams you can practise for">{EXAMS.map((e) => <span key={e} className="pill">{e}</span>)}</div></div>
        <ul className="lp-list">{modes.map(([I, t, d]) => <li key={t} data-reveal><I size={20} aria-hidden="true" /><div><b>{t}</b><span className="sub">{d}</span></div></li>)}</ul>
      </section>

      <section className="lp-split" data-reveal aria-labelledby="after-h">
        <div><h2 id="after-h">What you get after every test</h2><p className="sub" style={{ marginTop: 10, fontSize: "1rem" }}>Correct answers stay on the server during the exam and scoring happens only after you submit.</p></div>
        <ul className="lp-list">{after.map(([t, d]) => <li key={t} data-reveal><Check size={20} aria-hidden="true" /><div><b>{t}</b><span className="sub">{d}</span></div></li>)}</ul>
      </section>

      <section className="lp-section" data-reveal aria-labelledby="tips-h"><div className="row between" style={{ marginBottom: 20 }}><h2 id="tips-h" style={{ marginBottom: 0 }}>Exam preparation tips</h2><Link className="btn btn-sm" to="/tips">All articles<ArrowRight size={14} aria-hidden="true" /></Link></div>
        <div className="lp-tips">{TIPS.slice(0, 3).map((t) => <Link key={t.slug} to={`/tips/${t.slug}`} className="lp-tip"><b>{t.title}</b><span className="sub">{t.summary}</span></Link>)}</div></section>

      <AdSlot />
      <section className="lp-cta" data-reveal aria-label="Get started"><div><h2>Take your first mock test today</h2><p>Free to register. Pick a test and start in under a minute.</p></div><Link className="btn btn-primary btn-lg" to="/login">Create your account<ArrowRight size={18} aria-hidden="true" /></Link></section>
    </div>
  </PublicShell>;
}
