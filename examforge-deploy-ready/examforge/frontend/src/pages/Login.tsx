import { PaperPlane } from "../components/Journey"; import { useState, type FormEvent } from "react"; import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Sun, Moon, ArrowRight, Loader, TriangleAlert } from "lucide-react";
import { api } from "../lib/api"; import { loadProfile } from "../lib/profile"; import { BrandLockup } from "../components/LogoMark"; import { Field } from "../components/ui";
import { toggleTheme, isDark, getMe } from "../lib/auth";

const points = [["Real exam feel", "Timed tests with section timers, like the actual paper."], ["Know your weak spots", "Topic-wise accuracy after every attempt."], ["Fair scoring", "Correct answers stay on the server until you submit."]];

export default function Login() {
  const [f, setF] = useState({ email: "", password: "", name: "" }); const [reg, setReg] = useState(false); const [err, setErr] = useState("");
  const [sent, setSent] = useState(false); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [, force] = useState(0); const nav = useNavigate();
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setErr(""); setBusy(true);
    try {
      const r = await api(reg ? "/auth/register" : "/auth/login", "POST", reg ? f : { identifier: f.email, password: f.password });
      localStorage.setItem("token", r.token); const calm = document.documentElement.classList.contains("reduce-motion") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; if (!calm) { setSent(true); await new Promise((ok) => setTimeout(ok, 750)); } const t = new URLSearchParams(location.search).get("test");
      if (r.user.role !== "ADMIN") { const p = await loadProfile(true).catch(() => null); if (p && !p.onboarded) { nav(`/welcome${t ? `?test=${t}` : ""}`, { replace: true }); return; } }
      let after: string | null = null; try { after = sessionStorage.getItem("ef_after_login"); sessionStorage.removeItem("ef_after_login"); } catch { /* ignore */ }
      nav(t ? `/exam/${t}` : after && r.user.role !== "ADMIN" ? after : r.user.role === "ADMIN" ? "/admin" : "/home", { replace: true });
    } catch (e: any) { setSent(false); setErr(e.message || "Something went wrong"); } finally { setBusy(false); }
  };
  const me = getMe();
  return <div className="auth">
    <section className="auth-hero on-dark" aria-label="About ExamForge">
      <Link to="/" aria-label="ExamForge home" className="brand"><BrandLockup size={40} tagline onDark /></Link>
      <div><p className="auth-title">Practice like it is the real exam.</p><p className="lead">Mock tests with instant results and clear guidance on what to improve.</p></div>
      <ul className="auth-points">{points.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
      <div className="auth-foot">ExamForge Mock Test Platform</div>
    </section>
    <section className="auth-form">
      <form className="card card-pad stack fade-in" style={{ gap: 16, position: "relative", overflow: "hidden" }} onSubmit={submit} noValidate={false}>{sent && <PaperPlane />}
        <div className="row between"><span className="eyebrow">{reg ? "Create account" : "Welcome back"}</span>
          <button type="button" className="btn icon-btn btn-ghost" aria-label={isDark() ? "Switch to light mode" : "Switch to dark mode"} onClick={() => { toggleTheme(); force((n) => n + 1); }}>{isDark() ? <Sun size={17} /> : <Moon size={17} />}</button></div>
        <div><h1 style={{ fontSize: "1.6rem" }}>{reg ? "Create your account" : "Log in"}</h1>
          <p className="sub" style={{ marginTop: 4 }}>{reg ? "It takes less than a minute." : "Log in to continue practising."}</p></div>
        <div className="seg" role="group" aria-label="Log in or register" style={{ width: "100%" }}><button type="button" aria-pressed={!reg} className={!reg ? "on" : ""} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setReg(false); setErr(""); }}>Log in</button>
          <button type="button" aria-pressed={reg} className={reg ? "on" : ""} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setReg(true); setErr(""); }}>Register</button></div>
        {me && <div className="alert alert-info">You are already logged in. <a href={me.role === "ADMIN" ? "/admin" : "/dashboard"}>Continue</a></div>}
        {reg && <Field label="Full name"><input className="input" required value={f.name} onChange={set("name")} placeholder="Your name" autoComplete="name" /></Field>}
        <Field label={reg ? "Email" : "Email or username"}><input className="input" required value={f.email} onChange={set("email")} placeholder="you@example.com" autoComplete="username" /></Field>
        <Field label={<>Password{reg && <small> (at least 8 characters)</small>}</>}>
          <div className="pw"><input aria-label="Password" className="input" required minLength={reg ? 8 : 1} type={show ? "text" : "password"} value={f.password} onChange={set("password")} placeholder="Enter password" autoComplete={reg ? "new-password" : "current-password"} />
            <button type="button" className="btn icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
        {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} />{err}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <><Loader size={18} className="animate-spin" />Please wait</> : <>{reg ? "Create account" : "Log in"}<ArrowRight size={18} /></>}</button>
        <nav className="row" style={{ justifyContent: "center", gap: 16, fontSize: ".85rem" }} aria-label="Site links"><Link to="/">Home</Link><Link to="/privacy">Privacy policy</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      </form>
    </section>
  </div>;
}
