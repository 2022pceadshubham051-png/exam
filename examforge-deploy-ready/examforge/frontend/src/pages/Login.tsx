import { PaperPlane } from "../components/Journey"; import { useEffect, useRef, useState, type FormEvent } from "react"; import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Sun, Moon, ArrowRight, Loader, TriangleAlert, MailCheck } from "lucide-react";
import { api } from "../lib/api"; import { loadProfile } from "../lib/profile"; import { BrandLockup } from "../components/LogoMark"; import { Field } from "../components/ui";
import { toggleTheme, isDark, getMe } from "../lib/auth"; import { savedRef, clearRef } from "../lib/engage";

const points = [["Real exam feel", "Timed tests with section timers, like the actual paper."], ["Know your weak spots", "Topic-wise accuracy after every attempt."], ["Fair scoring", "Correct answers stay on the server until you submit."]];

/** "Continue with Google" button (Google Identity Services). Only shown when the server has GOOGLE_CLIENT_ID. */
function GoogleButton({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const box = useRef<HTMLDivElement>(null); const cb = useRef(onCredential); cb.current = onCredential;
  useEffect(() => {
    let dead = false;
    const init = () => { const g = (window as any).google?.accounts?.id; if (dead || !g || !box.current) return; g.initialize({ client_id: clientId, callback: (r: any) => r?.credential && cb.current(r.credential) }); g.renderButton(box.current, { theme: "outline", size: "large", text: "continue_with", width: Math.min(360, box.current.offsetWidth || 320) }); };
    if ((window as any).google?.accounts?.id) init();
    else { let s = document.getElementById("gsi") as HTMLScriptElement | null; if (!s) { s = document.createElement("script"); s.id = "gsi"; s.src = "https://accounts.google.com/gsi/client"; s.async = true; document.head.appendChild(s); } s.addEventListener("load", init); }
    return () => { dead = true; };
  }, [clientId]);
  return <div ref={box} style={{ minHeight: 44, display: "flex", justifyContent: "center" }} aria-label="Continue with Google" />;
}

export default function Login() {
  const [qs] = useSearchParams(); const [f, setF] = useState({ email: "", password: "", name: "" }); const [reg, setReg] = useState(() => (!!savedRef() || qs.get("reg") === "1") && !getMe()); const [err, setErr] = useState("");
  const [cfg, setCfg] = useState<{ google: string | null; mail: boolean } | null>(null); const [wait, setWait] = useState<{ email: string; resent?: boolean } | null>(null); const [unverified, setUnverified] = useState<string | null>(null);
  useEffect(() => { api("/auth/config").then(setCfg).catch(() => setCfg({ google: null, mail: false })); }, []);
  const [sent, setSent] = useState(false); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [, force] = useState(0); const nav = useNavigate();
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  /** Stores the session and goes where the student was headed (onboarding, a test, a saved page or the home screen). */
  const enter = async (r: any) => {
    localStorage.setItem("token", r.token); const calm = document.documentElement.classList.contains("reduce-motion") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; if (!calm) { setSent(true); await new Promise((ok) => setTimeout(ok, 750)); } const t = new URLSearchParams(location.search).get("test");
    if (r.user.role !== "ADMIN") { const p = await loadProfile(true).catch(() => null); if (p && !p.onboarded) { nav(`/welcome${t ? `?test=${t}` : ""}`, { replace: true }); return; } }
    let after: string | null = null; try { after = sessionStorage.getItem("ef_after_login"); sessionStorage.removeItem("ef_after_login"); } catch { /* ignore */ }
    nav(t ? `/exam/${t}` : after && r.user.role !== "ADMIN" ? after : r.user.role === "ADMIN" ? "/admin" : "/home", { replace: true });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setErr(""); setUnverified(null); setBusy(true);
    try {
      const r = await api(reg ? "/auth/register" : "/auth/login", "POST", reg ? { ...f, ref: savedRef() } : { identifier: f.email, password: f.password }); if (reg) clearRef();
      if (r.verify) { setWait({ email: r.email }); return; } // email sign-up: the student must open the link we mailed
      await enter(r);
    } catch (e: any) { setSent(false); if (e.code === "EMAIL_NOT_VERIFIED") setUnverified(e.data?.email ?? f.email); setErr(e.message || "Something went wrong"); } finally { setBusy(false); }
  };
  const google = async (credential: string) => { setErr(""); setBusy(true); try { await enter(await api("/auth/google", "POST", { credential, ref: savedRef() })); clearRef(); } catch (e: any) { setSent(false); setErr(e.message || "Google sign-in failed"); } finally { setBusy(false); } };
  const resend = async (email: string) => { try { await api("/auth/resend-verification", "POST", { email }); setWait({ email, resent: true }); setUnverified(null); setErr(""); } catch (e: any) { setErr(e.message); } };
  const me = getMe();
  return <div className="auth">
    <section className="auth-hero on-dark" aria-label="About ExamForge">
      <Link to="/" aria-label="ExamForge home" className="brand"><BrandLockup size={40} tagline onDark /></Link>
      <div><p className="auth-title">Practice like it is the real exam.</p><p className="lead">Mock tests with instant results and clear guidance on what to improve.</p></div>
      <ul className="auth-points">{points.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
      <div className="auth-foot">ExamForge Mock Test Platform</div>
    </section>
    <section className="auth-form">
      {wait ? <div className="card card-pad stack fade-in" style={{ gap: 14 }} role="status"><MailCheck size={34} aria-hidden="true" style={{ color: "var(--brand)" }} /><h1 style={{ fontSize: "1.5rem" }}>Check your email</h1>
        <p>We sent a verification link to <b>{wait.email}</b>. Open it to finish creating your account. The link works for 24 hours.</p>{wait.resent && <div className="alert alert-ok">A new link is on its way.</div>}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button type="button" className="btn" onClick={() => resend(wait.email)}>Send the link again</button><button type="button" className="btn btn-ghost" onClick={() => { setWait(null); setReg(false); }}>Back to login</button></div><p className="sub">Not there? Look in Spam or Promotions.</p></div> :
      <form className="card card-pad stack fade-in" style={{ gap: 16, position: "relative", overflow: "hidden" }} onSubmit={submit} noValidate={false}>{sent && <PaperPlane />}
        <div className="row between"><span className="eyebrow">{reg ? "Create account" : "Welcome back"}</span>
          <button type="button" className="btn icon-btn btn-ghost" aria-label={isDark() ? "Switch to light mode" : "Switch to dark mode"} onClick={() => { toggleTheme(); force((n) => n + 1); }}>{isDark() ? <Sun size={17} /> : <Moon size={17} />}</button></div>
        <div><h1 style={{ fontSize: "1.6rem" }}>{reg ? "Create your account" : "Log in"}</h1>
          <p className="sub" style={{ marginTop: 4 }}>{reg ? "It takes less than a minute." : "Log in to continue practising."}</p></div>
        <div className="seg" role="group" aria-label="Log in or register" style={{ width: "100%" }}><button type="button" aria-pressed={!reg} className={!reg ? "on" : ""} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setReg(false); setErr(""); }}>Log in</button>
          <button type="button" aria-pressed={reg} className={reg ? "on" : ""} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setReg(true); setErr(""); }}>Register</button></div>
        {qs.get("kicked") === "1" && !me && <div className="alert alert-warn" role="alert"><TriangleAlert size={17} />You were signed out because your account was opened on another device. An account works on 2 devices at a time.</div>}
        {me && <div className="alert alert-info">You are already logged in. <a href={me.role === "ADMIN" ? "/admin" : "/dashboard"}>Continue</a></div>}
        {reg && <Field label="Full name"><input className="input" required value={f.name} onChange={set("name")} placeholder="Your name" autoComplete="name" /></Field>}
        <Field label={reg ? "Email" : "Email or username"}><input className="input" required value={f.email} onChange={set("email")} placeholder="you@example.com" autoComplete="username" /></Field>
        <Field label={<>Password{reg && <small> (at least 8 characters)</small>}</>}>
          <div className="pw"><input aria-label="Password" className="input" required minLength={reg ? 8 : 1} type={show ? "text" : "password"} value={f.password} onChange={set("password")} placeholder="Enter password" autoComplete={reg ? "new-password" : "current-password"} />
            <button type="button" className="btn icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
        {!reg && <div className="row" style={{ justifyContent: "flex-end", marginTop: -8 }}><Link to="/forgot-password" style={{ fontSize: ".85rem" }}>Forgot password?</Link></div>}
        {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} /><span style={{ flex: 1 }}>{err}{unverified && <> <button type="button" className="linkbtn" onClick={() => resend(unverified)}>Send the link again</button></>}</span></div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <><Loader size={18} className="animate-spin" />Please wait</> : <>{reg ? "Create account" : "Log in"}<ArrowRight size={18} /></>}</button>
        {cfg?.google && <><div className="or-line" aria-hidden="true"><span>or</span></div><GoogleButton clientId={cfg.google} onCredential={google} /></>}
        <nav className="row" style={{ justifyContent: "center", gap: 16, fontSize: ".85rem" }} aria-label="Site links"><Link to="/">Home</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms</Link><Link to="/refund">Refunds</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      </form>}
    </section>
  </div>;
}
