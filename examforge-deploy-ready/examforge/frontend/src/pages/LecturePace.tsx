import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Trophy, Coins, Target, ClipboardCheck, ArrowRight, Loader2, CircleHelp } from "lucide-react";
import Shell, { Loading } from "../components/Shell";
import { api } from "../lib/api";
import { toggleTheme } from "../lib/auth";

type Profile = { name: string; displayName?: string | null; age?: number | null; targetExam?: string | null; coins?: number; inventory?: Record<string, number> };
type Track = { title: string; topics: string[]; detail: string };
function tracksFor(exam = "") : Track[] {
  const e = exam.toLowerCase();
  if (e.includes("computer instructor") || e.includes("programmer") || e.includes("computer science") || e.includes("rpsc programmer") || e.includes("scientific assistant")) return [
    { title: "Programming & Data Structures", topics: ["C/C++ fundamentals", "Arrays & linked lists", "Stacks, queues & trees"], detail: "Build technical fundamentals before timed questions." },
    { title: "DBMS & SQL", topics: ["ER model", "Normalization", "SQL queries & transactions"], detail: "Prioritize relational design, queries and transaction concepts." },
    { title: "Operating Systems & Networks", topics: ["Processes & scheduling", "Memory management", "OSI/TCP-IP"], detail: "Mix concept lectures with short revision sessions." },
    { title: "Software Engineering & Digital Logic", topics: ["SDLC & testing", "Boolean algebra", "Logic circuits"], detail: "Use spaced revision for definitions and diagrams." },
    { title: "Rajasthan GK + Reasoning", topics: ["Rajasthan history & culture", "Logical reasoning", "Quantitative aptitude"], detail: "Keep a daily non-technical block alongside computer science." },
  ];
  if (e.includes("ntpc") || e.includes("group d") || e.includes("railway")) return [
    { title: "Mathematics", topics: ["Percentage & ratio", "Time, speed & distance", "Arithmetic revision"], detail: "Plan short, repeated practice blocks for calculation speed." },
    { title: "General Intelligence & Reasoning", topics: ["Analogy & series", "Coding-decoding", "Puzzles & relations"], detail: "Complete topic lectures, then revise errors within 24 hours." },
    { title: "General Awareness", topics: ["Current affairs", "Static GK", "Important institutions"], detail: "Schedule regular recall sessions rather than one long cram." },
    { title: "General Science", topics: ["Physics basics", "Chemistry fundamentals", "Biology essentials"], detail: "Split the subject into small chapters and maintain revision flags." },
  ];
  if (e.includes("patwari") || e.includes("vdo") || e.includes("cet") || e.includes("rajasthan")) return [
    { title: "Rajasthan GK", topics: ["History & culture", "Geography", "Polity & administration"], detail: "Make state-specific facts a recurring revision block." },
    { title: "Reasoning & Mathematics", topics: ["Number series", "Percentages", "Analytical reasoning"], detail: "Alternate concept lectures with timed practice." },
    { title: "Hindi & General Science", topics: ["Grammar", "Everyday science", "Core definitions"], detail: "Use short daily sessions to keep recall fresh." },
    { title: "Current Affairs", topics: ["Recent events", "State schemes", "Important appointments"], detail: "Create a weekly review target and update it regularly." },
  ];
  if (e.includes("ssc je")) return [
    { title: "Computer Science Core", topics: ["Data structures", "DBMS", "Operating systems"], detail: "Build a chapter-by-chapter technical lecture plan." },
    { title: "Networks & Software Engineering", topics: ["Network protocols", "SDLC & testing", "Security fundamentals"], detail: "Pair new lectures with revision flags and mock tests." },
    { title: "Reasoning & General Awareness", topics: ["Reasoning practice", "Current affairs", "General awareness"], detail: "Reserve a small daily slot so technical prep doesn’t crowd it out." },
  ];
  if (e.includes("ssc") || e.includes("cgl") || e.includes("chsl") || e.includes("bank") || e.includes("ibps")) return [
    { title: "Quantitative Aptitude", topics: ["Percentages & ratios", "Algebra", "Data interpretation"], detail: "Use a topic plan with a clear daily lecture quota." },
    { title: "Reasoning", topics: ["Series & analogy", "Puzzles", "Syllogism"], detail: "Mark slow questions for revision and repeat them later." },
    { title: "English & General Awareness", topics: ["Grammar & vocabulary", "Static GK", "Current affairs"], detail: "Short recurring sessions are easier to sustain than cramming." },
  ];
  return [
    { title: "Core subject lectures", topics: ["Create a course", "Import playlist titles", "Track each lecture"], detail: "Add your lecture playlist and Lecture Pace will distribute it across your available days." },
    { title: "Practice & revision", topics: ["Mark weak topics", "Schedule review", "Track mock results"], detail: "Use revision flags and the calendar to keep topics active until exam day." },
  ];
}

export default function LecturePace() {
  const [profile, setProfile] = useState<Profile | null>(null); const [error, setError] = useState(""); const frame = useRef<HTMLIFrameElement>(null);
  const tracks = useMemo(() => tracksFor(profile?.targetExam || ""), [profile?.targetExam]);
  useEffect(() => { api<Profile>("/profile").then(setProfile).catch((e: any) => setError(e.message || "Could not load your study profile.")); }, []);
  const bootstrap = () => {
    if (!profile || !frame.current?.contentWindow) return;
    frame.current.contentWindow.postMessage({ type: "EXAMFORGE_BOOTSTRAP", apiBase: (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""), profile, style: localStorage.getItem("ef_style") || "toon", theme: localStorage.getItem("theme") || (document.documentElement.classList.contains("dark") ? "dark" : "light") }, window.location.origin);
  };
  useEffect(() => { if (profile) bootstrap(); }, [profile]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "EXAMFORGE_TOGGLE_THEME") return;
      toggleTheme();
      window.dispatchEvent(new Event("examforge:theme"));
      bootstrap();
    };
    const onThemeChange = () => bootstrap();
    window.addEventListener("message", onMessage);
    window.addEventListener("examforge:theme", onThemeChange);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("examforge:theme", onThemeChange);
    };
  }, [profile]);
  return <Shell><div className="stack" style={{ gap: 24 }}>
    <section className="hero lp-hero"><div className="blob" style={{ width: 240, height: 240, background: "#f0abfc", right: -40, top: -80 }}/><div className="row between" style={{ position: "relative", alignItems: "flex-start" }}><div><span className="pill" style={{ color: "white", borderColor: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.12)" }}><BookOpen size={14}/> ExamForge learning planner</span><h1 style={{ marginTop: 12 }}>Lecture Pace</h1><p>Turn long playlists into a realistic daily plan. Track lectures, revise at the right time, focus with a timer and see your consistency improve.</p><div className="row" style={{ marginTop: 16 }}><span className="lp-chip"><Target size={15}/>{profile?.targetExam || "Your target exam"}</span><Link to="/leaderboard?tab=study" className="btn" style={{ background: "white", color: "#4338ca", borderColor: "transparent" }}><Trophy size={16}/>Study leaderboard</Link><Link to="/coins" className="btn" style={{ background: "rgba(255,255,255,.15)", color: "white", borderColor: "rgba(255,255,255,.25)" }}><Coins size={16}/>Coin shop</Link></div></div></div></section>
    {error && <div className="alert alert-bad">{error}</div>}
    <section className="card card-pad stack lp-tracks"><div className="row between"><div><h2 className="card-title row"><Target size={18}/>Recommended study tracks</h2><p className="sub">Suggested from your selected target exam. Add your real playlist titles in the planner below.</p></div><span className="pill pill-brand">Personalized</span></div>
      <div className="grid-auto">{tracks.map((t) => <article className="lp-track card" key={t.title}><div className="lp-track-icon"><ClipboardCheck size={19}/></div><h3>{t.title}</h3><p className="sub">{t.detail}</p><div className="lp-topics">{t.topics.map((x) => <span key={x}>{x}</span>)}</div></article>)}</div>
    </section>
    <div className="row between"><div><h2 className="card-title" style={{ fontSize: "1.3rem" }}>Your study workspace</h2><p className="sub">Changes automatically sync to your ExamForge account database.</p></div><span className="pill pill-ok">Cloud sync enabled</span></div>
    <section className="lp-frame-wrap"><div className="lp-frame-head"><div><b>Lecture Pace planner</b><span>Plan · Calendar · Focus · Revise · Insights</span></div><CircleHelp size={19}/></div><iframe ref={frame} onLoad={bootstrap} className="lp-frame" src="/lecture-pace.html" title="Lecture Pace study planner" loading="eager"/></section>
    <div className="row" style={{ justifyContent: "flex-end" }}><Link to="/dashboard" className="btn">Back to mock tests <ArrowRight size={16}/></Link></div>
  </div></Shell>;
}
