import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react"; import { Link } from "react-router-dom";
import { Check, Lock, Flag, Clock, PlayCircle, RotateCcw, X, ClipboardCheck, ArrowLeft, ChevronRight, TrainFront, Map as MapIcon, ListOrdered, Route as RouteIcon, LocateFixed, Award } from "lucide-react";
import { confetti } from "./Confetti"; import { toast } from "./ui"; import { sfx } from "../lib/game"; import { themeFor, type Theme } from "../lib/themes"; import LazyMount from "./LazyMount";
import { W, makeGeo, at, heading, clamp, scenery, bandsFor, Country, Clouds, type Geo } from "./RouteScenery";

/** Course route. The course first shows its SUBJECTS; tapping a subject opens that subject's own railway line right inside the panel:
 *  lectures are numbered stations (tap one to see its lecture), a quiz is a traffic light that holds the train until the quiz is taken. */
export type Quiz = { id: string; name: string; taken: boolean };
export type Stop = { key: string; kind: "lesson" | "quiz"; lesson?: any; quiz?: Quiz; n?: number; done: boolean; final?: boolean };

/** Stops of one subject in order: lecture 1, [its quiz], lecture 2, ..., [the subject's final quiz]. */
export function buildStops(s: any): Stop[] {
  const out: Stop[] = [];
  (s.lessons ?? []).forEach((l: any, i: number) => {
    out.push({ key: l.id, kind: "lesson", lesson: l, n: i + 1, done: !!l.done });
    if (l.quiz) out.push({ key: `q-${l.id}`, kind: "quiz", quiz: l.quiz, done: !!l.quiz.taken });
  });
  if (s.quiz) out.push({ key: `q-s-${s.id}`, kind: "quiz", quiz: s.quiz, done: !!s.quiz.taken, final: true });
  return out;
}

/** Where the train stands: the first stop that is not done yet, in the first subject that is not finished. */
export function trainSpot(subjects: any[]): { subjectId: string; idx: number; stop: Stop; held: boolean } | null {
  for (const s of subjects) { const st = buildStops(s), idx = st.findIndex((x) => !x.done); if (idx >= 0) return { subjectId: s.id, idx, stop: st[idx], held: st[idx].kind === "quiz" }; }
  return null;
}

const reduced = () => typeof document !== "undefined" && (document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches);

/* ------------------------------------------------------------------ the train, seen from above */
const CARS: [number, "engine" | "coach"][] = [[0, "engine"], [-28, "coach"], [-53, "coach"], [-78, "coach"]];

/** The train. It is driven straight on the SVG (no React re-render per frame): smooth-step easing, a little sway while rolling, smoke that speeds up, a glowing trail behind it. */
function Train({ g, target, from, held, trail, onArrive }: { g: Geo; target: number; from: number; held: boolean; trail: RefObject<SVGGElement>; onArrive: () => void }) {
  const root = useRef<SVGGElement>(null), cars = useRef<(SVGGElement | null)[]>([]), pos = useRef(from), raf = useRef(0), arrive = useRef(onArrive); arrive.current = onArrive;
  const place = (L: number, sway: number) => {
    CARS.forEach(([off], i) => { const el = cars.current[i]; if (!el) return; const s = L + off, p = at(g, s), a = heading(g, s), w = sway * Math.sin(i * 1.9 + performance.now() / 70);
      el.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${a.toFixed(2)}) translate(0 ${w.toFixed(2)})`); });
    if (trail.current) trail.current.style.strokeDashoffset = String(1000 - 1000 * clamp((L - 4) / g.total, 0, 1));
  };
  useLayoutEffect(() => { place(pos.current, 0); }, [g]); // eslint-disable-line
  useEffect(() => {
    cancelAnimationFrame(raf.current); const el = root.current, start = pos.current, delta = target - start;
    const stop = () => { if (el) delete el.dataset.go; };
    if (Math.abs(delta) < 1 || reduced()) { pos.current = target; place(target, 0); stop(); return; }
    const dur = clamp((Math.abs(delta) / 70) * 1000, 1500, 4800), t0 = performance.now() + 420;
    const step = (now: number) => {
      const k = clamp((now - t0) / dur, 0, 1), e = k * k * k * (k * (6 * k - 15) + 10), speed = (30 * k * k * (1 - k) * (1 - k)) / 1.875; // smootherstep: zero speed AND zero acceleration at both ends
      pos.current = start + delta * e; place(pos.current, 0.3 * speed);
      if (el) { if (k > 0 && k < 1) { el.dataset.go = "1"; el.style.setProperty("--spd", speed.toFixed(2)); } else stop(); }
      if (k < 1) raf.current = requestAnimationFrame(step); else { place(target, 0); arrive.current(); }
    };
    raf.current = requestAnimationFrame(step); return () => cancelAnimationFrame(raf.current);
  }, [target, g]); // eslint-disable-line
  return <g ref={root} className={`rt-train ${held ? "held" : ""}`}>
    {CARS.map(([, kind], i) => <g key={i} ref={(el) => { cars.current[i] = el; }} className="rt-car">
      {kind === "engine" ? <>
        <polygon className="rt-beam" points="14,0 60,-18 60,18" />
        <rect x="-13" y="-4" width="30" height="13" rx="5" transform="translate(2.2 3.4)" fill="#000" opacity=".22" /><rect x="-17" y="-1.2" width="3" height="2.4" fill="#2b313c" />
        <rect x="-15" y="-6.5" width="30" height="13" rx="4.5" fill="var(--brand)" /><rect x="-15" y="-6.5" width="11" height="13" rx="3" fill="var(--brand-hover)" />
        <rect x="-3" y="-4.6" width="17" height="9.2" rx="4" fill="var(--brand-2)" /><rect x="-13" y="-0.8" width="27" height="1.6" fill="var(--gold)" /><circle cx="2" cy="0" r="2.1" fill="var(--gold)" /><circle cx="9" cy="0" r="2.7" fill="#1d2230" /><circle cx="9" cy="0" r="1.3" fill="#6b7585" />
        <rect x="-12" y="-4" width="6" height="8" rx="1.5" fill="#1d2230" opacity=".55" /><circle className="rt-lamp" cx="15" cy="-3.4" r="1.7" fill="#fff3b0" /><circle className="rt-lamp" cx="15" cy="3.4" r="1.7" fill="#fff3b0" />
        <g className="rt-smoke"><circle cx="9" cy="0" r="3" /><circle cx="9" cy="0" r="3" /><circle cx="9" cy="0" r="3" /></g></>
      : <><rect x="-9.5" y="-4" width="23" height="12" rx="3" transform="translate(2.2 3.4)" fill="#000" opacity=".22" /><rect x="11" y="-1.1" width="4.5" height="2.2" fill="#2b313c" />
        <rect x="-11.5" y="-6" width="23" height="12" rx="3" fill="var(--brand-2)" /><rect x="-9.5" y="-4" width="19" height="8" rx="2" fill="var(--brand-soft)" /><path d="M-4 -4v8M2 -4v8M8 -4v8" stroke="var(--brand-2)" strokeWidth="1.2" opacity=".7" /></>}
    </g>)}
  </g>;
}

type TFn = (k: string, v?: any) => string;

/* ------------------------------------------------------------------ one subject's line (the map), or every subject on one long line */
/** One stretch of a long map: a subject with its own look (theme) and its number of stops. */
type Part = { id: string; name: string; theme: Theme; count: number };
function Line({ s, stops, here, complete, spot, active, lid, open, t, sel, setSel, theme, parts }: { s: any; stops: Stop[]; here: boolean; complete: boolean; spot: { idx: number; held: boolean } | null; active: boolean; lid: string | null; open: (l: any) => void; t: TFn; sel: string | null; setSel: (k: string | null) => void; theme: Theme; parts?: Part[] }) {
  const n = stops.length, geo = useMemo(() => makeGeo(n), [n]), trail = useRef<SVGGElement>(null);
  const bands = useMemo(() => (parts ? bandsFor(geo, parts.map((p) => p.count)) : null), [geo, parts]);
  const scenes = useMemo(() => (parts && bands ? parts.map((p, k) => scenery(geo, p.id, p.theme, bands[k], true)) : [scenery(geo, s.id, theme)]), [geo, s.id, theme, parts, bands]);
  const target = !active ? null : here && spot ? geo.nodes[spot.idx].s - 34 : complete ? geo.nodes[n - 1].s + 56 : null;
  // the train rolls in on the last stretch (a run-up before the previous stop), so opening a subject always shows it arriving
  const [from] = useState(() => (here && spot ? Math.max(-70, (spot.idx > 0 ? geo.nodes[spot.idx - 1].s - 34 : -70) - 60) : complete ? Math.max(-70, geo.nodes[n - 1].s - 240) : -70));
  const held = here && !!spot?.held, arriveAt = here && spot ? spot.idx : complete ? n - 1 : -1;
  const [arrived, setArrived] = useState(-1); const tm = useRef(0);
  useEffect(() => () => clearTimeout(tm.current), []);
  const onArrive = () => { setArrived(arriveAt); clearTimeout(tm.current); tm.current = window.setTimeout(() => setArrived(-1), 1500); };
  const segDone = (k: number) => (k === 0 ? here || complete : k === n ? complete : stops[k - 1].done);
  const chosen = stops.findIndex((x) => x.key === sel), cs = chosen >= 0 ? stops[chosen] : null, cp = chosen >= 0 ? geo.nodes[chosen] : null;
  const themeAt = (k: number) => (parts ? parts[k].theme : theme);
  return <div className={`rt-map ${parts ? "long" : ""}`} data-theme={parts ? undefined : theme.id} style={{ aspectRatio: `${W} / ${geo.H}` }}>
    <svg className="rt-svg" viewBox={`0 0 ${W} ${geo.H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {scenes.map((sc, k) => <Country key={k} geo={geo} id={`${s.id}-${k}`} sc={sc} theme={themeAt(k)} />)}
      {geo.segs.map((d, k) => <g key={k} className={`rt-seg ${segDone(k) ? "on" : ""}`}><path d={d} className="b" /><path d={d} className="sl" /><path d={d} className="r1" /><path d={d} className="r2" /></g>)}
      <g ref={trail} className="rt-trail" style={{ strokeDashoffset: 1000 }}><path d={geo.full} pathLength={1000} className="w" /><path d={geo.full} pathLength={1000} className="n" /></g>
      {target !== null && <Train g={geo} target={target} from={from} held={held} trail={trail} onArrive={onArrive} />}
      {scenes.map((sc, k) => <Clouds key={k} sc={sc} theme={themeAt(k)} />)}
    </svg>
    {parts && (() => { let i = 0; return parts.map((p) => { const first = geo.nodes[i], done = stops.slice(i, i + p.count).every((x) => x.done); i += p.count;
      return <div key={p.id} className={`rt-banner ${done ? "done" : ""}`} style={{ top: `${((first.y - 52) / geo.H) * 100}%` }}><span aria-hidden="true">{p.theme.emoji}</span><b>{p.name}</b>{done && <Award size={13} aria-hidden="true" />}</div>; }); })()}
    {stops.map((x, i) => { const p = geo.nodes[i], style = { left: `${(p.x / W) * 100}%`, top: `${(p.y / geo.H) * 100}%`, "--i": parts ? 0 : i } as CSSProperties, isHere = here && spot?.idx === i, on = sel === x.key, ring = arrived === i ? "arrive" : "";
      if (x.kind === "quiz") { const state = x.done ? "clear" : isHere ? "held" : "ahead";
        return <button key={x.key} type="button" style={style} className={`rt-pin rt-tl ${state} ${on ? "sel" : ""} ${ring}`} data-here={isHere || undefined} aria-expanded={on} aria-label={`${x.final ? t("Final quiz") : t("Quiz signal")}: ${x.quiz!.name}`} onClick={() => setSel(on ? null : x.key)}>
          <i className="lamp r" /><i className="lamp y" /><i className="lamp g" /></button>; }
      const l = x.lesson;
      return <button key={x.key} type="button" style={style} className={`rt-pin rt-st-pin ${x.done ? "done" : ""} ${isHere ? "here" : ""} ${l.locked ? "locked" : ""} ${on ? "sel" : ""} ${l.id === lid ? "cur" : ""} ${ring}`} data-here={isHere || undefined} aria-expanded={on} aria-label={`${t("Station {n}", { n: x.n })}: ${l.title}`} onClick={() => setSel(on ? null : x.key)}>
        {x.n}{x.done && <b className="badge"><Check size={11} strokeWidth={4} /></b>}{l.locked && !x.done && <b className="badge lock"><Lock size={10} /></b>}</button>; })}
    {cs && cp && <div className={`rt-pop ${cp.y / geo.H > 0.55 ? "up" : "down"}`} role="dialog" aria-label={cs.kind === "lesson" ? cs.lesson.title : cs.quiz!.name}
      style={{ left: `clamp(124px, ${(cp.x / W) * 100}%, calc(100% - 124px))`, ...(cp.y / geo.H > 0.55 ? { bottom: `calc(${(1 - cp.y / geo.H) * 100}% + 34px)` } : { top: `calc(${(cp.y / geo.H) * 100}% + 34px)` }) }}>
      <button type="button" className="rt-pop-x" aria-label={t("Close")} onClick={() => setSel(null)}><X size={14} /></button>
      {cs.kind === "lesson" ? <>
        <small className="rt-st">{t("Station {n}", { n: cs.n })}{cs.lesson.durationMin ? <> · <Clock size={11} aria-hidden="true" /> {t("{n} min", { n: cs.lesson.durationMin })}</> : null}</small>
        <b className="rt-pop-t">{cs.lesson.title}</b>
        <span className={`rt-pop-s ${cs.done ? "ok" : ""}`}>{cs.done ? <><Check size={13} /> {t("Completed")}</> : cs.lesson.locked ? <><Lock size={12} /> {t("Locked")}</> : here && spot?.idx === chosen ? t("You are here") : t("Not started")}</span>
        <button type="button" className="btn btn-primary btn-sm rt-go" onClick={() => open(cs.lesson)}><PlayCircle size={15} aria-hidden="true" />{t("Open lecture")}</button></>
      : <>
        <small className="rt-st">{cs.final ? t("Final quiz") : t("Quiz signal")}</small><b className="rt-pop-t"><ClipboardCheck size={14} aria-hidden="true" /> {cs.quiz!.name}</b>
        <span className={`rt-pop-s ${cs.done ? "ok" : here && spot?.idx === chosen ? "hold" : ""}`}>{cs.done ? <><Check size={13} /> {t("Quiz cleared")}</> : here && spot?.idx === chosen ? t("Train on hold") : t("Upcoming")}</span>
        {active ? <Link className={`btn btn-sm rt-go ${cs.done ? "" : "btn-primary"}`} to={`/exam/${cs.quiz!.id}`}>{cs.done ? <><RotateCcw size={14} aria-hidden="true" />{t("Retake quiz")}</> : t("Start quiz")}</Link>
          : <span className="sub row" style={{ gap: 6 }}><Lock size={13} aria-hidden="true" />{t("Enroll to take this quiz.")}</span>}</>}
    </div>}
  </div>;
}

/** Every subject of the course on ONE long map (each stretch in its own theme). It opens already scrolled to the station where the train stands. */
function JourneyView({ subjects, themes, spot, active, lid, open, t, sel, setSel }: { subjects: any[]; themes: Map<string, Theme>; spot: { subjectId: string; idx: number; held: boolean } | null; active: boolean; lid: string | null; open: (l: any) => void; t: TFn; sel: string | null; setSel: (k: string | null) => void }) {
  const items = useMemo(() => subjects.map((s) => ({ s, stops: buildStops(s) })).filter((x) => x.stops.length), [subjects]);
  const parts = useMemo<Part[]>(() => items.map(({ s, stops }) => ({ id: s.id, name: s.name, theme: themes.get(s.id) ?? themeFor(s), count: stops.length })), [items, themes]);
  const stops = useMemo(() => items.flatMap((x) => x.stops), [items]);
  const at0 = spot ? items.findIndex((x) => x.s.id === spot.subjectId) : -1;
  const gspot = spot && at0 >= 0 ? { idx: items.slice(0, at0).reduce((a, x) => a + x.stops.length, 0) + spot.idx, held: spot.held } : null;
  const complete = stops.length > 0 && stops.every((x) => x.done);
  const box = useRef<HTMLDivElement>(null), first = useRef(true), [shown, setShown] = useState(false);
  const locate = (smooth: boolean) => {
    const b = box.current; if (!b) return; const beh: ScrollBehavior = smooth && !reduced() ? "smooth" : "auto", el = b.querySelector<HTMLElement>("[data-here]");
    if (el) { const r = el.getBoundingClientRect(), c = b.getBoundingClientRect(); b.scrollTo({ top: Math.max(0, b.scrollTop + (r.top - c.top) - b.clientHeight / 2 + 20), behavior: beh }); }
    else if (complete) b.scrollTo({ top: b.scrollHeight, behavior: beh });
  };
  // scroll to the current station once the map is drawn, and again (smoothly) whenever the train moves on
  useEffect(() => { if (!shown) return; const id = window.setTimeout(() => { locate(!first.current); first.current = false; }, first.current ? 80 : 420); return () => clearTimeout(id); }, [shown, gspot?.idx, complete]); // eslint-disable-line
  if (!stops.length) return <p className="sub" style={{ padding: 14 }}>{t("Lessons are coming soon.")}</p>;
  return <div className="rt-journey-wrap">
    <p className="sub route-hint">{t("Every subject on one map. It opens at your station.")}</p>
    <div ref={box} className="rt-journey" tabIndex={0} role="region" aria-label={t("Full journey")}>
      <LazyMount className="rt-wrap" onShow={() => setShown(true)}>
        <Line s={{ id: "journey" }} stops={stops} here={!!gspot} complete={complete} spot={gspot} active={active} lid={lid} open={open} t={t} sel={sel} setSel={setSel} theme={parts[0].theme} parts={parts} />
      </LazyMount>
    </div>
    {(gspot || complete) && <button type="button" className="btn btn-sm rt-locate" onClick={() => locate(true)}><LocateFixed size={15} aria-hidden="true" />{gspot ? t("Where am I") : t("Go to the end")}</button>}
  </div>;
}

/* ------------------------------------------------------------------ the same stops as a plain list */
function StopList({ stops, here, spot, lid, active, open, t }: { stops: Stop[]; here: boolean; spot: { idx: number; held: boolean } | null; lid: string | null; active: boolean; open: (l: any) => void; t: TFn }) {
  return <ol className="rt-list">{stops.map((x, i) => { const isHere = here && spot?.idx === i, st = { "--i": i } as CSSProperties;
    if (x.kind === "quiz") { const state = x.done ? "clear" : isHere ? "held" : "ahead";
      return <li key={x.key} style={st}><div className={`rt-row quiz ${state}`} data-here={isHere || undefined}>
        <span className="rt-row-tl" aria-hidden="true"><i className="lamp r" /><i className="lamp y" /><i className="lamp g" /></span>
        <span className="rt-row-t"><b>{x.quiz!.name}</b><small>{x.final ? t("Final quiz") : t("Quiz signal")} · {x.done ? t("Quiz cleared") : isHere ? t("Train on hold") : t("Upcoming")}</small></span>
        {active ? <Link className={`btn btn-sm ${x.done ? "" : "btn-primary"}`} to={`/exam/${x.quiz!.id}`}>{x.done ? <><RotateCcw size={14} aria-hidden="true" />{t("Retake quiz")}</> : t("Start quiz")}</Link> : <Lock size={14} aria-hidden="true" />}</div></li>; }
    const l = x.lesson;
    return <li key={x.key} style={st}><button type="button" className={`rt-row lesson ${x.done ? "done" : ""} ${isHere ? "here" : ""} ${l.locked ? "locked" : ""} ${l.id === lid ? "cur" : ""}`} data-here={isHere || undefined} onClick={() => open(l)}>
      <span className="rt-row-ico" aria-hidden="true">{x.done ? <Check size={16} strokeWidth={3.5} /> : l.locked ? <Lock size={14} /> : x.n}</span>
      <span className="rt-row-t"><b>{l.title}</b><small>{t("Station {n}", { n: x.n })}{l.durationMin ? <> · <Clock size={11} aria-hidden="true" /> {t("{n} min", { n: l.durationMin })}</> : null}{" · "}{x.done ? t("Completed") : l.locked ? t("Locked") : isHere ? t("You are here") : t("Not started")}</small></span>
      <PlayCircle size={20} aria-hidden="true" className="rt-row-go" /></button></li>; })}</ol>;
}

/* ------------------------------------------------------------------ a subject card (the overview) */
function SubjectCard({ s, i, stops, here, complete, active, onOpen, t, theme }: { s: any; i: number; stops: Stop[]; here: boolean; complete: boolean; active: boolean; onOpen: () => void; t: TFn; theme: Theme }) {
  const lessons = stops.filter((x) => x.kind === "lesson"), quizzes = stops.length - lessons.length, doneAll = stops.filter((x) => x.done).length, pct = stops.length ? Math.round((doneAll / stops.length) * 100) : 0;
  const body = <>
    <span className="rt-sc-no" aria-hidden="true">{complete ? <Check size={20} strokeWidth={3.5} /> : i + 1}</span>
    <span className="rt-sc-body">
      <b className="rt-sc-t"><span className="rt-sc-theme" aria-hidden="true">{theme.emoji}</span>{s.name}{complete && <span className="rt-master"><Award size={11} aria-hidden="true" />{t("Station Master")}</span>}</b>
      <span className="sub">{t("{done} of {total} stations", { done: lessons.filter((x) => x.done).length, total: lessons.length })}{quizzes > 0 ? ` · ${quizzes} ${t("quizzes")}` : ""}</span>
      {stops.length > 0 && <span className="rt-mini" aria-hidden="true">
        <i className="rt-mini-fill" style={{ width: `${pct}%` }} />
        {stops.map((x, k) => x.kind === "quiz" ? <b key={x.key} className={`rt-mini-q ${x.done ? "ok" : ""}`} style={{ left: `${((k + 0.5) / stops.length) * 100}%` }} /> : null)}
        {active && <TrainFront size={15} className={`rt-mini-train ${here ? "run" : ""}`} style={{ left: `${pct}%` }} />}
        <Flag size={12} className="rt-mini-flag" />
      </span>}
    </span>
    <span className="rt-sc-side">{active && <span className={`pill ${complete ? "pill-ok" : here ? "pill-brand" : ""}`}>{complete ? <><Flag size={12} aria-hidden="true" /> {t("Route complete")}</> : here ? t("Running") : t("Upcoming")}</span>}<ChevronRight size={18} className="rt-sc-go" aria-hidden="true" /></span></>;
  const cls = `rt-sc ${complete ? "is-done" : here ? "is-run" : ""}`, st = { "--i": i, "--tc": theme.base } as CSSProperties;
  return stops.length
    ? <button type="button" className={cls} style={st} onClick={onOpen} aria-label={`${s.name} · ${pct}%`}>{body}</button>
    : <div className={`${cls} empty`} style={st}><span className="rt-sc-no" aria-hidden="true">{i + 1}</span><span className="rt-sc-body"><b className="rt-sc-t">{s.name}</b><span className="sub">{t("Lessons are coming soon.")}</span></span></div>;
}

/* ------------------------------------------------------------------ the panel */
export default function CourseRoute({ c, lid, open, t, wide, active }: { c: any; lid: string | null; open: (l: any) => void; t: TFn; wide?: boolean; active: boolean }) {
  const root = useRef<HTMLElement>(null); const prevDone = useRef<number | null>(null); const userNav = useRef(false);
  const subjects: any[] = c.subjects ?? [];
  const subjOfLid: string | null = useMemo(() => subjects.find((s) => (s.lessons ?? []).some((l: any) => l.id === lid))?.id ?? null, [subjects, lid]);
  const [subId, setSubId] = useState<string | null>(subjOfLid ?? (subjects.length === 1 ? subjects[0].id : null));
  const [dir, setDir] = useState<"fwd" | "back">("fwd"); const [sel, setSel] = useState<string | null>(null); const [mode, setMode] = useState<"map" | "list">("map"); const [view, setView] = useState<"subjects" | "journey">("subjects");
  const themes = useMemo(() => new Map<string, Theme>(subjects.map((x) => [x.id, themeFor(x)])), [subjects]);
  const masters = useMemo(() => subjects.filter((x) => { const st = buildStops(x); return st.length > 0 && st.every((y) => y.done); }).map((x) => x.id), [subjects]); const prevMasters = useRef<Set<string> | null>(null);
  const spot = useMemo(() => (active ? trainSpot(subjects) : null), [subjects, active]);
  const stats = useMemo(() => { let total = 0, done = 0; for (const s of subjects) for (const x of buildStops(s)) { total++; if (x.done) done++; } return { total, done }; }, [subjects]);
  const single = subjects.length === 1;
  const go = (id: string) => { userNav.current = true; setDir("fwd"); setSel(null); setSubId(id); };
  const back = () => { userNav.current = true; setDir("back"); setSel(null); setSubId(null); };

  // Playing a lecture of another subject (Next lesson, a link) brings that subject's route up.
  useEffect(() => { if (subjOfLid && subjOfLid !== subId) { setDir("fwd"); setSel(null); setSubId(subjOfLid); } }, [subjOfLid]); // eslint-disable-line

  // The train rolls on whenever one more stop gets done: say so, and celebrate when a whole subject is finished (Station Master badge) or the whole route is.
  useEffect(() => {
    if (!active) return; const before = prevDone.current; prevDone.current = stats.done; const pm = prevMasters.current; prevMasters.current = new Set(masters); if (before === null || stats.done <= before) return;
    const fresh = pm ? masters.filter((id) => !pm.has(id)) : [];
    if (!spot) { window.setTimeout(() => sfx("master"), 650); confetti(110); toast(t("Route complete! You reached the last station. 🎉"), "ok"); return; }
    if (fresh.length) { const m = subjects.find((x) => x.id === fresh[0]); window.setTimeout(() => sfx("master"), 650); confetti(140, { x: 0.5, y: 0.3 }); toast(t("Station Master badge earned: {name}", { name: m?.name ?? "" }), "ok"); return; }
    const s = subjects.find((x) => x.id === spot.subjectId), first = s ? buildStops(s).findIndex((x) => !x.done) === 0 : false;
    if (first) confetti(70, { x: 0.5, y: 0.3 });
    toast(spot.held ? t("Quiz signal ahead. Train is on hold.") : t("Train departing for Station {n}", { n: spot.stop.n }), "info");
  }, [stats.done]); // eslint-disable-line

  // Escape or a tap outside closes the lecture card.
  useEffect(() => {
    if (!sel) return; const key = (e: KeyboardEvent) => e.key === "Escape" && setSel(null), tap = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".rt-pin, .rt-pop")) setSel(null); };
    window.addEventListener("keydown", key); document.addEventListener("click", tap); return () => { window.removeEventListener("keydown", key); document.removeEventListener("click", tap); };
  }, [sel]);

  // Bring the right part into view after a view change: the top of the list, or the station where the train stands (inside the side list only, so the page itself does not jump).
  useEffect(() => {
    const box = root.current; if (!box) return; const beh: ScrollBehavior = reduced() ? "auto" : "smooth";
    if (!subId && view === "journey") return;
    if (!subId) { if (!userNav.current) return; if (wide) { if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start", behavior: beh }); } else box.scrollTo({ top: 0, behavior: beh }); return; }
    const id = window.setTimeout(() => {
      const el = box.querySelector<HTMLElement>("[data-here]"); if (!el) { if (userNav.current && !wide) box.scrollTo({ top: 0, behavior: beh }); return; }
      if (wide) { if (userNav.current) el.scrollIntoView({ block: "center", behavior: beh }); return; }
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(); box.scrollTo({ top: box.scrollTop + (r.top - b.top) - box.clientHeight / 2 + 40, behavior: beh });
    }, 420);
    return () => clearTimeout(id);
  }, [wide, subId, mode, view, spot?.stop.key]);

  const sub = subjects.find((x) => x.id === subId) ?? null;
  const renderSubject = (s: any) => {
    const stops = buildStops(s), complete = stops.length > 0 && stops.every((x) => x.done), here = spot?.subjectId === s.id, lessons = stops.filter((x) => x.kind === "lesson"), pct = stops.length ? (stops.filter((x) => x.done).length / stops.length) * 100 : 0;
    const sp = here && spot ? { idx: spot.idx, held: spot.held } : null;
    return <>
      <div className="rt-subhead">
        {!single && <button type="button" className="rt-back" onClick={back} aria-label={t("Back to subjects")}><ArrowLeft size={16} aria-hidden="true" /><span>{t("Subjects")}</span></button>}
        <div className="rt-subhead-t"><b>{s.name}</b><span className="sub">{t("{done} of {total} stations", { done: lessons.filter((x) => x.done).length, total: lessons.length })}</span></div>
        {active && <span className={`pill ${complete ? "pill-ok" : here ? "pill-brand" : ""}`}>{complete ? <><Flag size={12} aria-hidden="true" /> {t("Route complete")}</> : here ? t("Running") : t("Upcoming")}</span>}
      </div>
      {active && stops.length > 0 && <div className="rt-subprog route-prog" role="progressbar" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={stops.filter((x) => x.done).length} aria-label={t("Progress")}><i style={{ width: `${pct}%` }} /></div>}
      {stops.length ? <>
        <div className="rt-tabs" role="group" aria-label={t("Lectures")}>
          <button type="button" className={mode === "map" ? "on" : ""} aria-pressed={mode === "map"} onClick={() => setMode("map")}><MapIcon size={15} aria-hidden="true" />{t("Map")}</button>
          <button type="button" className={mode === "list" ? "on" : ""} aria-pressed={mode === "list"} onClick={() => setMode("list")}><ListOrdered size={15} aria-hidden="true" />{t("List")}</button>
        </div>
        {mode === "map" ? <><p className="sub route-hint">{t("Tap a station to see its lecture.")}</p><LazyMount key={s.id} className="rt-wrap"><Line s={s} stops={stops} here={here} complete={complete} spot={sp} active={active} lid={lid} open={open} t={t} sel={sel} setSel={setSel} theme={themes.get(s.id) ?? themeFor(s)} /></LazyMount></>
          : <StopList stops={stops} here={here} spot={sp} lid={lid} active={active} open={open} t={t} />}</>
        : <p className="sub" style={{ padding: 14 }}>{t("Lessons are coming soon.")}</p>}
    </>;
  };

  return <aside ref={root} className={`card curriculum route ${wide ? "wide" : ""}`} aria-label={t("Course content")}>
    <div className="curr-head route-head">
      <div style={{ minWidth: 0 }}><b>{t("Course route")}</b><span className="sub" style={{ display: "block" }}>{c.lessonCount} {t("lessons")}{c.enrollment === "ACTIVE" ? ` · ${c.progress}%` : ""}</span></div>
      {active && masters.length > 0 && <span className="pill pill-ok rt-masterpill"><Award size={12} aria-hidden="true" />{masters.length} {t("Station Master")}</span>}
      {active && stats.total > 0 && <div className="route-prog" role="progressbar" aria-valuemin={0} aria-valuemax={stats.total} aria-valuenow={stats.done} aria-label={t("Progress")}><i style={{ width: `${(stats.done / stats.total) * 100}%` }} /></div>}
    </div>
    {subjects.length ? <div key={sub?.id ?? "all"} className={`rt-view ${dir}`}>
      {sub ? renderSubject(sub) : <>
        {subjects.length > 1 && <div className="rt-tabs" role="group" aria-label={t("View")}>
          <button type="button" className={view === "subjects" ? "on" : ""} aria-pressed={view === "subjects"} onClick={() => setView("subjects")}><ListOrdered size={15} aria-hidden="true" />{t("Subjects")}</button>
          <button type="button" className={view === "journey" ? "on" : ""} aria-pressed={view === "journey"} onClick={() => { setSel(null); setView("journey"); }}><RouteIcon size={15} aria-hidden="true" />{t("Full journey")}</button>
        </div>}
        {view === "journey" && subjects.length > 1 ? <JourneyView subjects={subjects} themes={themes} spot={spot ? { subjectId: spot.subjectId, idx: spot.idx, held: spot.held } : null} active={active} lid={lid} open={open} t={t} sel={sel} setSel={setSel} /> : <>
        <p className="sub route-hint">{t("Choose a subject to see its lectures.")}</p>
        {spot && (() => { const rs = subjects.find((x) => x.id === spot.subjectId); return rs ? <button type="button" className="rt-resume" onClick={() => go(rs.id)}><span className="rt-resume-ico" aria-hidden="true"><TrainFront size={20} /></span>
          <span className="rt-resume-t"><small>{t("Continue where you stopped")}</small><b>{rs.name} · {spot.stop.kind === "lesson" ? t("Station {n}", { n: spot.stop.n }) : t("Quiz signal")}</b></span><ChevronRight size={18} aria-hidden="true" /></button> : null; })()}
        <div className="rt-grid">{subjects.map((s, i) => { const stops = buildStops(s), complete = stops.length > 0 && stops.every((x) => x.done);
          return <SubjectCard key={s.id} s={s} i={i} stops={stops} here={spot?.subjectId === s.id} complete={complete} active={active} onOpen={() => go(s.id)} t={t} theme={themes.get(s.id) ?? themeFor(s)} />; })}</div></>}</>}
    </div> : <p className="sub" style={{ padding: 14 }}>{t("Lessons are coming soon.")}</p>}
  </aside>;
}
