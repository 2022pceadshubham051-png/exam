import { useEffect, useState } from "react"; import { Link, useNavigate, useParams } from "react-router-dom";
import { Swords, Share2, Copy, RefreshCw, Trophy, Play } from "lucide-react";
import Shell from "../components/Shell"; import SubNav from "../components/SubNav"; import { Empty, PageHeader, SkeletonRows, toast } from "../components/ui"; import { QuizPlayer, QuizReview } from "../components/QuizPlayer";
import { useT } from "../lib/i18n"; import { api, fmt } from "../lib/api"; import { shareText, myInviteCode, type PlayQ, type Answer, type ReviewRow } from "../lib/engage"; import { sfx } from "../lib/game"; import { refreshCoins } from "../lib/profile";

const duelLink = (code: string, ref: string | null) => `${location.origin}/duel/${code}${ref ? `?ref=${ref}` : ""}`;

/** /duel — start a new duel or open an old one. */
export default function Duels() {
  const t = useT(); const nav = useNavigate(); const [list, setList] = useState<any[] | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { api("/duels").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setList([]); }); }, []);
  const create = async (count: 5 | 10) => { setBusy(true); setErr(""); try { const r = await api<any>("/duels", "POST", { count }); nav(`/duel/${r.code}`); } catch (e: any) { setErr(e.message); setBusy(false); } };
  const tag = (d: any) => (d.state === "done" ? (d.winner === "me" ? <span className="pill pill-ok">{t("You won 🏆")}</span> : d.winner === "opponent" ? <span className="pill pill-bad">{t("You lost")}</span> : <span className="pill">{t("Tie")}</span>) : !d.finished ? <span className="pill pill-warn">{t("Your turn")}</span> : <span className="pill">{t("Waiting for your friend")}</span>);
  return <Shell narrow><div className="stack stagger" style={{ gap: 18 }}>
    <SubNav group="practice" />
    <PageHeader title={t("Duel")} sub={t("Challenge a friend on the same questions. Each of you plays in your own time and the server compares the results. The winner gets 25 coins.")} />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    <section className="eg-hero"><b>{t("New duel")}</b><div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
      <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => create(5)}><Swords size={18} aria-hidden="true" />{t("Quick duel · 5 Q · 5 min")}</button>
      <button className="btn btn-lg" disabled={busy} onClick={() => create(10)}>{t("Long duel · 10 Q · 10 min")}</button></div>
      <p className="sub">{t("You play first, then send the link to your friend on WhatsApp.")}</p></section>
    {!list ? <SkeletonRows rows={3} /> : list.length ? <div className="stack" style={{ gap: 10 }}>{list.map((d) => <Link key={d.code} to={`/duel/${d.code}`} className="card card-pad row between tap-card"><div><b>{d.opponent ? `${t("vs")} ${d.opponent}` : t("Waiting for an opponent")}</b><p className="sub" style={{ margin: 0 }}>{d.count} {t("Q")} · {d.code}</p></div>{tag(d)}</Link>)}</div>
      : <Empty icon={<Swords size={32} />} title={t("No duels yet")}>{t("Start a new duel above.")}</Empty>}
  </div></Shell>;
}

type View = { code: string; count: number; durationSec: number; creator: string; iAmCreator: boolean; expired: boolean; state: "waiting" | "playing" | "done"; me: { joined: boolean; finished: boolean }; results: null | { me: any; opponent: any; opponentName: string | null; winner: "me" | "opponent" | "tie" | null; reason: string | null } };

/** /duel/:code — accept, play, and see the result. */
export function DuelPlay() {
  const t = useT(); const { code = "" } = useParams(); const [v, setV] = useState<View | null>(null), [err, setErr] = useState(""), [play, setPlay] = useState<{ questions: PlayQ[]; remainingSec: number } | null>(null), [busy, setBusy] = useState(false), [review, setReview] = useState<ReviewRow[] | null>(null), [ref, setRef] = useState<string | null>(null), [gain, setGain] = useState(0);
  const load = () => api<View>(`/duels/${code}`).then(setV).catch((e) => setErr(e.message));
  useEffect(() => { void load(); void myInviteCode().then(setRef); }, [code]); // eslint-disable-line
  // While waiting for the friend, check every 12s (only while the tab is visible).
  useEffect(() => { if (!v?.me.finished || v.state === "done") return; const t = setInterval(() => { if (!document.hidden) void load(); }, 12_000); return () => clearInterval(t); }, [v?.me.finished, v?.state]); // eslint-disable-line
  useEffect(() => { if (v?.me.finished && !review) api<any>(`/duels/${code}/review`).then((r) => setReview(r.review)).catch(() => {}); }, [v?.me.finished]); // eslint-disable-line
  const join = async () => { setBusy(true); setErr(""); try { const r = await api<any>(`/duels/${code}/join`, "POST", {}); setPlay({ questions: r.questions, remainingSec: r.remainingSec }); sfx("pop"); } catch (e: any) { setErr(e.message); void load(); } finally { setBusy(false); } };
  const submit = async (answers: Answer[]) => { setBusy(true); try { const r = await api<any>(`/duels/${code}/submit`, "POST", { answers }); setPlay(null); setReview(r.review); setGain(r.coins ?? 0); setV(r); void refreshCoins(); sfx(r.results?.winner === "me" ? "win" : "pop"); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const link = duelLink(code, ref), min = v ? Math.round(v.durationSec / 60) : 5;
  const invite = () => shareText(t("I challenge you to an ExamForge duel! ⚔️ {n} questions, {m} minutes. Accept and see who wins: {link}", { n: v?.count ?? 5, m: min, link }));
  if (err && !v) return <Shell narrow><div className="alert alert-bad" role="alert">{err}</div><p><Link to="/duel">{t("Duel")}</Link></p></Shell>;
  if (!v) return <Shell narrow><SkeletonRows rows={3} /></Shell>;
  if (play) return <Shell narrow><div className="stack" style={{ gap: 14 }}><h1 className="h1" style={{ fontSize: "1.3rem" }}>{t("Duel")} · {code}</h1>{err && <div className="alert alert-bad" role="alert">{err}</div>}<QuizPlayer questions={play.questions} remainingSec={play.remainingSec} onSubmit={submit} busy={busy} /></div></Shell>;
  const r = v.results, w = r?.winner;
  return <Shell narrow><div className="stack stagger" style={{ gap: 18 }}>
    <SubNav group="practice" />
    <PageHeader title={`${t("Duel")} ${v.code}`} sub={t("{n} questions · {m} minutes", { n: v.count, m: min })} />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {v.expired && <div className="alert alert-bad">{t("This duel link has expired. Ask your friend for a new one.")}</div>}
    {!v.me.joined && !v.expired && <section className="eg-hero"><h2 className="card-title" style={{ fontSize: "1.3rem" }}>{t("{name} challenged you! ⚔️", { name: v.creator })}</h2><p className="sub">{t("{n} questions, {m} minutes. The clock starts as soon as you begin. You will see your friend's score after you finish.", { n: v.count, m: min })}</p><button className="btn btn-primary btn-lg" disabled={busy} onClick={join}><Play size={18} aria-hidden="true" />{t("Accept the challenge")}</button></section>}
    {v.me.joined && !v.me.finished && <section className="eg-hero"><p className="sub">{t("It is your turn to play.")}</p><button className="btn btn-primary btn-lg" disabled={busy} onClick={join}><Play size={18} aria-hidden="true" />{t("Start / continue playing")}</button></section>}
    {r && <section className="eg-hero">
      {w ? <h2 className="card-title" style={{ fontSize: "1.4rem" }}>{w === "me" ? t("You won! 🏆") : w === "opponent" ? t("{name} won", { name: r.opponentName ?? t("Your friend") }) : t("It is a tie! 🤝")}{r.reason === "time" && w !== "tie" ? ` ${t("(faster time)")}` : ""}</h2> : <h2 className="card-title">{t("Your result is ready")}</h2>}
      <div className="eg-vs"><div className={w === "me" ? "win" : ""}><div className="eg-big">{r.me.correct}</div><span className="sub">{t("You")} · {fmt(r.me.timeSec)}</span></div><Trophy size={22} aria-hidden="true" />{r.opponent ? <div className={w === "opponent" ? "win" : ""}><div className="eg-big">{r.opponent.correct}</div><span className="sub">{r.opponent.name} · {fmt(r.opponent.timeSec)}</span></div> : <div><div className="eg-big">?</div><span className="sub">{r.opponentName ? t("{name} is still playing", { name: r.opponentName }) : t("Waiting for your friend")}</span></div>}</div>
      {gain > 0 && <span className="pill pill-warn" style={{ width: "fit-content" }}>{t("+{n} coins", { n: gain })}</span>}
      {!r.opponent && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button className="btn btn-wa" onClick={invite}><Share2 size={16} aria-hidden="true" />{r.opponentName ? t("Remind your friend") : t("Send the challenge on WhatsApp")}</button><button className="btn" onClick={() => { void navigator.clipboard?.writeText(link); toast(t("Link copied."), "ok"); }}><Copy size={16} aria-hidden="true" />{t("Copy link")}</button><button className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{t("Refresh")}</button></div>}
      {r.opponent && <div className="row" style={{ gap: 8 }}><Link className="btn btn-primary" to="/duel"><Swords size={16} aria-hidden="true" />{t("Rematch / new duel")}</Link></div>}
    </section>}
    {review && <section className="stack" style={{ gap: 10 }}><h2 className="card-title">{t("Answers")}</h2><QuizReview rows={review} /></section>}
  </div></Shell>;
}
