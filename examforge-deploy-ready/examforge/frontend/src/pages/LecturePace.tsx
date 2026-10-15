import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Trophy, Coins, Target, ArrowRight } from "lucide-react";
import Shell, { Loading } from "../components/Shell";
import { api } from "../lib/api";
import { toggleTheme } from "../lib/auth";

type Profile = { name: string; displayName?: string | null; age?: number | null; targetExam?: string | null; coins?: number; inventory?: Record<string, number> };
export default function LecturePace() {
  const [profile, setProfile] = useState<Profile | null>(null); const [error, setError] = useState(""); const frame = useRef<HTMLIFrameElement>(null);
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
    const onSoundChange = () => {
      frame.current?.contentWindow?.postMessage({ type: "EXAMFORGE_SOUND_CHANGED" }, window.location.origin);
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("examforge:theme", onThemeChange);
    window.addEventListener("examforge:sound", onSoundChange);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("examforge:theme", onThemeChange);
      window.removeEventListener("examforge:sound", onSoundChange);
    };
  }, [profile]);
  return <Shell><div className="stack" style={{ gap: 24 }}>
    <section className="hero lp-hero"><div className="blob" style={{ width: 240, height: 240, background: "#f0abfc", right: -40, top: -80 }}/><div className="row between" style={{ position: "relative", alignItems: "flex-start" }}><div><span className="pill" style={{ color: "white", borderColor: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.12)" }}><BookOpen size={14}/> ExamForge learning planner</span><h1 style={{ marginTop: 12 }}>Lecture Pace</h1><p>Turn long playlists into a realistic daily plan. Track lectures, revise at the right time, focus with a timer and see your consistency improve.</p><div className="row" style={{ marginTop: 16 }}><span className="lp-chip"><Target size={15}/>{profile?.targetExam || "Your target exam"}</span><Link to="/leaderboard?tab=study" className="btn" style={{ background: "white", color: "#4338ca", borderColor: "transparent" }}><Trophy size={16}/>Study leaderboard</Link><Link to="/coins" className="btn" style={{ background: "rgba(255,255,255,.15)", color: "white", borderColor: "rgba(255,255,255,.25)" }}><Coins size={16}/>Coin shop</Link></div></div></div></section>
    {error && <div className="alert alert-bad">{error}</div>}
    <div className="row between"><div><h2 className="card-title" style={{ fontSize: "1.3rem" }}>Your study workspace</h2><p className="sub">Build your lecture plan, track progress, and revise from one place.</p></div><span className="pill pill-ok">Account sync</span></div>
    <section className="lp-frame-wrap"><div className="lp-frame-head"><div><b>Lecture Pace planner</b><span>Plan · Calendar · Focus · Revise · Insights</span></div></div><iframe ref={frame} onLoad={bootstrap} className="lp-frame" src="/lecture-pace.html" title="Lecture Pace study planner" loading="eager"/></section>
    <div className="row" style={{ justifyContent: "flex-end" }}><Link to="/dashboard" className="btn">Back to mock tests <ArrowRight size={16}/></Link></div>
  </div></Shell>;
}
