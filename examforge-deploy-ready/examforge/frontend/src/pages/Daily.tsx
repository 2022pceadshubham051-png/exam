import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Flame, Play, Trophy, Share2, Swords, Snowflake, Users } from "lucide-react";
import Shell from "../components/Shell"; import SubNav from "../components/SubNav"; import { PageHeader, SkeletonRows, toast } from "../components/ui"; import { QuizPlayer, QuizReview } from "../components/QuizPlayer";
import { api, fmt } from "../lib/api"; import { shareText, myInviteCode, inviteLink, type StreakInfo, type PlayQ, type Answer, type ReviewRow } from "../lib/engage"; import { sfx } from "../lib/game"; import { refreshCoins } from "../lib/profile"; import { useT } from "../lib/i18n";

type Summary = { score: number; correct: number; incorrect: number; unanswered: number; total: number; timeSec: number; late: boolean; rank: number | null };
type Day = { day: string; count: number; durationSec: number; streak: StreakInfo; players: number; status: "new" | "playing" | "done"; summary?: Summary; review?: ReviewRow[]; coins?: number };

export const StreakBadge = ({ s }: { s: StreakInfo }) => { const t = useT(); return <span className={`eg-flame ${s.current ? "" : "off"}`} aria-label={`${s.current} ${t("day streak")}`}><Flame size={20} aria-hidden="true" />{s.current} <span className="sub" style={{ fontWeight: 500 }}>{t("day streak")}</span>{s.atRisk && !s.doneToday && <span className="eg-risk">{s.coveredByFreeze ? t("Freeze ready") : t("Practise today or the streak breaks")}</span>}</span>; };

export default function Daily() {
  const t = useT();
  const [d, setD] = useState<Day | null>(null), [err, setErr] = useState(""), [play, setPlay] = useState<{ questions: PlayQ[]; remainingSec: number } | null>(null), [busy, setBusy] = useState(false), [board, setBoard] = useState<any>(null), [code, setCode] = useState<string | null>(null);
  useEffect(() => { api<Day>("/daily").then(setD).catch((e) => setErr(e.message)); void myInviteCode().then(setCode); }, []);
  useEffect(() => { if (d?.status === "done") api("/daily/leaderboard").then(setBoard).catch(() => {}); }, [d?.status]);
  const start = async () => { setBusy(true); setErr(""); try { const r = await api<any>("/daily/start", "POST", {}); setPlay({ questions: r.questions, remainingSec: r.remainingSec }); sfx("pop"); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const submit = async (answers: Answer[]) => {
    setBusy(true);
    try { const r = await api<any>("/daily/submit", "POST", { answers }); setPlay(null); setD({ ...(d as Day), status: "done", summary: r.summary, review: r.review, coins: r.coins, streak: r.streak }); void refreshCoins(); sfx("win"); if (r.streak?.milestoneCoins) toast(t("{n}-day streak! +{c} coins", { n: r.streak.current, c: r.streak.milestoneCoins }), "ok"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  if (err && !d) return <Shell narrow><div className="alert alert-bad" role="alert">{err}</div></Shell>;
  if (!d) return <Shell narrow><SkeletonRows rows={4} /></Shell>;
  if (play) return <Shell narrow><div className="stack" style={{ gap: 14 }}><h1 className="h1" style={{ fontSize: "1.3rem" }}>{t("Daily Challenge")}</h1>{err && <div className="alert alert-bad" role="alert">{err}</div>}<QuizPlayer questions={play.questions} remainingSec={play.remainingSec} onSubmit={submit} busy={busy} /></div></Shell>;
  const sm = d.summary;
  const share = async () => {
    const link = inviteLink(code);
    const text = sm ? t("I got {c}/{n} right in today's ExamForge Daily Challenge{rank}{streak}! Try it: {link}", { c: sm.correct, n: sm.total, link, rank: sm.rank ? t(" (rank #{r})", { r: sm.rank }) : "", streak: d.streak.current > 1 ? t(", {s}-day streak 🔥", { s: d.streak.current }) : "" }) : link;
    await shareText(text);
  };
  return <Shell narrow><div className="stack stagger" style={{ gap: 18 }}>
    <SubNav group="practice" />
    <PageHeader title={t("Daily Challenge")} sub={t("10 questions a day, 10 minutes. The same for every student, so you get a rank too.")} />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    <section className="eg-hero"><div className="row between" style={{ flexWrap: "wrap", gap: 10 }}><StreakBadge s={d.streak} />{d.streak.freezes > 0 && <span className="pill"><Snowflake size={13} aria-hidden="true" /> {t("{n} freeze", { n: d.streak.freezes })}</span>}</div>
      {d.status !== "done" ? <>
        <div><div className="eg-big">{d.count} <small style={{ fontSize: "1rem", fontWeight: 600 }}>{t("questions · {m} min", { m: Math.round(d.durationSec / 60) })}</small></div><p className="sub row" style={{ gap: 6, marginTop: 6 }}><Users size={14} aria-hidden="true" />{t("{n} students finished today", { n: d.players })}</p></div>
        <button className="btn btn-primary btn-lg" onClick={start} disabled={busy}><Play size={18} aria-hidden="true" />{d.status === "playing" ? t("Resume challenge") : t("Start challenge")}</button>
        {d.status === "playing" && <p className="sub">{t("Your clock is running. Reloading the page does not give you extra time.")}</p>}
        <p className="sub"><Link to="/shop">{t("Get a Streak Freeze")}</Link> {t("so one missed day will not break your streak.")}</p>
      </> : sm && <>
        <div className="eg-vs"><div><div className="eg-big">{sm.correct}<small style={{ fontSize: "1.1rem" }}>/{sm.total}</small></div><span className="sub">{t("correct")}</span></div><div><div className="eg-big">{sm.rank ? `#${sm.rank}` : "–"}</div><span className="sub">{sm.late ? t("late (not ranked)") : t("today's rank")}</span></div><div><div className="eg-big">{fmt(sm.timeSec)}</div><span className="sub">{t("time")}</span></div></div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className="pill pill-ok">{t("Score")} {sm.score}</span>{d.coins ? <span className="pill pill-warn">{t("+{n} coins", { n: d.coins })}</span> : null}<span className="pill">{t("{a} wrong · {b} skipped", { a: sm.incorrect, b: sm.unanswered })}</span></div>
        <div className="eg-share"><button className="btn btn-wa" onClick={share}><Share2 size={16} aria-hidden="true" />{t("Share on WhatsApp")}</button><Link className="btn" to="/duel"><Swords size={16} aria-hidden="true" />{t("Invite a friend to a duel")}</Link></div>
        <p className="sub">{t("A new challenge arrives tomorrow. Come back to grow your streak!")}</p>
      </>}
    </section>
    {d.status === "done" && board && <section className="card card-pad stack" style={{ gap: 6 }}><h2 className="card-title row" style={{ gap: 8 }}><Trophy size={18} aria-hidden="true" />{t("Today's top students")}</h2>
      {board.rows.length ? board.rows.slice(0, 10).map((r: any) => <div key={r.rank} className={`eg-rank ${r.isMe ? "me" : ""}`}><span>{r.rank}</span><span style={{ flex: 1 }}>{r.title ? `${r.title} ` : ""}{r.name}{r.isMe ? ` ${t("(you)")}` : ""}</span><span>{r.correct}/{d.count}</span><span className="sub">{fmt(r.timeSec)}</span></div>) : <p className="sub">{t("Nobody yet.")}</p>}</section>}
    {d.status === "done" && d.review && <section className="stack" style={{ gap: 10 }}><h2 className="card-title">{t("Answers")}</h2><QuizReview rows={d.review} /></section>}
  </div></Shell>;
}
