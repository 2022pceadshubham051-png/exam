import { useEffect, useState } from "react"; import { Trophy, Crown } from "lucide-react";
import Shell from "../components/Shell"; import SubNav from "../components/SubNav"; import { Empty, PageHeader, SkeletonRows, toast } from "../components/ui";
import { api, swr } from "../lib/api"; import { useT } from "../lib/i18n"; import { refreshCoins } from "../lib/profile";

interface Row { rank: number; name: string; points: number; tier: string; isMe: boolean }
interface Data { weekStart: string; resetsOn: string; total: number; me: { rank: number | null; points: number; tier: string }; rows: Row[] }
const TIER: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", diamond: "Diamond" };

/** Weekly league: points from Daily Challenge, tests and duel wins. Resets every Monday (India time). */
export default function League() {
  const t = useT(), [d, setD] = useState<Data | null>(null), [err, setErr] = useState(false);
  useEffect(() => {
    swr<Data>("/league", setD).catch(() => setErr(true));
    // Last week's top 3 are paid once when they open this page.
    api<{ week: string; rank: number | null; coins: number }>("/league/claim", "POST").then((r) => { if (r.coins) { toast(t("Last week you finished #{r} in the league! +{c} coins", { r: r.rank ?? 0, c: r.coins }), "ok"); void refreshCoins(); } }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell narrow><div className="stack stagger" style={{ gap: 18 }}><SubNav group="practice" /><PageHeader title={t("Weekly League")} sub={t("Earn points from the Daily Challenge, tests and duel wins. It resets every Monday.")} />
    {err && !d ? <Empty icon={<Trophy size={20} />} title={t("Could not load the league")}>{t("Check your internet and try again.")}</Empty>
      : !d ? <SkeletonRows rows={6} /> : <>
      <section className="eg-hero"><div className="eg-vs"><div><div className="eg-big">{d.me.rank ? "#" + d.me.rank : "–"}</div><span className="sub">{t("your rank")}</span></div><div><div className="eg-big">{d.me.points}</div><span className="sub">{t("points this week")}</span></div></div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className={"pill tier-" + d.me.tier}><Crown size={13} aria-hidden="true" /> {t(TIER[d.me.tier])}</span><span className="sub">{t("Resets on {d}", { d: d.resetsOn })}</span></div>
        <p className="sub" style={{ margin: 0 }}>{t("Daily: 10 per correct answer + 20 for finishing. Tests: 2 per correct answer + 20 for finishing. Duel win: 30.")}</p></section>
      {d.rows.length === 0 ? <Empty icon={<Trophy size={20} />} title={t("No points yet this week")}>{t("Finish today's Daily Challenge to be the first on the board.")}</Empty>
        : <ol className="eg-board" aria-label={t("Weekly League")}>{d.rows.map((r) => <li key={r.rank} className={r.isMe ? "is-me" : ""}><b className="eg-rank">{r.rank}</b><span className="eg-name">{r.name}{r.isMe ? " (" + t("You") + ")" : ""}</span><span className={"pill tier-" + r.tier}>{t(TIER[r.tier])}</span><b>{r.points}</b></li>)}</ol>}
      <p className="sub">{t("Last week's top 3 win 150, 100 and 60 coins.")}</p></>}
  </div></Shell>;
}
