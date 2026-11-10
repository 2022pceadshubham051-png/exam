import { useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { Play, CalendarDays, ArrowRight, BookMarked, Trophy, Languages, Target, Zap, Swords, GraduationCap, ClipboardList, TrendingDown } from "lucide-react";
import { HomeHero, HomeBanners, HomeContinue, HomePromo, type Slide, type Pick } from "../components/HomeUI";
import Shell from "../components/Shell"; import { SkeletonPage } from "../components/ui"; import { JourneyStrip } from "../components/Journey"; import { WeekDots } from "../components/Achievement";
import { api, swr, fmt } from "../lib/api"; import { loadProfile, firstName, matchesExam, cachedCoins, type Profile } from "../lib/profile"; import { streakDays } from "../lib/game";
import { type StreakInfo } from "../lib/engage"; import { useT } from "../lib/i18n"; import { getLang, setLang, getExamDate, setExamDate, daysUntil } from "../lib/prefs"; import { dueNotes, revisedToday } from "../lib/notebook"; import GoalRing from "../components/GoalRing"; import Poster from "../components/Poster"; import { rupees } from "../lib/courses";

const hour = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Home() {
  const t = useT();
  const [prof, setProf] = useState<Profile | null>(null); const [hist, setHist] = useState<any[] | null>(null); const [tests, setTests] = useState<any[] | null>(null);
  const [st, setSt] = useState<StreakInfo | null>(null); const [daily, setDaily] = useState<any>(null); const [weak, setWeak] = useState<any[] | null>(null); const [board, setBoard] = useState<any[] | null>(null);
  const [ads, setAds] = useState<any[]>([]); const [coins, setCoins] = useState(cachedCoins()); const [courses, setCourses] = useState<any[]>([]); const [date, setDate] = useState(getExamDate()); const [editDate, setEditDate] = useState(false); const [, bump] = useState(0);
  useEffect(() => {
    loadProfile().then(setProf).catch(() => {}); swr("/streak", setSt).catch(() => {}); swr("/daily", setDaily).catch(() => {});
    swr("/history?limit=60", (d: any) => setHist(Array.isArray(d) ? d : [])).catch(() => setHist([]));
    swr("/tests?limit=100&q=", (d: any) => setTests(Array.isArray(d) ? d : [])).catch(() => setTests([]));
    swr("/progress?period=all&scope=all", (d: any) => setWeak(d?.weak ?? [])).catch(() => setWeak([]));
    swr("/tests/leaderboard?limit=20", (d: any) => setBoard(Array.isArray(d) ? d : [])).catch(() => setBoard([]));
    swr("/courses", (d: any) => setCourses(Array.isArray(d) ? d : [])).catch(() => {}); swr("/banners", (d: any) => setAds(Array.isArray(d) ? d : [])).catch(() => {});
    const f = () => bump((n) => n + 1), c = () => setCoins(cachedCoins()); window.addEventListener("ef-notebook", f); window.addEventListener("ef-coins", c); return () => { window.removeEventListener("ef-notebook", f); window.removeEventListener("ef-coins", c); };
  }, []);
  const ready = prof && hist && tests;
  const done = useMemo(() => (hist ?? []).filter((a) => a.result), [hist]);
  const active = (hist ?? []).find((a) => !a.result && !a.resultHidden);
  const target = prof?.targetExam ?? null, streak = st ? st.current : streakDays(done), days = daysUntil(date);
  const next = useMemo(() => {
    const doneIds = new Set(done.map((a) => a.test.id)); const mine = (tests ?? []).filter((x) => matchesExam(x.examName, target));
    const pool = mine.length ? mine : tests ?? []; return pool.find((x) => !doneIds.has(x.id)) ?? pool[0];
  }, [tests, done, target]);
  const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
  const qCount = (x: any) => x.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
  const practiceTest = done[0]?.test?.id ?? next?.id;
  const myRow = board?.find((r) => r.isMe);
  const due = dueNotes().length, last = done[0];
  if (!ready) return <Shell hero><SkeletonPage /></Shell>;

  // app-style home: the course pill, banner slides, "pick up" cards and one featured course
  const mine = courses.find((c) => c.enrollment === "ACTIVE"), open = courses.filter((c) => c.enrollment !== "ACTIVE"), price = (c: any) => c.priceInr > 0 ? rupees(c.priceInr) : t("Free");
  const slides: Slide[] = [];
  // admin banners (their own ads: image + a link to a course / exam / page) replace the default slides
  ads.filter((b) => b.placement === "HOME").forEach((b) => slides.push({ key: `ad${b.id}`, adId: b.id, image: b.imageUrl, tone: "brand", kicker: "", title: b.title, cta: "", to: b.linkUrl, icon: null }));
  const fallback = slides.length === 0, planPhotos = ads.filter((b) => b.placement === "PLAN"), planImg = planPhotos.length ? planPhotos[Math.floor(Date.now() / 864e5) % planPhotos.length].imageUrl : null;
  if (fallback) slides.push({ key: "daily", tone: "gold", kicker: t("Daily"), title: t("Daily Challenge"), sub: daily?.status === "done" ? `${t("Done")}: ${daily.summary?.correct}/${daily.summary?.total}` : t("10 questions · 10 min · grow your streak"), cta: daily?.status === "playing" ? t("Continue") : daily?.status === "done" ? t("Open") : t("Start test"), to: "/daily", icon: <Zap /> });
  const feat = open[0] ?? courses[0];
  if (fallback && feat) slides.push({ key: "course", tone: "navy", kicker: t("Courses for you"), title: feat.title, sub: feat.enrollment === "ACTIVE" ? `${t("Continue learning")} · ${feat.progress}%` : price(feat), cta: t("Open"), to: `/courses/${feat.id}`, poster: feat.posterUrl, icon: <GraduationCap /> });
  if (fallback) slides.push({ key: "duel", tone: "ok", kicker: t("Duel"), title: t("Challenge a friend"), cta: t("Open"), to: "/duel", icon: <Swords /> });
  const picks: Pick[] = [];
  const plan = active ? { id: active.test.id, name: active.test.name } : next ? { id: next.id, name: next.name } : null;
  if (plan) picks.push({ key: "plan", wide: true, to: `/exam/${plan.id}`, label: t("Today's plan"), line: plan.name, badge: t("Today"), poster: planImg, icon: <Play />, tone: "brand" });
  courses.filter((c) => c.enrollment === "ACTIVE").slice(0, 2).forEach((c) => picks.push({ key: `c${c.id}`, to: `/courses/${c.id}`, label: t("Continue learning"), line: c.title, badge: `${c.progress}%`, poster: c.posterUrl, icon: <GraduationCap /> }));
  if (weak?.[0] && practiceTest) picks.push({ key: "weak", to: `/exam/${practiceTest}?mode=practice&topic=${encodeURIComponent(weak[0].topic)}`, label: t("Weak topic"), line: weak[0].topic, badge: `${weak[0].accuracy}%`, icon: <TrendingDown />, tone: "bad" });
  if (due) picks.push({ key: "due", to: "/revise", label: t("Mistake notebook"), line: `${due} ${t("to revise today")}`, icon: <BookMarked />, tone: "ok" });
  if (daily?.status !== "done") picks.push({ key: "daily", to: "/daily", label: t("Daily"), line: t("Daily Challenge"), icon: <Zap />, tone: "gold" });
  const promo = (open[1] ?? open[0]) && courses.length > 1 ? (open[1] ?? open[0]) : null, who = firstName(prof) || "Student";

  return <Shell hero><div className="stack stagger home" style={{ gap: 20 }}>
    <HomeHero t={t} name={prof?.name} courseLabel={mine?.title ?? t("Explore courses")} courseTo={mine ? `/courses/${mine.id}` : "/courses"} target={target} streak={streak} atRisk={!!st?.atRisk && !st.doneToday} coins={coins} />
    <div><HomeBanners slides={slides} />
      <HomeContinue title={t("{name}, pick up where you left off?", { name: who })} picks={picks} /></div>
    {promo && <HomePromo promo={{ to: `/courses/${promo.id}`, kicker: t("Featured"), title: promo.title, sub: price(promo), poster: promo.posterUrl }} />}
    <div className="hx-meta">
      <span className="sub">{t(hour())}, <b>{who}</b></span>
      <div className="home-chips">
        <button type="button" className="chip chip-btn" onClick={() => setEditDate((v) => !v)} aria-expanded={editDate}><CalendarDays size={15} aria-hidden="true" />{days === null ? t("Set exam date") : days > 0 ? `${days} ${t("days left")}` : days === 0 ? t("Exam day") : t("Set exam date")}</button>
        <button type="button" className="chip chip-btn" onClick={() => setLang(getLang() === "en" ? "hi" : "en")} aria-label="Language"><Languages size={15} aria-hidden="true" />{getLang() === "en" ? "HI" : "EN"}</button>
      </div>
    </div>
    {ready && <GoalRing goals={[{ label: "Daily Challenge", done: daily?.status === "done", to: "/daily" }, { label: "Finish a test today", done: done.some((a) => new Date(a.endedAt ?? 0).toDateString() === new Date().toDateString()), to: "/dashboard" }, { label: "Revise 5 cards", done: revisedToday() >= 5, to: "/revise" }]} />}
    {editDate && <div className="card card-pad row" style={{ gap: 10 }}><label className="label" htmlFor="exdate" style={{ margin: 0 }}>{t("Exam date")}</label><input id="exdate" className="input" type="date" value={date ?? ""} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value || null); setExamDate(e.target.value || null); }} style={{ maxWidth: 190 }} /></div>}

    {courses.length > 0 && <section className="stack" style={{ gap: 10 }} aria-labelledby="courses-h">
      <div className="row between"><h2 className="card-title row" style={{ gap: 8 }} id="courses-h"><GraduationCap size={18} aria-hidden="true" />{t("Courses for you")}</h2><Link className="sub" to="/courses">{t("See all")} <ArrowRight size={13} aria-hidden="true" /></Link></div>
      <div className="poster-strip">{courses.slice(0, 8).map((c) => <Link key={c.id} to={`/courses/${c.id}`} className="card course-card tap-card" aria-label={c.title}>
        <Poster src={c.posterUrl} title={c.title} />
        <div className="course-body"><b className="course-title">{c.title}</b>
          {c.enrollment === "ACTIVE" ? <><div className="bar"><i style={{ width: `${c.progress}%` }} /></div><span className="sub">{t("Continue learning")} · {c.progress}%</span></>
            : c.enrollment === "PENDING" ? <span className="pill pill-warn">{t("Payment under review")}</span> : <span className="course-price">{c.priceInr > 0 ? rupees(c.priceInr) : t("Free")}</span>}</div></Link>)}</div>
    </section>}

    <section className="home-grid" aria-label={t("Daily")}>
      <Link className="card card-pad stack tap-card" style={{ gap: 6 }} to="/daily"><Zap size={20} aria-hidden="true" /><b>{t("Daily Challenge")}</b><span className="sub">{daily?.status === "done" ? `${t("Done")}: ${daily.summary?.correct}/${daily.summary?.total}${daily.summary?.rank ? ` · ${t("rank")} #${daily.summary.rank}` : ""}` : daily?.status === "playing" ? t("Resume now, your clock is running") : t("10 questions · 10 min · grow your streak")}</span></Link>
      <Link className="card card-pad stack tap-card" style={{ gap: 6 }} to="/duel"><Swords size={20} aria-hidden="true" /><b>{t("Duel")}</b><span className="sub">{t("Challenge a friend")}</span></Link>
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
      <Link className="card card-pad stack tap-card" style={{ gap: 6 }} to={due ? "/revise" : "/notebook"}><BookMarked size={20} aria-hidden="true" /><b>{t("Mistake notebook")}</b><span className="sub">{due} {t("to revise today")}{due ? ` · ${t("start")}` : ""}</span></Link>
      <Link className="card card-pad stack tap-card" style={{ gap: 6 }} to="/leaderboard"><Trophy size={20} aria-hidden="true" /><b>{t("Rankings")}</b><span className="sub">{myRow ? `#${myRow.rank} · ${myRow.average}%` : board?.[0] ? `${t("Top of the board")}: ${board[0].name} · ${board[0].average}%` : "—"}</span></Link>
    </section>
  </div></Shell>;
}
