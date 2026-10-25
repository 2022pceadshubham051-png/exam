import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"; import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader, MailCheck, TriangleAlert, CircleCheck, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api"; import { BrandLockup } from "../components/LogoMark"; import { Field } from "../components/ui";

const Frame = ({ children }: { children: ReactNode }) => <div className="auth auth-solo"><section className="auth-form"><div className="card card-pad stack fade-in" style={{ gap: 16, maxWidth: 440, margin: "0 auto" }}>
  <Link to="/" aria-label="ExamForge home" className="brand"><BrandLockup size={34} /></Link>{children}</div></section></div>;
const landing = (r: any) => { localStorage.setItem("token", r.token); const after = (() => { try { const a = sessionStorage.getItem("ef_after_login"); sessionStorage.removeItem("ef_after_login"); return a; } catch { return null; } })(); return r.user.role === "ADMIN" ? "/admin" : after ?? "/home"; };

/** The link in the verification email lands here: confirms the address and signs the student in. */
export function VerifyEmail() {
  const [qs] = useSearchParams(); const nav = useNavigate(); const [state, setState] = useState<"work" | "ok" | "bad">("work"); const [msg, setMsg] = useState(""); const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true; // the token works once: StrictMode must not use it twice
    api("/auth/verify-email", "POST", { token: qs.get("token") ?? "" }).then((r) => { setState("ok"); const to = landing(r); setTimeout(() => nav(to, { replace: true }), 1200); }).catch((e) => { setMsg(e.message); setState("bad"); });
  }, []); // eslint-disable-line
  return <Frame>{state === "work" ? <div className="row" style={{ gap: 10 }} role="status"><Loader size={18} className="animate-spin" />Verifying your email…</div>
    : state === "ok" ? <div className="alert alert-ok" role="status"><CircleCheck size={18} />Email verified. Taking you in…</div>
    : <><div className="alert alert-bad" role="alert"><TriangleAlert size={18} />{msg}</div><Link className="btn btn-primary" to="/login">Back to login</Link></>}</Frame>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState<{ mail: boolean } | null>(null); const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setErr(""); try { setDone(await api("/auth/forgot-password", "POST", { email })); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } };
  return <Frame><div><h1 style={{ fontSize: "1.5rem" }}>Forgot your password?</h1><p className="sub" style={{ marginTop: 4 }}>Enter your email and we will send you a link to choose a new one.</p></div>
    {done ? <div className="alert alert-ok" role="status"><MailCheck size={18} /><span>{done.mail ? "If an account exists for this email, a reset link is on its way. It works for 1 hour." : "Email sending is not set up on this server yet. Ask the admin to reset your password."}</span></div>
      : <form className="stack" style={{ gap: 14 }} onSubmit={submit}><Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
        {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} />{err}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <><Loader size={18} className="animate-spin" />Please wait</> : "Send reset link"}</button></form>}
    <Link className="sub" to="/login">Back to login</Link></Frame>;
}

export function ResetPassword() {
  const [qs] = useSearchParams(); const nav = useNavigate(); const token = qs.get("token") ?? ""; const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => { e.preventDefault(); if (pw.length < 8) return setErr("Use at least 8 characters."); if (pw !== pw2) return setErr("The two passwords do not match."); setBusy(true); setErr("");
    try { const r = await api("/auth/reset-password", "POST", { token, password: pw }); nav(landing(r), { replace: true }); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } };
  if (!token) return <Frame><div className="alert alert-bad" role="alert"><TriangleAlert size={18} />This reset link is not complete. Open it again from your email.</div><Link className="btn" to="/forgot-password">Ask for a new link</Link></Frame>;
  return <Frame><div><h1 style={{ fontSize: "1.5rem" }}>Choose a new password</h1><p className="sub" style={{ marginTop: 4 }}>You will be logged in right after.</p></div>
    <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
      <Field label={<>New password<small> (at least 8 characters)</small></>}><div className="pw"><input aria-label="New password" className="input" required minLength={8} type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <button type="button" className="btn icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
      <Field label="Repeat password"><input className="input" required type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></Field>
      {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} />{err} {/expired|invalid/.test(err) && <Link to="/forgot-password">Get a new link</Link>}</div>}
      <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <><Loader size={18} className="animate-spin" />Please wait</> : "Save password"}</button></form></Frame>;
}
