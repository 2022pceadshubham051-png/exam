import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../lib/api";
import { Loader, Target, UserRound, CalendarDays, TriangleAlert } from "lucide-react";

type Profile = { id: string; name?: string | null; displayName?: string | null; age?: number | null; targetExam?: string | null; role: "USER" | "ADMIN"; profileComplete?: boolean };
const EXAMS = [
  "Rajasthan Computer Instructor", "RPSC Programmer", "Rajasthan CET (Graduate)", "Rajasthan CET (12th)", "Rajasthan Patwari", "Rajasthan VDO",
  "RRB NTPC", "RRB Group D", "SSC CGL", "SSC CHSL", "SSC MTS", "SSC GD", "SSC JE (Computer Science)", "SSC IMD Scientific Assistant (CS & IT)", "IBPS / Banking", "Other / explore all exams",
];

export default function ProfileGate({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const [name, setName] = useState(""); const [age, setAge] = useState("18"); const [targetExam, setTargetExam] = useState("");
  const load = () => { setLoading(true); api<Profile>("/profile").then((p) => { setProfile(p); setName(p.displayName || p.name || ""); setAge(p.age ? String(p.age) : ""); setTargetExam(p.targetExam || ""); setErr(""); }).catch((e: any) => setErr(e.message || "Could not load your profile.")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try { const p = await api<Profile>("/profile", "PUT", { ...(!(profile?.displayName || profile?.name) ? { name: name.trim() } : {}), age: Number(age), targetExam }); setProfile(p); }
    catch (e: any) { setErr(e.message || "Could not save your profile."); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad row"><Loader className="animate-spin" size={20} />Personalizing your ExamForge account…</div></div>;
  if (!profile) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{ maxWidth: 480 }}><div className="alert alert-bad"><TriangleAlert size={18}/>{err || "Unable to load your account."}</div><button className="btn btn-primary" onClick={load}>Try again</button></div></div>;
  if (profile.profileComplete || profile.role === "ADMIN") return <>{children}</>;
  const asksName = !(profile.displayName || profile.name)?.trim();
  return <div className="profile-gate"><div className="profile-gate-backdrop"/><form className="card card-pad stack profile-gate-card" onSubmit={submit}>
    <div className="row" style={{ gap: 12 }}><div className="profile-gate-icon"><Target size={24}/></div><div><span className="pill pill-brand">One-time setup</span><h1 style={{ fontSize: "1.65rem", fontWeight: 850, marginTop: 7 }}>Make ExamForge yours</h1></div></div>
    <p className="sub">Tell us a little about your goal. We’ll use it to recommend relevant mock tests and Lecture Pace study tracks. You won’t be asked for details already saved to your account.</p>
    {asksName && <div><label className="label"><UserRound size={14} style={{ display: "inline", marginRight: 6 }}/>Full name</label><input className="input" required minLength={1} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name"/></div>}
    {!profile.age && <div><label className="label"><CalendarDays size={14} style={{ display: "inline", marginRight: 6 }}/>Age</label><input className="input" type="number" required min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Your age"/></div>}
    {!profile.targetExam && <div><label className="label"><Target size={14} style={{ display: "inline", marginRight: 6 }}/>Target exam</label><select className="input" required value={targetExam} onChange={(e) => setTargetExam(e.target.value)}><option value="">Select your target exam</option>{EXAMS.map((exam) => <option key={exam} value={exam}>{exam}</option>)}</select></div>}
    {err && <div className="alert alert-bad"><TriangleAlert size={16}/>{err}</div>}
    <button className="btn btn-primary btn-lg btn-block" disabled={saving}>{saving ? <><Loader size={17} className="animate-spin"/>Saving profile…</> : "Save & personalize my dashboard"}</button>
    <p className="hint">This setup is saved to your account database and drives your study recommendations.</p>
  </form></div>;
}
