import { useState, type FormEvent } from "react"; import { useNavigate, Link } from "react-router-dom";
import { Timer, BarChart3, ShieldCheck, Eye, EyeOff, Sun, Moon, ArrowRight, Loader, TriangleAlert } from "lucide-react";
import { api } from "../lib/api"; import { Logo } from "../components/Shell"; import { toggleTheme, isDark, getMe } from "../lib/auth"; import Mascot from "../components/Mascot";

const features = [
  [Timer, "Real exam timers", "Section-wise and question-wise timers, just like the actual paper."],
  [BarChart3, "Deep analytics", "Accuracy, weak topics and attempt-to-attempt improvement."],
  [ShieldCheck, "Fair and secure", "Answers stay on the server. Scoring happens after you submit."],
] as const;

export default function Login() {
  const [f, setF] = useState({ email: "", password: "", name: "" }); const [reg, setReg] = useState(false); const [err, setErr] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [, force] = useState(0); const nav = useNavigate();
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await api(reg ? "/auth/register" : "/auth/login", "POST", reg ? f : { identifier: f.email, password: f.password });
      localStorage.setItem("token", r.token); const t = new URLSearchParams(location.search).get("test");
      nav(t ? `/exam/${t}` : r.user.role === "ADMIN" ? "/admin" : "/dashboard", { replace: true });
    } catch (e: any) { setErr(e.message || "Something went wrong"); } finally { setBusy(false); }
  };
  const me = getMe();
  return <div className="auth">
    <section className="auth-hero">
      <div className="blob" style={{ width: 300, height: 300, background: "#22d3ee", top: -80, right: -60 }} />
      <div className="blob" style={{ width: 260, height: 260, background: "#f472b6", bottom: -60, left: 40, animationDelay: "-4s" }} />
      <div className="brand" style={{ color: "#fff" }}><Logo />ExamForge</div>
      <div className="login-mascot"><Mascot mood="wave" size={110} /><div className="tu-bubble">Hi! I'm Forgy. Log in and let's level up!</div></div>
      <div className="stack" style={{ gap: 28 }}>
        <div><h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, lineHeight: 1.1 }}>Practice like it is<br />the real exam.</h1>
          <p style={{ opacity: .85, marginTop: 14, maxWidth: 440, lineHeight: 1.6 }}>Full-length mock tests with section timers, instant results and a clear picture of what to improve next.</p></div>
        <div className="mock">
          <div className="row between" style={{ fontSize: ".78rem", opacity: .9 }}><span>Reasoning | Question 7 of 30</span><span style={{ fontWeight: 700 }}>18:42</span></div>
          <div className="bar" style={{ background: "rgb(255 255 255 / .2)", margin: "10px 0 14px" }}><i style={{ width: "23%", background: "#fff" }} /></div>
          <div style={{ fontWeight: 600, fontSize: ".95rem" }}>If CODE is written as DPEF, how is TEST written?</div>
          {["UFTU", "SDRS", "UFSU", "TFTU"].map((o, i) => <div key={o} className={"opt-fake" + (i === 0 ? " sel" : "")}><b>{"ABCD"[i]}</b>{o}</div>)}
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>{features.map(([I, t, d]) => <li key={t} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgb(255 255 255 / .16)", display: "grid", placeItems: "center", flex: "none" }}><I size={18} /></span>
          <span><b>{t}</b><br /><span style={{ opacity: .78, fontSize: ".86rem" }}>{d}</span></span></li>)}</ul>
      </div>
      <div style={{ opacity: .6, fontSize: ".78rem" }}>ExamForge Mock Test Platform</div>
    </section>

    <section className="auth-form">
      <form className="card card-pad stack fade-in" style={{ width: "100%", maxWidth: 420, gap: 16 }} onSubmit={submit}>
        <div className="row between"><div className="brand lg:hidden"><Logo />ExamForge</div><button type="button" className="btn icon-btn ml-auto" onClick={() => { toggleTheme(); force((n) => n + 1); }}>{isDark() ? <Sun size={17} /> : <Moon size={17} />}</button></div>
        <div><h2 style={{ fontSize: "1.55rem", fontWeight: 800 }}>{reg ? "Create your account" : "Welcome back"}</h2>
          <p className="sub" style={{ marginTop: 4 }}>{reg ? "Register to start taking mock tests." : "Log in to continue your preparation."}</p></div>
        <div className="seg" style={{ width: "100%" }}><button type="button" className={!reg ? "on" : ""} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setReg(false); setErr(""); }}>Login</button>
          <button type="button" className={reg ? "on" : ""} style={{ flex: 1, justifyContent: "center" }} onClick={() => { setReg(true); setErr(""); }}>Register</button></div>
        {me && <div className="alert alert-info">You are already logged in. <a href={me.role === "ADMIN" ? "/admin" : "/dashboard"}>Continue</a></div>}
        {reg && <div><label className="label">Full name</label><input className="input" required value={f.name} onChange={set("name")} placeholder="Your name" autoComplete="name" /></div>}
        <div><label className="label">{reg ? "Email" : "Email or admin username"}</label><input className="input" required value={f.email} onChange={set("email")} placeholder={reg ? "you@example.com" : "you@example.com or admin"} autoComplete="username" /></div>
        <div><label className="label">Password <small>(at least 8 characters)</small></label>
          <div className="pw"><input className="input" required minLength={reg ? 8 : 1} type={show ? "text" : "password"} value={f.password} onChange={set("password")} placeholder="Enter password" autoComplete={reg ? "new-password" : "current-password"} />
            <button type="button" className="btn icon-btn" onClick={() => setShow(!show)} aria-label="Show password">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        {err && <div className="alert alert-bad"><TriangleAlert size={17} />{err}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <Loader size={18} className="animate-spin" /> : <>{reg ? "Create account" : "Login"}<ArrowRight size={18} /></>}</button>
      </form>
      <div className="row" style={{ justifyContent: "center", gap: 16, marginTop: 14, fontSize: ".85rem" }}><Link to="/">Home</Link><Link to="/privacy">Privacy policy</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></div>
    </section>
  </div>;
}
