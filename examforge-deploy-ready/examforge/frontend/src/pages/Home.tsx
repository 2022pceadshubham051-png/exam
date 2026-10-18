import { useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { Play, Flame, CalendarDays, ArrowRight, BookMarked, Trophy, Languages, Target } from "lucide-react";
import Shell from "../components/Shell"; import { SkeletonPage } from "../components/ui"; import { JourneyStrip } from "../components/Journey"; import { WeekDots } from "../components/Achievement";
import { api, fmt } from "../lib/api"; import { loadProfile, firstName, matchesExam, cachedCoins, type Profile } from "../lib/profile"; import { streakDays } from "../lib/game";
import { useT } from "../lib/i18n"; import { getLang, setLang, getExamDate, setExamDate, daysUntil } from "../lib/prefs"; import { dueNotes } from "../lib/notebook";

const hour = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Home() {
  const t = useT();
  const [prof, setProf] = useState<Profile | null>(null); const [hist, setHist] = useState<any[] | null>(null); const [tests, setTests] = useState<any[] | null>(null);
  const [weak, setWeak] = useState<any[] | null>(null); const [board, setBoard] = useState<any[] | null>(null);
  const [date, setDate] = useState(getExamDate()); const [editDate, setEditDate] = useState(false); const [, bump] = useState(0);
  useEffect(() => {
    loadProfile().then(setProf).catch(() => {});
    api("/history").then((d) => setHist(Array.isArray(d) ? d : [])).catch(() => setHist([]));
    api("/tests?limit=100&q=").then((d) => setTests(Array.isArray(d) ? d : [])).catch(() => setTests([]));
    api("/progress?period=all&scope=all").then((d) => setWeak(d?.weak ?? [])).catch(() => setWeak([]));
    api("/tests/leaderboard?limit=20").then((d) => setBoard(Array.isArray(d) ? d : [])).catch(() => setBoard([]));
    const f = () => bump((n) => n + 1); window.addEventListener("ef-notebook", f); return () => window.removeEventListener("ef-notebook", f);
  }, []);
  const ready = prof && hist && tests;
  const done = useMemo(() => (hist ?? []).filter((a) => a.result), [hist]);
  const active = (hist ?? []).find((a) => !a.result && !a.resultHidden);
  const target = prof?.targetExam ?? null, streak = streakDays(done), days = daysUntil(date);
  const next = useMemo(() => {
    const doneIds = new Set(done.map((a) => a.test.id)); const mine = (tests ?? []).filter((x) => matchesExam(x.examName, target));
    const pool = mine.length ? mine : tests ?? []; return pool.find((x) => !doneIds.has(x.id)) ?? pool[0];
  }, [tests, done, target]);
  const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
  const qCount = (x: any) => x.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
  const practiceTest = done[0]?.test?.id ?? next?.id;
  const myRow = board?.find((r) => r.isMe);
  const due = dueNotes().length, last = done[0];
  if (!ready) return <Shell><SkeletonPage /></Shell>;

  return <Shell><div className="stack stagger home" style={{ gap: 20 }}>
    <header className="home-head">
      <div><p className="sub">{t(hour())}</p><h1 className="h1">{firstName(prof) || "Student"}</h1></div>
      <div className="home-chips">
        {streak > 0 && <span className="chip"><Flame size={15} aria-hidden="true" />{streak} {t("day streak")}</span>}
        <button type="button" className="chip chip-btn" onClick={() => setEditDate((v) => !v)} aria-expanded={editDate}><CalendarDays size={15} aria-hidden="true" />{days === null ? t("Set exam date") : days > 0 ? `${days} ${t("days left")}` : days === 0 ? t("Exam day") : t("Set exam date")}</button>
        <button type="button" className="chip chip-btn" onClick={() => setLang(getLang() === "en" ? "hi" : "en")} aria-label="Language"><Languages size={15} aria-hidden="true" />{getLang() === "en" ? "हिं" : "EN"}</button>
      </div>
    </header>
    {editDate && <div className="card card-pad row" style={{ gap: 10 }}><label className="label" htmlFor="exdate" style={{ margin: 0 }}>{t("Exam date")}</label><input id="exdate" className="input" type="date" value={date ?? ""} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value || null); setExamDate(e.target.value || null); }} style={{ maxWidth: 190 }} /></div>}

    <section className="plan-card" aria-label={t("Today's plan")}>
      <span className="plan-kicker">{t("Today's plan")}</span>
      {active ? <><h2>{active.test.name}</h2><p className="sub">{t("Your answers are saved.")}</p><Link className="btn btn-primary btn-lg" to={`/exam/${active.test.id}`}><Play size={18} aria-hidden="true" />{t("Continue")}</Link></>
        : next ? <><h2>{next.name}</h2><p className="sub">{next.examName} · {fmt(next.durationSec)} · {qCount(next)} Q</p><Link className="btn btn-primary btn-lg" to={`/exam/${next.id}`}><Play size={18} aria-hidden="true" />{done.length ? t("Start test") : t("Take your first test")}</Link></>
        : <><h2>{t("No tests yet")}</h2><Link className="btn" to="/dashboard">{t("Practice")}</Link></>}
    </section>

    <section className="card" aria-label={t("Your journey")}>{done.length && avg !== null ? <JourneyStrip value={avg} goal={prof?.targetScore ?? null} label="Average score" /> : <div className="card-pad"><p className="sub"><Target size={15} aria-hidden="true" /> {t("Take your first test")}</p></div>}</section>

    <section className="card card-pad stack" style={{ gap: 12 }} aria-labelledby="weak-h">
      <div className="row between"><h2 className="card-title" id="weak-h">{t("Weak topics")}</h2><Link className="sub" to="/progress">{t("Progress")} <ArrowRight size={13} aria-hidden="true" /></Link></div>
      {weak && weak.length && practiceTest ? <ul className="weak-list">{weak.slice(0, 3).map((w) => <li key={w.topic}>
        <div><b>{w.topic}</b><div className="bar"><i style={{ width: `${w.accuracy}%`, background: "var(--bad)" }} /></div></div>
        <span className="weak-acc">{w.accuracy}%</span>
        <Link className="btn btn-sm" to={`/exam/${practiceTest}?mode=practice&topic=${encodeURIComponent(w.topic)}`}>{t("Practice 10 min")}</Link></li>)}</ul>
        : <p className="sub">{t("Finish a test to see your weak topics.")}</p>}
    </section>

    <section className="home-grid" aria-label={t("This week")}>
      <div className="card card-pad stack" style={{ gap: 10 }}><h2 className="card-title">{t("This week")}</h2><WeekDots done={done} />{last && <Link className="sub" to={`/review/${last.id}`}>{t("Last result")}: {Math.round(last.result.percentage)}% · {t("Review mistakes")} <ArrowRight size={13} aria-hidden="true" /></Link>}</div>
      <Link className="card card-pad stack tap-card" style={{ gap: 6 }} to="/notebook"><BookMarked size={20} aria-hidden="true" /><b>{t("Mistake notebook")}</b><span className="sub">{due} {t("to revise today")}</span></Link>
      <Link className="card card-pad stack tap-card" style={{ gap: 6 }} to="/leaderboard"><Trophy size={20} aria-hidden="true" /><b>{t("Rankings")}</b><span className="sub">{myRow ? `#${myRow.rank} · ${myRow.average}%` : board?.[0] ? `${t("Top of the board")}: ${board[0].name} · ${board[0].average}%` : "—"}</span></Link>
    </section>
  </div></Shell>;
}
