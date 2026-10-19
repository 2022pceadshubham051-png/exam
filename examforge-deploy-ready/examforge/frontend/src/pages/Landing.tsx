import { useEffect, useRef, useState, type KeyboardEvent } from "react"; import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Timer, BookOpenCheck, Target, ChevronDown } from "lucide-react";
import { Traveler } from "../components/Journey"; import PublicShell from "../components/PublicShell"; import AdSlot from "../components/AdSlot"; import { getMe } from "../lib/auth"; import { SITE, TIPS } from "../lib/content"; import { getSkin, skinForExam, type Skin } from "../lib/skin";

const EXAMS = ["SSC CGL", "RRB NTPC", "UPSC Prelims", "JEE Main", "NEET UG", "Bank PO", "GATE"];

const reducedMotion = () => typeof window !== "undefined" && (document.documentElement.classList.contains("reduce-motion") || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
const clock = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`; };

/** Adds `in` once the element scrolls into view. Without IntersectionObserver (or with reduced motion) it is `in` immediately. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null); const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reducedMotion() || typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

/** The hero: a sample of the real exam screen, assembled from the exam's own classes. It plays one short answering loop; the content is a sample, not user data. */
function ExamPreview() {
  const base = ["ANSWERED", "ANSWERED", "ANSWERED_REVIEW", "NOT_ANSWERED", "", "", "REVIEW", "", "ANSWERED", "", "", "", "", "", "", ""];
  const [step, setStep] = useState(4); const [left, setLeft] = useState(4368);
  useEffect(() => {
    if (reducedMotion()) return; setStep(0);
    const a = setInterval(() => setStep((s) => (s + 1) % 5), 1500), b = setInterval(() => setLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);
  const sel = step >= 2 ? "B" : step === 1 ? "C" : "";
  const states = base.map((s, i) => (i === 4 ? (step >= 3 ? "ANSWERED" : "") : i === 5 ? (step >= 4 ? "ANSWERED" : "") : s));
  const cur = step >= 3 ? 5 : 4;
  return <figure className="lp-preview" aria-label="Sample of the exam screen">
    <div className="lp-bar"><span className="lp-bar-t">Sample test · Section 2 of 4</span><span className="lp-clock num" role="timer" aria-label="Sample timer">{clock(left)}</span></div>
    <div className="lp-body">
      <div className="lp-tabs" aria-hidden="true"><span>Reasoning</span><span className="on">Quantitative Aptitude</span><span>English</span><span>General Awareness</span></div>
      <p className="lp-q"><span className="num">Q{cur + 1}.</span> A train 120 m long crosses a pole in 6 seconds. What is its speed?</p>
      <div className="stack" style={{ gap: 8 }}>
        {[["A", "12 m/s"], ["B", "20 m/s"], ["C", "24 m/s"], ["D", "72 m/s"]].map(([k, t]) => <div key={k} className={`opt ${sel === k ? "sel" : ""}`} aria-hidden="true"><span className="opt-k">{k}</span><span>{t}</span></div>)}
      </div>
      <div className="lp-pal" aria-hidden="true">{states.map((s, i) => <span key={i} className={`qb ${i === cur ? `cur ${sel ? "qb-ANSWERED" : ""}` : s ? `qb-${s}` : ""}`} style={{ display: "grid", placeItems: "center" }}>{i + 1}</span>)}</div>
      <ul className="lp-key" aria-label="Palette key"><li><i className="k-ans" />Answered</li><li><i className="k-rev" />Marked for review</li><li><i className="k-skip" />Not answered</li></ul>
    </div>
  </figure>;
}

type Mode = "exam" | "practice" | "smart";
const MODES: { id: Mode; label: string; icon: typeof Timer; title: string; body: string }[] = [
  { id: "exam", label: "Exam mode", icon: Timer, title: "Timed, like the real paper", body: "Set a timer for the whole test, for each section, and optionally for each question. Negative marking follows the rules set for that test. Correct answers stay hidden until you submit, and exam attempts are the ones ranked on the leaderboard." },
  { id: "practice", label: "Practice mode", icon: BookOpenCheck, title: "No timer, instant feedback", body: "The answer and its explanation appear right after each question, so you can learn as you go. Practice attempts never affect the leaderboard." },
  { id: "smart", label: "Smart practice", icon: Target, title: "Question sets from your weak spots", body: "Smart practice builds a set from the topics where your earlier attempts lost the most marks, so your next session goes where it helps most." },
];

function ModePanel({ mode }: { mode: Mode }) {
  if (mode === "exam") return <div className="lp-demo" aria-label="Sample timers">
    {[["Test", "02:59:12", 96], ["Section 2", "00:41:05", 61], ["Question 5", "01:18", 22]].map(([l, t, w]) => <div key={l} className="lp-timer-row"><span>{l}</span><b className="num">{t}</b><i className="drain" style={{ width: `${w}%` }} aria-hidden="true" /></div>)}
    <div className="lp-demo-note">Marking: +2 correct, −0.5 wrong, 0 skipped <em>(example scheme)</em></div>
  </div>;
  if (mode === "practice") return <div className="lp-demo" aria-label="Sample practice feedback">
    <div className="opt right" aria-hidden="true"><span className="opt-k">B</span><span>20 m/s</span><svg className="tick-draw" width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: "auto", color: "var(--ok)" }} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg></div>
    <p className="lp-expl"><b>Correct.</b> Speed = distance ÷ time = 120 m ÷ 6 s = 20 m/s.</p>
  </div>;
  return <div className="lp-demo" aria-label="Sample weak topics">
    {[["Time and Work", 38], ["Percentages", 52], ["Number Series", 66]].map(([t, v]) => <div key={t} className="lp-weak"><div className="row between"><span>{t}</span><b className="num">{v}%</b></div><div className="bar"><i style={{ width: `${v}%` }} /></div></div>)}
    <div className="lp-demo-note">Weakest topics first <em>(sample data)</em></div>
  </div>;
}

function Modes() {
  const [m, setM] = useState<Mode>("exam"); const cur = MODES.find((x) => x.id === m)!;
  const onKey = (e: KeyboardEvent) => {
    const i = MODES.findIndex((x) => x.id === m); let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % MODES.length; else if (e.key === "ArrowLeft") n = (i + MODES.length - 1) % MODES.length; else return;
    e.preventDefault(); setM(MODES[n].id); (document.getElementById(`mode-${MODES[n].id}`) as HTMLElement | null)?.focus();
  };
  return <section className="lp-section" aria-labelledby="modes-h">
    <h2 id="modes-h">Three ways to sit the same test</h2>
    <div className="seg" role="tablist" aria-label="Test modes" onKeyDown={onKey}>
      {MODES.map(({ id, label, icon: I }) => <button key={id} id={`mode-${id}`} role="tab" type="button" aria-selected={m === id} aria-controls="mode-panel" tabIndex={m === id ? 0 : -1} onClick={() => setM(id)}><I size={16} aria-hidden="true" />{label}</button>)}
    </div>
    <div className="lp-mode" id="mode-panel" role="tabpanel" aria-labelledby={`mode-${m}`}>
      <div><h3>{cur.title}</h3><p>{cur.body}</p></div>
      <div key={m} className="lp-mode-demo"><ModePanel mode={m} /></div>
    </div>
  </section>;
}

const REPORT = [["Reasoning", 82], ["Quantitative Aptitude", 54], ["English", 71], ["General Awareness", 63]] as const;
const AFTER = [
  ["Score, accuracy and time", "Marks, attempted versus skipped, and how long each section took."],
  ["Section, subject and topic breakdown", "See which topics cost you marks instead of guessing."],
  ["Answer review with explanations", "Go through every question, your answer and the correct one."],
  ["Smart Coach", "Ranks what to practise next from the questions you have attempted."],
];

function Report() {
  const [ref, on] = useInView<HTMLDivElement>();
  return <section className="lp-split" aria-labelledby="after-h">
    <div><h2 id="after-h">A full breakdown the moment you submit</h2>
      <p className="lp-lead">Scoring happens only after you submit, and the correct answers stay on the server until then.</p>
      <dl className="lp-defs">{AFTER.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl></div>
    <div ref={ref} className={`lp-report${on ? " in" : ""}`} role="img" aria-label="Sample result: 63 marks out of 100, with section-wise scores">
      <div className="lp-report-top"><div><span className="lp-report-l">Marks obtained</span><b className="lp-report-n num">63<small> / 100</small></b></div><span className="pill pill-ok">Passed</span></div>
      <div className="lp-report-rows">{REPORT.map(([n, v], i) => <div key={n} className="lp-report-row"><div className="row between"><span>{n}</span><b className="num">{v}</b></div><div className="bar"><i style={{ width: on ? `${v}%` : 0, transitionDelay: `${i * 90}ms` }} /></div></div>)}</div>
      <p className="lp-report-foot">Sample report. Your own results use your real attempts.</p>
    </div>
  </section>;
}

function How({ skin }: { skin?: Skin }) {
  const [ref, on] = useInView<HTMLElement>();
  return <section ref={ref} className={`lp-section lp-how${on ? " in" : ""}`} aria-labelledby="how-h"><h2 id="how-h">From sign-up to your first score</h2>
    <ol className="lp-steps">
      {[["1", "Create a free account", "Register with your email and choose your target exam. Tests for that exam are listed first."], ["2", "Take a test", "Pick timed exam mode or untimed practice. Mark questions for review and come back to them."], ["3", "Review and improve", "Read the analysis, check explanations, then practise the topics that cost you marks."]].map(([n, t, d], i) => <li key={n} style={{ ["--i" as any]: i }}><span className="n" aria-hidden="true">{n}</span><h3>{t}</h3><p>{d}</p></li>)}
    </ol><div className="rail-scene" aria-hidden="true"><div className="rail" /><div className="rail-train"><Traveler skin={skin} /></div></div></section>;
}

const FAQ = [
  ["Is ExamForge free?", "Registering is free. Pick a test and you can start in under a minute."],
  ["What happens if I leave a test unfinished?", "Your answers save as you go. Open your dashboard and choose Continue to pick up where you stopped."],
  ["Does negative marking apply?", "Each test sets its own marking scheme. In exam mode, it is applied exactly as the test defines it."],
  ["Can I see the correct answers during the exam?", "No. Correct answers stay on the server until you submit, so the test works like the real paper."],
  ["Does practice mode change my rank?", "No. Only exam-mode attempts appear on the leaderboard."],
];

export default function Landing() {
  useEffect(() => { document.title = `${SITE} | Free online mock tests with analysis`; }, []);
  const [pick, setPick] = useState<string | null>(null); const [skin, setSkin] = useState<Skin | undefined>(undefined);
  const choose = (e: string) => {
    const root = document.documentElement, next = pick === e ? null : e, k = next ? skinForExam(next) : getSkin();
    root.classList.add("theme-fade"); window.setTimeout(() => root.classList.remove("theme-fade"), 400);
    root.dataset.skin = k; setPick(next); setSkin(next ? k : undefined);
  };
  useEffect(() => () => { document.documentElement.dataset.skin = getSkin(); }, []);
  const me = getMe(); if (me) return <Navigate to={me.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
  return <PublicShell>
    <div className="lp">
      <section className="lp-hero" aria-labelledby="hero-h">
        <div>
          <h1 id="hero-h">Mock tests that feel like exam day.</h1>
          <p className="lead">Timed sections, a question palette you can trust, and a full breakdown the moment you submit. Built for {EXAMS.slice(0, 3).join(", ")} and more.</p>
          <div className="lp-actions"><Link className="btn btn-primary btn-lg" to="/login">Take a free test<ArrowRight size={18} aria-hidden="true" /></Link><Link className="btn btn-lg" to="/tips">Read exam tips</Link></div>
          <p className="lp-note">Free to register. Your answers save as you go.</p>
        </div>
        <ExamPreview />
      </section>

      <section className="lp-exams-row" aria-label="Exams you can practise for"><span>Practise for</span><ul>{EXAMS.map((e, i) => <li key={e} style={{ ["--i" as any]: i }}><button type="button" aria-pressed={pick === e} onClick={() => choose(e)}>{e}</button></li>)}</ul></section>
      {pick && <p className="lp-skin-hint" role="status">That is how ExamForge looks for {pick}. Your theme follows your exam once you sign up.</p>}

      <Modes />
      <Report />

      <How skin={skin} />

      <section className="lp-split lp-faq" aria-labelledby="faq-h">
        <div><h2 id="faq-h">Before you start</h2><p className="lp-lead">Short answers to what students ask first.</p></div>
        <div>{FAQ.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary><p>{a}</p></details>)}</div>
      </section>

      <section className="lp-section" aria-labelledby="tips-h"><div className="row between" style={{ marginBottom: 12 }}><h2 id="tips-h">Exam preparation tips</h2><Link className="btn btn-sm" to="/tips">All articles<ArrowRight size={14} aria-hidden="true" /></Link></div>
        <div className="lp-tips">{TIPS.slice(0, 3).map((t) => <Link key={t.slug} to={`/tips/${t.slug}`} className="lp-tip"><b>{t.title}</b><span className="sub">{t.summary}</span></Link>)}</div></section>

      <AdSlot />
      <section className="lp-cta" aria-label="Get started"><div><h2>Take your first mock test today</h2><p>Free to register. Pick a test and start in under a minute.</p></div><Link className="btn btn-primary btn-lg" to="/login">Create your account<ArrowRight size={18} aria-hidden="true" /></Link></section>
    </div>
  </PublicShell>;
}
