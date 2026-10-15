import { useEffect, useState, type FormEvent } from "react";
import {
  UserRound, Save, Palette, Volume2, VolumeX,
  Sun, Moon, Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, LoaderCircle,
} from "lucide-react";
import Shell, { Loading } from "../components/Shell";
import { api } from "../lib/api";
import { getStyle, setStyle, isDark, type Style, STYLE_NAMES } from "../lib/auth";
import { soundOn, toggleSound, sfx } from "../lib/game";

type Profile = {
  id: string; email: string; name: string; displayName?: string | null; age?: number | null;
  targetExam?: string | null; targetScore?: number | null; role: "USER" | "ADMIN";
  profileComplete?: boolean;
};
const EXAMS = [
  "Rajasthan Computer Instructor", "RPSC Programmer", "Rajasthan CET (Graduate)", "Rajasthan CET (12th)",
  "Rajasthan Patwari", "Rajasthan VDO", "RRB NTPC", "RRB Group D", "SSC CGL", "SSC CHSL", "SSC MTS",
  "SSC GD", "SSC JE (Computer Science)", "SSC IMD Scientific Assistant (CS & IT)", "IBPS / Banking", "Other / explore all exams",
];
const STYLES: { id: Style; title: string; description: string; mark: string }[] = [
  { id: "aura", title: "Aura", description: "Clean, calm, modern", mark: "A" },
  { id: "toon", title: "Cartoon world", description: "Playful and encouraging", mark: "C" },
  { id: "astra", title: "Astra", description: "High-contrast space look", mark: "✦" },
];

export default function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [visualStyle, setVisualStyle] = useState<Style>(() => getStyle());
  const [theme, setTheme] = useState<"light" | "dark">(() => isDark() ? "dark" : "light");
  const [sounds, setSounds] = useState(() => soundOn());

  const loadProfile = () => {
    setLoading(true); setError("");
    api<Profile>("/profile").then((p) => {
      setProfile(p); setName(p.displayName || p.name || ""); setEmail(p.email || "");
      setAge(p.age ? String(p.age) : ""); setTargetExam(p.targetExam || "");
    }).catch((e: any) => setError(e.message || "Could not load your account."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile(e: FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setSaving(true);
    try {
      const updated = await api<Profile>("/profile", "PUT", {
        name: name.trim(), email: email.trim().toLowerCase(), age: Number(age), targetExam,
      });
      setProfile(updated); setName(updated.displayName || updated.name || ""); setEmail(updated.email || "");
      setAge(updated.age ? String(updated.age) : ""); setTargetExam(updated.targetExam || "");
      setSuccess("Your profile changes have been saved to your account.");
      window.dispatchEvent(new Event("examforge:profile"));
    } catch (e: any) { setError(e.message || "Could not save your profile."); }
    finally { setSaving(false); }
  }

  function updateStyle(next: Style) {
    setStyle(next);
    const nowDark = isDark();
    setVisualStyle(next); setTheme(nowDark ? "dark" : "light");
    window.dispatchEvent(new Event("examforge:theme"));
    setSuccess(`${STYLE_NAMES[next]} appearance applied.`); setError("");
    sfx("pop");
  }
  function updateTheme(next: "light" | "dark") {
    // Astra is designed for dark mode. Selecting light switches to Aura automatically.
    if (getStyle() === "astra" && next === "light") {
      setStyle("aura"); setVisualStyle("aura");
    }
    try { localStorage.setItem("theme", next); } catch { /* browser storage may be unavailable */ }
    const activeStyle = getStyle();
    document.documentElement.classList.toggle("dark", activeStyle === "astra" || next === "dark");
    setTheme(activeStyle === "astra" ? "dark" : next);
    window.dispatchEvent(new Event("examforge:theme"));
    setSuccess(`${activeStyle === "astra" ? "Astra dark" : next === "dark" ? "Dark" : "Light"} theme applied.`); setError("");
    sfx("pop");
  }
  function updateSounds() {
    const enabled = toggleSound(); setSounds(enabled);
    // Let embedded study tools stop any already-playing ambient audio immediately.
    window.dispatchEvent(new Event("examforge:sound"));
    setSuccess(enabled ? "Sound effects enabled." : "Sound effects muted."); setError("");
    if (enabled) sfx("pop");
  }

  if (loading) return <Shell><Loading text="Loading your profile and preferences…" /></Shell>;
  if (!profile && error) return <Shell><section className="card card-pad stack" style={{ maxWidth: 620, margin: "40px auto" }}><div className="alert alert-bad"><AlertTriangle size={18} />{error}</div><button className="btn btn-primary" onClick={loadProfile}>Try again</button></section></Shell>;

  return <Shell>
    <div className="profile-page stack" style={{ gap: 22 }}>
      <section className="hero profile-hero">
        <div className="profile-hero-icon"><UserRound size={36} /></div>
        <span className="pill" style={{ background: "rgba(255,255,255,.15)", color: "white", borderColor: "rgba(255,255,255,.2)" }}><ShieldCheck size={14} /> Account centre</span>
        <h1 style={{ marginTop: 10 }}>Profile & settings</h1>
        <p>Manage your account, target exam, appearance and sound preferences in one place.</p>
        <div className="profile-mini-stats"><span><b>{profile?.role === "ADMIN" ? "Admin" : "Student"}</b><small>Account type</small></span><span><b>{profile?.targetExam || "Not set"}</b><small>Target exam</small></span></div>
      </section>

      {(success || error) && <div className={`alert ${error ? "alert-bad" : "alert-ok"}`} role="status">{error ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}{error || success}</div>}

      <div className="profile-settings-grid">
        <form className="card card-pad stack profile-settings-card" onSubmit={saveProfile}>
          <div className="profile-section-heading"><div className="profile-settings-icon"><UserRound size={20} /></div><div><h2 className="card-title">Personal information</h2><p className="sub">These details stay connected to your login.</p></div></div>
          <div className="profile-form-grid">
            <div><label className="label" htmlFor="profile-name">Full name</label><input className="input" id="profile-name" autoComplete="name" required minLength={1} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></div>
            <div><label className="label" htmlFor="profile-email">Email address</label><input className="input" id="profile-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div><label className="label" htmlFor="profile-age">Age</label><input className="input" id="profile-age" type="number" required min={13} max={100} step={1} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" /></div>
            <div><label className="label" htmlFor="profile-exam">Target exam / course</label><select className="input" id="profile-exam" required value={targetExam} onChange={(e) => setTargetExam(e.target.value)}><option value="">Choose your target</option>{targetExam && !EXAMS.includes(targetExam) && <option value={targetExam}>{targetExam}</option>}{EXAMS.map((exam) => <option key={exam} value={exam}>{exam}</option>)}</select><p className="hint">Used to personalize your recommended mock tests and study tracks.</p></div>
          </div>
          <div className="row between profile-save-row"><p className="hint"><ShieldCheck size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />Account details are saved securely on ExamForge's backend.</p><button className="btn btn-primary" disabled={saving}>{saving ? <><LoaderCircle size={16} className="animate-spin" />Saving…</> : <><Save size={16} />Save changes</>}</button></div>
        </form>

        <section className="card card-pad stack profile-settings-card">
          <div className="profile-section-heading"><div className="profile-settings-icon"><Palette size={20} /></div><div><h2 className="card-title">Appearance</h2><p className="sub">Choose a look that feels comfortable for studying.</p></div></div>
          <div className="profile-control-block"><div className="row between"><div><b className="profile-control-title">Colour theme</b><p className="sub">Switch between light and dark mode.</p></div><div className="row profile-theme-options"><button type="button" className={`btn btn-sm ${theme === "light" ? "btn-primary" : ""}`} aria-pressed={theme === "light"} onClick={() => updateTheme("light")}><Sun size={15} />Light</button><button type="button" className={`btn btn-sm ${theme === "dark" ? "btn-primary" : ""}`} aria-pressed={theme === "dark"} onClick={() => updateTheme("dark")}><Moon size={15} />Dark</button></div></div></div>
          <div className="profile-control-block"><div className="profile-control-title">Visual style</div><div className="profile-style-grid">{STYLES.map((style) => <button key={style.id} type="button" className={`profile-style-option ${visualStyle === style.id ? "selected" : ""}`} onClick={() => updateStyle(style.id)} aria-pressed={visualStyle === style.id}><span className={`profile-style-swatch ${style.id}`}>{style.mark}</span><b>{style.title}</b><small>{style.description}</small>{visualStyle === style.id && <CheckCircle2 size={16} className="profile-style-check" />}</button>)}</div>{visualStyle === "astra" && <p className="hint">Astra keeps dark mode enabled to preserve contrast.</p>}</div>
        </section>

        <section className="card card-pad stack profile-settings-card profile-sound-card">
          <div className="profile-section-heading"><div className="profile-settings-icon"><Volume2 size={20} /></div><div><h2 className="card-title">Sound & feedback</h2><p className="sub">Control the interface sounds used for answers, progress and achievements.</p></div></div>
          <label className="switch profile-sound-switch"><input type="checkbox" checked={sounds} onChange={updateSounds} /><span><b>{sounds ? "Sound effects on" : "Sound effects off"}</b><small>{sounds ? "Short feedback sounds are enabled." : "ExamForge will stay silent."}</small></span><span className="profile-sound-icon">{sounds ? <Volume2 size={19} /> : <VolumeX size={19} />}</span></label>
          <div className="profile-feedback-note"><Sparkles size={16} /><span>Theme, style and sound preferences apply immediately and are remembered on this browser. Your personal profile is saved to your account.</span></div>
        </section>
      </div>
    </div>
  </Shell>;
}
