import { useEffect, useMemo, useRef, useState } from "react"; import { Link } from "react-router-dom"; import { BookMarked, Check, Flame, ArrowRight } from "lucide-react";
import Shell from "../components/Shell"; import SubNav from "../components/SubNav"; import { Empty, PageHeader } from "../components/ui"; import DoubtButton from "../components/DoubtButton";
import { api } from "../lib/api"; import { sessionCards, review, addRevisedToday, countMastered, allNotes, ingestReview, type Note } from "../lib/notebook"; import { DAILY_CAP, type Grade } from "../lib/srs";
import { useT } from "../lib/i18n"; import { refreshCoins } from "../lib/profile"; import { sfx } from "../lib/game"; import type { StreakInfo } from "../lib/engage";

/** Daily revision round: up to 15 due mistakes, mixed across topics. Pick an answer first (active recall), then rate how easy it was. */
export default function Revise() {
  const t = useT(); const [ready, setReady] = useState(false), [queue, setQueue] = useState<Note[]>([]), [pick, setPick] = useState<string | null>(null), [shown, setShown] = useState(false);
  const [stats, setStats] = useState({ done: 0, right: 0 }), [finished, setFinished] = useState(false), [reward, setReward] = useState<{ coins: number; streak: StreakInfo } | null>(null), [total, setTotal] = useState(0);
  const retries = useRef<Record<string, number>>({});
  useEffect(() => {
    let off = false;
    // Pull in mistakes from the latest attempts first, so nothing you got wrong is missing from today's round.
    (async () => {
      try { const h = await api("/history"); for (const a of (Array.isArray(h) ? h : []).filter((x: any) => x.result && !x.resultHidden).slice(0, 5)) { const d = await api(`/attempts/${a.id}/review`).catch(() => null); if (d && !off) ingestReview(d); } } catch { /* offline: use what is stored */ }
      if (!off) { const s = sessionCards(); setQueue(s); setTotal(s.length); setReady(true); }
    })();
    return () => { off = true; };
  }, []);
  const cur = queue[0], answered = pick !== null || shown, correct = cur?.correctKey && pick ? pick === cur.correctKey : null;
  const canPick = !!cur?.correctKey;
  const finish = async (n: number) => {
    setFinished(true); sfx("win");
    try { const r = await api<{ coins: number; streak: StreakInfo }>("/revision/claim", "POST", { count: Math.max(1, n) }); setReward(r); void refreshCoins(); } catch { /* the round still counts locally */ }
  };
  const grade = (g: Grade) => {
    if (!cur) return;
    review(cur.key, g); const n = addRevisedToday(); setStats((s) => ({ done: s.done + 1, right: s.right + (g === "again" ? 0 : 1) }));
    let rest = queue.slice(1);
    // A forgotten card comes back once more in this same round (after a few other cards), so it is seen twice before you leave.
    if (g === "again" && (retries.current[cur.key] = (retries.current[cur.key] ?? 0) + 1) <= 1) { const at = Math.min(3, rest.length); rest = [...rest.slice(0, at), cur, ...rest.slice(at)]; }
    setQueue(rest); setPick(null); setShown(false);
    if (!rest.length) void finish(n);
  };
  const mastered = useMemo(() => countMastered(), [finished]), left = allNotes().filter((n) => n.kind === "mistake" && n.due > Date.now()).length;

  if (!ready) return <Shell narrow><div className="stack"><SubNav group="me" /><PageHeader title={t("Revision")} /><p className="sub" role="status">{t("Collecting your mistakes…")}</p></div></Shell>;
  if (finished) return <Shell narrow><div className="stack stagger" style={{ gap: 18 }}><SubNav group="me" /><PageHeader title={t("Revision complete!")} />
    <section className="eg-hero"><div className="eg-vs"><div><div className="eg-big">{stats.done}</div><span className="sub">{t("cards revised")}</span></div><Check size={22} aria-hidden="true" /><div><div className="eg-big">{stats.done ? Math.round((stats.right / stats.done) * 100) : 0}%</div><span className="sub">{t("remembered")}</span></div></div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{reward?.coins ? <span className="pill pill-warn">{t("+{n} coins", { n: reward.coins })}</span> : null}{reward && <span className="eg-flame"><Flame size={18} aria-hidden="true" />{reward.streak.current} {t("day streak")}</span>}<span className="pill">{t("{n} mastered", { n: mastered })}</span></div>
      <p className="sub">{t("Next revision: {n} cards are due in the coming days. Come back tomorrow!", { n: left })}</p>
      <div className="row" style={{ gap: 8 }}><Link className="btn btn-primary" to="/daily">{t("Daily Challenge")} <ArrowRight size={16} aria-hidden="true" /></Link><Link className="btn" to="/notebook">{t("Mistake notebook")}</Link></div></section></div></Shell>;
  if (!cur) return <Shell narrow><div className="stack"><SubNav group="me" /><PageHeader title={t("Revision")} sub={t("Mistakes come back after 1, 3, 7, 14 and 30 days until you remember them.")} />
    <Empty icon={<BookMarked size={32} />} title={t("Nothing due today")}>{left ? t("{n} cards will come back in the next few days.", { n: left }) : t("Take a test and your wrong answers will appear here automatically.")} <Link to="/dashboard">{t("Practice")}</Link></Empty></div></Shell>;

  const prog = Math.round((stats.done / Math.max(total, stats.done + queue.length)) * 100);
  return <Shell narrow><div className="stack" style={{ gap: 16 }}>
    <SubNav group="me" />
    <div className="row between"><span className="pill pill-brand">{cur.topic ?? cur.testName}</span><span className="sub">{t("{n} left · daily goal {g}", { n: queue.length, g: DAILY_CAP })}</span></div>
    <div className="bar" role="progressbar" aria-valuenow={prog} aria-valuemin={0} aria-valuemax={100} aria-label={t("Round progress")}><i style={{ width: `${prog}%` }} /></div>
    <article className="card card-pad stack" style={{ gap: 14 }}>
      <p className="eg-q">{cur.text}</p>
      <div className="stack" style={{ gap: 8 }}>{cur.options.map((o) => { const right = answered && canPick && o.key === cur.correctKey, bad = answered && canPick && pick === o.key && o.key !== cur.correctKey;
        return <button key={o.key} type="button" disabled={answered || !canPick} className={`eg-opt ${right ? "right" : bad ? "bad" : ""}`} onClick={() => { setPick(o.key); sfx(o.key === cur.correctKey ? "right" : "wrong"); }}><b>{o.key}</b><span>{o.text}</span></button>; })}</div>
      {!canPick && !shown && <button className="btn btn-primary btn-lg" onClick={() => setShown(true)}>{t("Show answer")}</button>}
      {answered && <>
        {correct !== null && <p className={correct ? "ans good" : "ans badc"} role="status" style={{ margin: 0 }}>{correct ? t("Correct!") : t("Wrong. The right answer is {k}", { k: cur.correctKey ?? "" })}</p>}
        {!canPick && <p className="ans good" style={{ margin: 0 }}>{t("Open this test's Review so the correct answer is filled in here.")}</p>}
        {cur.explanation && <p className="sub">{cur.explanation}</p>}
        <DoubtButton text={cur.text} options={cur.options} correctKey={cur.correctKey} selectedKey={pick} explanation={cur.explanation} topic={cur.topic} />
        {correct === false ? <button className="btn btn-primary btn-lg" onClick={() => grade("again")}>{t("Got it, next")} <ArrowRight size={16} aria-hidden="true" /></button>
          : <div className="eg-grades" role="group" aria-label={t("How easy was it?")}><button className="btn btn-lg" onClick={() => grade("hard")}>{t("Hard")}<small>{t("back sooner")}</small></button><button className="btn btn-ok btn-lg" onClick={() => grade("good")}>{t("Good")}<small>{t("normal gap")}</small></button><button className="btn btn-lg" onClick={() => grade("easy")}>{t("Easy")}<small>{t("longer gap")}</small></button>
            {!canPick && <button className="btn btn-danger btn-lg" style={{ gridColumn: "1 / -1" }} onClick={() => grade("again")}>{t("I did not remember")}</button>}</div>}
      </>}
    </article>
  </div></Shell>;
}
