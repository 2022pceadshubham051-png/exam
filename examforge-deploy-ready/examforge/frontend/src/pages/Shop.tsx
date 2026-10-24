import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Check, Lock } from "lucide-react"; import SubNav from "../components/SubNav";
import Shell from "../components/Shell"; import { PageHeader, SkeletonRows, toast, flyCoins } from "../components/ui"; import { api } from "../lib/api"; import { setCoins } from "../lib/profile";
import { sfx } from "../lib/game";

type Item = { id: string; kind: "title" | "frame" | "lifeline" | "freeze"; name: string; emoji: string; price: number; desc: string };
type State = { coins: number; inventory: { owned: string[]; lifelines: number; freezes?: number; equipped: { title?: string; frame?: string } }; dailyAvailable: boolean; dailyCoins: number; items: Item[] };

const EARN: [string, string][] = [["Daily Challenge", "10–30 coins, every day"], ["Streak milestones", "3, 7, 14, 30 days: bonus coins"], ["Win a Duel", "25 coins (8 for trying)"], ["Revise your mistakes", "2 coins a card, up to 30 a day"], ["Invite a friend", "50 coins when they finish a test"], ["Finish a test", "30 coins + your score %"], ["Right answer in Practice", "10 coins each"], ["Lecture Pace", "1 coin per 5 XP"], ["Daily bonus", "15 coins, once a day"], ["New here?", "50 welcome coins"]];

export default function Shop() {
  const [s, setS] = useState<State | null>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(""); const [flip, setFlip] = useState("");
  const apply = (x: State) => { setS(x); setCoins(x.coins); };
  useEffect(() => { api<State>("/shop").then(apply).catch((e) => setErr(e.message)); }, []);
  const run = async (key: string, path: string, body: unknown, ok: (x: State) => string, fx = true) => {
    if (busy) return; setErr(""); setMsg(""); setBusy(key);
    try { const x = await api<State>(path, "POST", body); apply(x); const m = ok(x); setMsg(m); setFlip(key); if (path === "/shop/buy" || path === "/shop/daily") requestAnimationFrame(() => flyCoins(document.querySelector(`[data-shop="${key}"]`)));  setTimeout(() => setFlip(""), 1100); toast(m, "ok"); sfx(fx ? "win" : "pop"); }
    catch (e: any) { setErr(e.message); toast(e.message, "bad"); sfx("wrong"); } finally { setBusy(""); }
  };
  if (!s) return <Shell>{err ? <div className="alert alert-bad" role="alert">{err}</div> : <SkeletonRows rows={5} />}</Shell>;
  const { inventory: inv } = s, owned = (id: string) => inv.owned.includes(id);
  const group = (k: Item["kind"]) => s.items.filter((i) => i.kind === k);
  const tilt = (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType !== "mouse") return; const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--rx", `${(-(e.clientY - r.top - r.height / 2) / r.height * 6).toFixed(2)}deg`); e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left - r.width / 2) / r.width * 8).toFixed(2)}deg`); };
  const untilt = (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty("--rx", "0deg"); e.currentTarget.style.setProperty("--ry", "0deg"); };
  const card = (i: Item) => {
    const stackable = i.kind === "lifeline" || i.kind === "freeze", have = stackable ? false : owned(i.id), eq = !stackable && (inv.equipped as any)[i.kind] === i.id, short = i.price - s.coins;
    return <article key={i.id} data-shop={i.id} onPointerMove={tilt} onPointerLeave={untilt} className={`card card-pad shop-item ${eq ? "equipped" : ""} ${flip === i.id ? "flip" : ""}`}>
      <div className="row between"><span className="shop-emoji">{i.emoji}</span>{stackable ? <span className="pill">You have {i.kind === "freeze" ? inv.freezes ?? 0 : inv.lifelines}</span> : have ? <span className="pill pill-ok"><Check size={12} aria-hidden="true" />Owned</span> : null}</div>
      <div><h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{i.name}</h3><p className="sub" style={{ marginTop: 4 }}>{i.desc}</p>
        {i.kind === "frame" && <p style={{ marginTop: 8, fontSize: "1.05rem" }}><span className={`nm nm-${i.id.replace("frame-", "")}`}>Your Name</span></p>}</div>
      <div className="row between" style={{ marginTop: "auto" }}>
        <span className="coin-chip" style={{ cursor: "default" }}><i className="coin" />{i.price}</span>
        {have ? <button className="btn btn-sm" disabled={!!busy} onClick={() => run(i.id, "/shop/equip", { kind: i.kind, itemId: eq ? null : i.id }, () => (eq ? `${i.name} removed.` : `${i.name} equipped.`), false)}>{eq ? "Unequip" : "Equip"}<span className="sr"> {i.name}</span></button>
          : <button className="btn btn-sm btn-primary" disabled={!!busy || short > 0} title={short > 0 ? `${short} more coins needed` : ""} onClick={() => run(i.id, "/shop/buy", { itemId: i.id }, () => (i.kind === "lifeline" ? "Lifeline added! Use it in Practice mode." : i.kind === "freeze" ? "Streak Freeze added. It is used automatically if you miss a day." : `${i.name} unlocked and equipped!`))}>{short > 0 ? <><Lock size={13} />Need {short}</> : "Buy"}</button>}
      </div></article>;
  };
  return <Shell><div className="stack" style={{ gap: 24 }}>
    <SubNav group="me" />
    <PageHeader title="Shop" sub="Coins come from tests, practice and Lecture Pace. Buy lifelines for Practice mode, or titles and name styles that show on the leaderboards." actions={<span className="coin-chip" aria-label={`Balance: ${s.coins} coins`}><i className="coin" aria-hidden="true" />{s.coins}</span>} />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}{msg && <div className="alert alert-ok" role="status">{msg}</div>}
    <section className="dashboard-split">
      <div className="card card-pad stack"><div><h2 className="card-title row" style={{ gap: 8 }}><Gift size={18} />Daily bonus</h2><p className="sub">Come back every day for free coins.</p></div>
        <button data-shop="daily" className="btn btn-primary" disabled={!s.dailyAvailable || !!busy} onClick={() => run("daily", "/shop/daily", {}, () => `+${s.dailyCoins} coins collected!`)}>{s.dailyAvailable ? `Claim ${s.dailyCoins} coins` : "Claimed today. Come back tomorrow"}</button></div>
      <div className="card card-pad stack"><h2 className="card-title">How to earn coins</h2><ul className="earn-list">{EARN.map(([a, b]) => <li key={a}><b>{a}</b><span className="sub">{b}</span></li>)}</ul>
        <p className="sub">Deleting your test history never takes coins away. <Link to="/dashboard">Take a test</Link> to earn more.</p></div>
    </section>
    <section className="stack" style={{ gap: 12 }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Power-ups</h2><p className="sub">Streak Freezes protect your streak automatically. Lifelines work in Practice mode only; official exams stay fair.</p></div><div className="shop-grid">{[...group("freeze"), ...group("lifeline")].map(card)}</div></section>
    <section className="stack" style={{ gap: 12 }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Titles</h2><p className="sub">Shown next to your name on both leaderboards. Wear one at a time.</p></div><div className="shop-grid">{group("title").map(card)}</div></section>
    <section className="stack" style={{ gap: 12 }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Name styles</h2><p className="sub">Make your name stand out in the rankings.</p></div><div className="shop-grid">{group("frame").map(card)}</div></section>
  </div></Shell>;
}
