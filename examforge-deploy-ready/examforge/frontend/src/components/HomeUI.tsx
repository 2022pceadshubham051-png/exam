import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, GraduationCap, ChevronDown, Flame, ClipboardList, Sparkles, BookMarked, Swords, Users, Trophy, Timer, TrendingUp, Play, ArrowRight } from "lucide-react";
import { api } from "../lib/api"; import { BrandLockup } from "./LogoMark"; import UserMenu from "./UserMenu"; import Poster from "./Poster";

type T = (k: string, v?: Record<string, string | number>) => string;

/** Top of the home screen: quick tiles, the course pill, search and the category row, on a brand gradient. */
export function HomeHero({ t, name, courseLabel, courseTo, target, streak, atRisk, coins }: { t: T; name?: string; courseLabel: string; courseTo: string; target: string | null; streak: number; atRisk?: boolean; coins: number }) {
  const nav = useNavigate(); const [q, setQ] = useState("");
  const cats: [string, string, ReactNode][] = [[t("For You"), "/home", <Sparkles size={24} />], [t("Mock Tests"), "/dashboard", <ClipboardList size={24} />], [t("Notebook"), "/notebook", <BookMarked size={24} />], [t("Duel"), "/duel", <Swords size={24} />], [t("Rooms"), "/rooms", <Users size={24} />], [t("Rankings"), "/leaderboard", <Trophy size={24} />], [t("Lecture Pace"), "/lecture-pace", <Timer size={24} />], [t("Progress"), "/progress", <TrendingUp size={24} />]];
  const go = (e: React.FormEvent) => { e.preventDefault(); const s = q.trim(); nav(s ? `/dashboard?q=${encodeURIComponent(s)}` : "/dashboard"); };
  return <section className="hx-hero" aria-label="ExamForge">
    <div className="hx-top"><Link to="/courses" aria-label="ExamForge home"><BrandLockup size={28} onDark /></Link><UserMenu name={name} /></div>
    <div className="hx-row">
      <Link to={courseTo} className="hx-pill"><GraduationCap size={20} aria-hidden="true" /><span className="hx-pill-t"><small>{target ?? t("Courses")}</small><b>{courseLabel}</b></span><ChevronDown size={18} aria-hidden="true" /></Link>
      <Link to="/daily" className={`hx-stat ${atRisk ? "risk" : ""}`} aria-label={`${streak} ${t("day streak")}`}><Flame size={18} aria-hidden="true" /><b>{streak}</b></Link>
      <Link to="/shop" className="hx-stat gold" aria-label={t("Shop")}><span className="coin" aria-hidden="true" /><b>{coins}</b></Link>
    </div>
    <form className="hx-search" onSubmit={go} role="search"><Search size={22} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search tests, courses…")} aria-label={t("Search tests, courses…")} enterKeyHint="search" />
      <Link to="/dashboard" className="hx-filter" aria-label={t("Mock Tests")}><SlidersHorizontal size={20} /></Link></form>
    <nav className="hx-cats" aria-label={t("For You")}>{cats.map(([l, to, ic], i) => <Link key={l} to={to} className={i === 0 ? "on" : ""} aria-current={i === 0 ? "page" : undefined}><span aria-hidden="true">{ic}</span><b>{l}</b></Link>)}</nav>
  </section>;
}

export type Slide = { image?: string; adId?: string; key: string; tone: "brand" | "gold" | "navy" | "ok"; kicker: string; title: string; sub?: string; cta: string; to: string; poster?: string | null; icon: ReactNode };

/** Auto-sliding banners with pill dots. Scroll-snap does the swiping; the timer pauses while the finger is down and for reduced motion. */
export function HomeBanners({ slides }: { slides: Slide[] }) {
  const box = useRef<HTMLDivElement>(null); const [i, setI] = useState(0); const hold = useRef(false);
  useEffect(() => {
    if (slides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => { const el = box.current; if (!el || hold.current || document.hidden) return; const k = el.children, step = (k[0] as HTMLElement).offsetWidth + 10, n = (Math.round(el.scrollLeft / step) + 1) % slides.length; el.scrollTo({ left: n * step, behavior: "smooth" }); }, 5200);
    return () => clearInterval(id);
  }, [slides.length]);
  useEffect(() => { // count one view per banner per browser session
    slides.forEach((s) => { if (!s.adId) return; const k = `ef_bv_${s.adId}`; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* ignore */ } api(`/banners/${s.adId}/view`, "POST").catch(() => {}); });
  }, [slides.map((s) => s.adId).join(",")]); // eslint-disable-line
  if (!slides.length) return null;
  const tap = (s: Slide) => { if (s.adId) api(`/banners/${s.adId}/click`, "POST").catch(() => {}); };
  return <section className="hx-banners" aria-roledescription="carousel">
    <div className="hx-track" ref={box} onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / (((el.children[0] as HTMLElement | undefined)?.offsetWidth ?? el.clientWidth) + 10))); }} onPointerDown={() => { hold.current = true; }} onPointerUp={() => { setTimeout(() => { hold.current = false; }, 4000); }}>
      {slides.map((s) => s.image ? (/^https?:/i.test(s.to)
        ? <a key={s.key} href={s.to} target="_blank" rel="noopener noreferrer" className="hx-slide hx-ad" onClick={() => tap(s)} aria-label={s.title}><img src={s.image} alt={s.title} decoding="async" draggable={false} /></a>
        : <Link key={s.key} to={s.to} className="hx-slide hx-ad" onClick={() => tap(s)} aria-label={s.title}><img src={s.image} alt={s.title} decoding="async" draggable={false} /></Link>)
        : <Link key={s.key} to={s.to} className={`hx-slide tone-${s.tone}`}>
        <span className="hx-slide-deco" aria-hidden="true" />
        <div className="hx-slide-t"><small>{s.kicker}</small><h2>{s.title}</h2>{s.sub && <p>{s.sub}</p>}<span className="hx-cta">{s.cta}<ArrowRight size={15} aria-hidden="true" /></span></div>
        <div className="hx-slide-art" aria-hidden="true">{s.poster ? <Poster src={s.poster} title={s.title} /> : <span className="hx-art-ic">{s.icon}</span>}</div>
      </Link>)}
    </div>
    {slides.length > 1 && <div className="hx-dots" aria-hidden="true">{slides.map((s, k) => <i key={s.key} className={k === i ? "on" : ""} />)}</div>}
  </section>;
}

export type Pick = { wide?: boolean; key: string; to: string; label: string; line: string; badge?: string; poster?: string | null; icon: ReactNode; tone?: "brand" | "gold" | "ok" | "bad" };

/** "Pick up where you left off" cards on a gradient band. */
export function HomeContinue({ title, picks }: { title: string; picks: Pick[] }) {
  if (!picks.length) return null;
  return <section className="hx-cont" aria-label={title}>
    <h2>{title}</h2>
    <div className="hx-cards">{picks.map((p) => <Link key={p.key} to={p.to} className={`hx-card ${p.wide ? "plan" : ""}`}>
      <div className={`hx-thumb tone-${p.tone ?? "brand"}`}>{p.poster ? <Poster src={p.poster} title={p.line} /> : <span aria-hidden="true">{p.icon}</span>}{p.badge && <em className="hx-badge">{p.badge}</em>}</div>
      <small>{p.label}</small><b>{p.line}</b></Link>)}</div>
  </section>;
}

export type Promo = { to: string; kicker: string; title: string; sub: string; poster?: string | null };
/** One wide featured banner (a course). */
export function HomePromo({ promo }: { promo: Promo }) {
  return <Link to={promo.to} className="hx-promo"><span className="hx-slide-deco" aria-hidden="true" />
    <div className="hx-promo-t"><small>{promo.kicker}</small><h2>{promo.title}</h2><b>{promo.sub}</b></div>
    <div className="hx-promo-art" aria-hidden="true">{promo.poster ? <Poster src={promo.poster} title={promo.title} /> : <GraduationCap size={54} />}</div>
    <span className="hx-promo-go" aria-hidden="true"><Play size={14} /></span></Link>;
}

/** Hero for the Courses screen (the default page): title, search, All / My tabs and exam chips on the brand gradient. */
export function CoursesHero({ t, name, q, setQ, tab, setTab, mineCount, exams, exam, setExam, actions }: { t: T; name?: string; q: string; setQ: (v: string) => void; tab: "all" | "mine"; setTab: (v: "all" | "mine") => void; mineCount: number; exams: string[]; exam: string; setExam: (v: string) => void; actions?: ReactNode }) {
  return <section className="hx-hero hx-hero-page" aria-label={t("Courses")}>
    <div className="hx-top"><Link to="/courses" aria-label="ExamForge home"><BrandLockup size={28} onDark /></Link><UserMenu name={name} /></div>
    <div className="hx-title"><div><h1>{t("Courses")}</h1><p>{t("Video lessons with notes, made for your exam.")}</p></div>{actions && <div className="hx-title-act">{actions}</div>}</div>
    <form className="hx-search" onSubmit={(e) => e.preventDefault()} role="search"><Search size={22} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search courses")} aria-label={t("Search courses")} /></form>
    <div className="hx-tabs" role="tablist" aria-label={t("Courses")}>
      <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>{t("All courses")}</button>
      <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>{t("My courses")}{mineCount ? ` (${mineCount})` : ""}</button></div>
    {exams.length > 1 && <div className="hx-chips" role="group" aria-label={t("All exams")}><button type="button" className={exam === "" ? "on" : ""} onClick={() => setExam("")}>{t("All exams")}</button>{exams.map((x) => <button key={x} type="button" className={exam === x ? "on" : ""} onClick={() => setExam(exam === x ? "" : x)}>{x}</button>)}</div>}
  </section>;
}
