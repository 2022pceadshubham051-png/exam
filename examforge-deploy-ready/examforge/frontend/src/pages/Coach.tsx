import { useEffect, useMemo, useRef, useState } from "react"; import { Link } from "react-router-dom";
import { Owl } from "../components/Buddies";
import { Compass, Target, Gauge, TrendingUp, ThumbsUp, TriangleAlert, Play, Clock, BookOpen, Zap, Flame, ListChecks, Info, CalendarDays, Sparkles } from "lucide-react";
import { api } from "../lib/api"; import Shell, { Loading } from "../components/Shell"; import { Ring } from "./Result";

const levelPill: Record<string, string> = { Strong: "pill-ok", Good: "pill-ok", Average: "pill-warn", Weak: "pill-bad", Critical: "pill-bad" };
const levelColor = (s: number) => (s >= 80 ? "#16a34a" : s >= 65 ? "#65a30d" : s >= 50 ? "#d97706" : s >= 35 ? "#ea580c" : "#dc2626");
const actionInfo: Record<string, [string, any]> = { LEARN: ["Learn concept first", BookOpen], PRACTICE: ["Topic drill", Target], SPEED: ["Speed drill", Zap], SLOW_DOWN: ["Slow down, read fully", Clock], REVISE: ["Revise now", Flame], BASELINE: ["Take a baseline test", Play] };
const GROUPS = ["SSC", "Railway", "IMD", "Custom"];

function Bar({ v, color }: { v: number; color?: string }) { return <div className="bar" style={{ marginTop: 5 }}><i style={{ width: `${Math.max(2, Math.min(100, v))}%`, background: color ?? levelColor(v) }} /></div>; }

export default function Coach() {
  const [catalog, setCatalog] = useState<any>(null); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [exam, setExam] = useState("ssc-cgl-t1"); const [group, setGroup] = useState("SSC"); const [scope, setScope] = useState("all"); const [target, setTarget] = useState(80); const [hours, setHours] = useState(2);
  const [weights, setWeights] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem("coach:weights") ?? "") } catch { return { reasoning: 30, quant: 30, english: 20, ga: 20 }; } });
  const [open, setOpen] = useState<string | null>(null); const ready = useRef(false);

  useEffect(() => {
    Promise.all([api("/coach/exams"), api("/coach/prefs")]).then(([c, p]) => {
      setCatalog(c); if (p.targetScore) setTarget(p.targetScore);
      const te: string | null = p.targetExam; if (te) { setExam(te.startsWith("custom") ? "custom" : te); setGroup(te.startsWith("custom") ? "Custom" : c.exams.find((e: any) => e.id === te)?.group ?? "SSC"); }
      ready.current = true; setBusy(true);
    }).catch((e) => setErr(e.message));
  }, []);

  const weightStr = useMemo(() => Object.entries(weights).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(","), [weights]);
  const examParam = exam === "custom" ? `custom|${weightStr}` : exam;
  useEffect(() => {
    if (!ready.current) return; setBusy(true);
    const t = setTimeout(() => {
      const q = `exam=${encodeURIComponent(exam)}&weights=${encodeURIComponent(weightStr)}&scope=${scope}&target=${target}&hours=${hours}`;
      api(`/coach?${q}`).then((r) => { setD(r); setErr(""); }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
    }, 300); return () => clearTimeout(t);
  }, [exam, weightStr, scope, target, hours, catalog]);
  useEffect(() => { if (!ready.current) return; const t = setTimeout(() => { api("/coach/prefs", "PUT", { targetExam: examParam, targetScore: target }).catch(() => {}); }, 800); return () => clearTimeout(t); }, [examParam, target]);
  useEffect(() => { try { localStorage.setItem("coach:weights", JSON.stringify(weights)); } catch { /* ignore */ } }, [weights]);

  if (!catalog && !err) return <Shell><Loading text="Loading your coach" /></Shell>;
  const exams: any[] = catalog?.exams ?? [];
  const inGroup = exams.filter((e) => e.group === group);
  const bp = d?.exam;

  return <Shell><div className="stack" style={{ gap: 22 }}>
    <section className="hero"><div className="blob" style={{ width: 220, height: 220, background: "#22d3ee", right: -40, top: -60 }} /><div className="hero-mascot"><Owl size={128} /></div>
      <span className="pill pill-brand" style={{ position: "relative" }}><Compass size={14} />Smart Coach</span>
      <h1 style={{ marginTop: 10 }}>What should you work on next?</h1>
      <p>Pick your exam. ExamForge auto-detects the subject and topic of every question you solve (Reasoning, Maths, English, GA, Technical...), rates each one out of 100 and ranks what will add the most marks.</p></section>

    <section className="card card-pad stack">
      <div className="row between"><div><h2 className="card-title">1. Which exam are you preparing for?</h2><p className="sub">Subjects and weightage come from the exam pattern. Your choice is saved.</p></div>
        <div className="seg">{GROUPS.map((g) => <button key={g} className={group === g ? "on" : ""} onClick={() => { setGroup(g); if (g === "Custom") setExam("custom"); else { const f = exams.find((e) => e.group === g); if (f) setExam(f.id); } }}>{g}</button>)}</div></div>
      {group !== "Custom" ? <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>{inGroup.map((e) => <button key={e.id} className={`mode-card ${exam === e.id ? "chosen" : ""}`} onClick={() => setExam(e.id)} style={{ textAlign: "left" }}>
        <span><b>{e.name}</b><small>{e.stage} · {e.subjects.length} subjects · {e.totalQuestions} Q · {e.durationMin} min</small></span><span className="mode-check">{exam === e.id ? "✓" : ""}</span></button>)}</div>
        : <div className="stack" style={{ gap: 10 }}><p className="sub">Set your own weightage (any numbers, they are converted to percentages).</p>
          <div className="form-grid">{catalog.subjects.map((s: any) => <div key={s.key}><label className="label">{s.name}</label><input className="input" type="number" min={0} max={500} value={weights[s.key] ?? 0} onChange={(e) => setWeights({ ...weights, [s.key]: +e.target.value })} /></div>)}</div></div>}
      <div className="form-grid">
        <div><label className="label">Data to analyse</label><div className="seg" style={{ width: "100%" }}>{[["all", "Exam + Practice"], ["exam", "Exam only"], ["practice", "Practice only"]].map(([k, l]) => <button key={k} style={{ flex: 1, justifyContent: "center" }} className={scope === k ? "on" : ""} onClick={() => setScope(k)}>{l}</button>)}</div></div>
        <div><label className="label">Your target rating: <b>{target}/100</b></label><input type="range" min={40} max={100} step={5} value={target} onChange={(e) => setTarget(+e.target.value)} style={{ width: "100%" }} /></div>
      </div>
      {bp?.note && <div className="alert alert-info"><Info size={16} /><span>{bp.note}</span></div>}
      {bp && bp.confidence !== "high" && <div className="alert alert-warn"><TriangleAlert size={16} /><span>This pattern is approximate. Confirm marks and sections with the latest official notice.</span></div>}
    </section>

    {err && <div className="alert alert-bad">{err}</div>}
    {(!d || (busy && !d)) ? <Loading text="Analysing every question you solved" /> : !d.attemptedAny ? <div className="card empty"><Gauge size={36} /><p>No solved questions yet. Take any test (Exam or Practice) and your ratings appear here automatically.</p><Link className="btn btn-primary" style={{ marginTop: 12 }} to="/dashboard"><Play size={16} />Open tests</Link></div> : <>
      <section className="card card-pad row" style={{ gap: 30, opacity: busy ? 0.6 : 1, transition: "opacity .2s" }}>
        <Ring value={d.readiness} label="ready" />
        <div style={{ flex: 1, minWidth: 240 }}><div className="stat-l">Readiness for {bp.name} {bp.stage}</div>
          <div style={{ fontSize: "2.3rem", fontWeight: 800, letterSpacing: "-.03em" }}>{d.readiness}<span className="muted" style={{ fontSize: "1.1rem" }}> / 100</span></div>
          <p className="sub" style={{ marginTop: 6 }}>{d.gap > 0 ? `${d.gap} points below your target of ${d.target}.` : "You have reached your target rating. Keep revising to stay there."} Based on {d.questionsAnalysed} solved questions, recent ones count more.</p></div>
        <div className="grid-stats" style={{ flex: 1, minWidth: 260 }}>
          <div className="stat"><div className="stat-l"><ListChecks size={14} />Syllabus coverage</div><div className="stat-v">{d.coverage}%</div></div>
          <div className="stat"><div className="stat-l"><Target size={14} />Projected marks</div><div className="stat-v">{d.projectedMarks}<small className="muted" style={{ fontSize: ".8rem" }}> / {d.totalMarks}</small></div></div>
        </div></section>

      <section className="card card-pad stack"><div><h2 className="card-title">2. Subject-wise rating and weightage</h2><p className="sub">{bp.subjects.length} subjects in this exam. Weightage = share of total marks. Marks at stake = marks you are still losing in that subject.</p></div>
        <div className="stack" style={{ gap: 14 }}>{d.subjects.map((s: any) => <div key={s.key} className="qcard">
          <div className="row between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}><b>{s.name}</b><div className="sub">{s.questions} Q · {s.marks} marks · <b>{s.weight}%</b> of the exam</div></div>
            {s.rating ? <div style={{ textAlign: "right" }}><span style={{ fontSize: "1.6rem", fontWeight: 800, color: levelColor(s.rating.score) }}>{s.rating.score}</span><span className="muted">/100</span><div><span className={`pill ${levelPill[s.rating.level]}`}>{s.rating.level}</span></div></div> : <span className="pill">No data</span>}</div>
          <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}><div style={{ flex: 1 }}><div className="sub">Weightage</div><Bar v={s.weight} color="#6366f1" /></div><div style={{ flex: 1 }}><div className="sub">Your rating</div><Bar v={s.rating?.score ?? 0} /></div></div>
          {s.rating && <div className="row sub" style={{ marginTop: 8, gap: 14 }}><span>{s.rating.accuracy}% accuracy</span><span>{s.rating.avgSec}s / question</span><span>{s.rating.questions} questions</span><span>{s.rating.confidence} confidence</span><span style={{ color: "var(--bad)", fontWeight: 700 }}>{s.marksAtStake} marks at stake</span>{s.rating.trend !== null && <span style={{ color: s.rating.trend >= 0 ? "var(--ok)" : "var(--bad)" }}>{s.rating.trend >= 0 ? "▲" : "▼"} {Math.abs(s.rating.trend)} pts recent trend</span>}</div>}
          {s.topics.length > 0 && <><button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setOpen(open === s.key ? null : s.key)}>{open === s.key ? "Hide" : "Show"} {s.topics.length} topics (auto-detected)</button>
            {open === s.key && <div className="stack" style={{ gap: 8, marginTop: 10 }}>{s.topics.map((t: any) => <div key={t.topic}><div className="row between" style={{ fontSize: ".88rem" }}><b>{t.topic}</b><span><span style={{ color: levelColor(t.score), fontWeight: 800 }}>{t.score}/100</span> <span className="sub">· {t.accuracy}% · {t.questions}Q · {t.avgSec}s</span></span></div><Bar v={t.score} /></div>)}</div>}</>}
        </div>)}</div>
        {d.extra?.length > 0 && <p className="sub">Also detected but not part of this exam: {d.extra.map((e: any) => `${e.name} (${e.rating?.score ?? "-"}/100)`).join(", ")}.</p>}
      </section>

      <section className="card card-pad stack"><div><h2 className="card-title row" style={{ gap: 8 }}><Flame size={18} color="#dc2626" />3. Work on this first</h2><p className="sub">Ranked by how many marks each fix can add, using subject weightage × the gap to your target.</p></div>
        {d.focus.length ? <div className="stack" style={{ gap: 10 }}>{d.focus.map((f: any, i: number) => { const [label, Icon] = actionInfo[f.action] ?? actionInfo.PRACTICE; return <div key={i} className="qcard">
          <div className="row between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}><div><div className="row" style={{ gap: 8 }}><span className="pill pill-brand">#{i + 1}</span><b>{f.topic ?? f.name}</b>{f.subjectName && <span className="pill">{f.subjectName}</span>}</div><p className="sub" style={{ margin: "6px 0 0" }}>{f.reason}</p></div>
            {f.score !== null && <div style={{ textAlign: "right", flex: "none" }}><span style={{ fontSize: "1.3rem", fontWeight: 800, color: levelColor(f.score) }}>{f.score}</span><span className="muted">/100</span></div>}</div>
          <div className="row" style={{ marginTop: 10 }}><span className="pill pill-warn"><Icon size={13} />{label}</span>
            {f.practice?.map((p: any) => <Link key={p.testId} className="btn btn-sm btn-primary" to={`/exam/${p.testId}?mode=practice&topic=${encodeURIComponent(f.topic)}`}><Sparkles size={14} />Practice in "{p.name}" ({p.count} Q)</Link>)}
            {f.action !== "BASELINE" && !f.practice?.length && <span className="sub">No published test has questions on this topic yet.</span>}
            {f.action === "BASELINE" && <Link className="btn btn-sm btn-primary" to="/dashboard"><Play size={14} />Choose a test</Link>}</div></div>; })}</div>
          : <div className="alert alert-info"><ThumbsUp size={16} />Nothing urgent. Every topic you practised is at or above your target.</div>}
      </section>

      <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <section className="card card-pad stack"><div className="row between"><div><h2 className="card-title row" style={{ gap: 8 }}><CalendarDays size={18} />Today's plan</h2><p className="sub">Study time split by priority.</p></div>
          <select className="input" style={{ width: 120 }} value={hours} onChange={(e) => setHours(+e.target.value)}>{[1, 2, 3, 4, 6, 8].map((h) => <option key={h} value={h}>{h} hr/day</option>)}</select></div>
          {d.plan.length ? d.plan.map((p: any, i: number) => <div key={i} className="row between" style={{ flexWrap: "nowrap" }}><div><b>{p.topic}</b><div className="sub">{p.subject} · {p.task}</div></div><span className="pill pill-brand" style={{ flex: "none" }}>{p.minutes} min</span></div>) : <p className="sub">Plan appears once there is something to improve.</p>}</section>
        <section className="card card-pad stack"><h2 className="card-title row" style={{ gap: 8 }}><ThumbsUp size={18} color="#16a34a" />Your strengths</h2>
          {d.strengths.length ? d.strengths.map((t: any) => <div key={t.subject + t.topic}><div className="row between"><b>{t.topic}</b><span style={{ color: "#16a34a", fontWeight: 800 }}>{t.score}/100</span></div><div className="sub">{t.subject} · {t.accuracy}% over {t.questions} questions</div></div>) : <p className="sub">A topic needs 5+ solved questions and a rating of 75 to show up here.</p>}</section>
      </div>
      <p className="sub" style={{ textAlign: "center" }}><TrendingUp size={13} style={{ verticalAlign: "-2px" }} /> Rating = recency-weighted accuracy (75%) + speed vs exam time per question (15%) + recent trend (10%). Topics are detected automatically from question text; admins can correct tags in the question manager.</p>
    </>}
  </div></Shell>;
}
