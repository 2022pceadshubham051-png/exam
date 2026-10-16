import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Check, Sparkles, Lock } from "lucide-react";
import Shell, { Loading } from "../components/Shell"; import Mascot from "../components/Mascot"; import { api } from "../lib/api"; import { setCoins } from "../lib/profile";
import { confetti } from "../components/Confetti"; import { sfx } from "../lib/game";

type Item = { id: string; kind: "title" | "frame" | "lifeline"; name: string; emoji: string; price: number; desc: string };
type State = { coins: number; inventory: { owned: string[]; lifelines: number; equipped: { title?: string; frame?: string } }; dailyAvailable: boolean; dailyCoins: number; items: Item[] };

const EARN: [string, string][] = [["Finish a test", "30 coins + your score %"], ["Right answer in Practice", "10 coins each"], ["Lecture Pace", "1 coin per 5 XP"], ["Daily bonus", "15 coins, once a day"], ["New here?", "50 welcome coins"]];

export default function Shop() {
  const [s, setS] = useState<State | null>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  const apply = (x: State) => { setS(x); setCoins(x.coins); };
  useEffect(() => { api<State>("/shop").then(apply).catch((e) => setErr(e.message)); }, []);
  const run = async (key: string, path: string, body: unknown, ok: (x: State) => string, fx = true) => {
    setErr(""); setMsg(""); setBusy(key);
    try { const x = await api<State>(path, "POST", body); apply(x); setMsg(ok(x)); if (fx) { sfx("win"); confetti(40, { x: 0.5, y: 0.35 }); } else sfx("pop"); }
    catch (e: any) { setErr(e.message); sfx("wrong"); } finally { setBusy(""); }
  };
  if (!s) return <Shell>{err ? <div className="alert alert-bad">{err}</div> : <Loading text="Opening the shop" />}</Shell>;
  const { inventory: inv } = s, owned = (id: string) => inv.owned.includes(id);
  const group = (k: Item["kind"]) => s.items.filter((i) => i.kind === k);
  const card = (i: Item) => {
    const have = i.kind === "lifeline" ? false : owned(i.id), eq = i.kind !== "lifeline" && inv.equipped[i.kind] === i.id, short = i.price - s.coins;
    return <article key={i.id} className={`card card-pad shop-item ${eq ? "equipped" : ""}`}>
      <div className="row between"><span className="shop-emoji">{i.emoji}</span>{i.kind === "lifeline" ? <span className="pill">You have {inv.lifelines}</span> : have ? <span className="pill pill-ok"><Check size={12} />Owned</span> : null}</div>
      <div><h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{i.name}</h3><p className="sub" style={{ marginTop: 4 }}>{i.desc}</p>
        {i.kind === "frame" && <p style={{ marginTop: 8, fontSize: "1.05rem" }}><span className={`nm nm-${i.id.replace("frame-", "")}`}>Your Name</span></p>}</div>
      <div className="row between" style={{ marginTop: "auto" }}>
        <span className="coin-chip" style={{ cursor: "default" }}><i className="coin" />{i.price}</span>
        {have ? <button className="btn btn-sm" disabled={!!busy} onClick={() => run(i.id, "/shop/equip", { kind: i.kind, itemId: eq ? null : i.id }, () => (eq ? `${i.name} removed.` : `${i.name} equipped.`), false)}>{eq ? "Unequip" : "Equip"}</button>
          : <button className="btn btn-sm btn-primary" disabled={!!busy || short > 0} title={short > 0 ? `${short} more coins needed` : ""} onClick={() => run(i.id, "/shop/buy", { itemId: i.id }, () => (i.kind === "lifeline" ? "Lifeline added! Use it in Practice mode." : `${i.name} unlocked and equipped!`))}>{short > 0 ? <><Lock size={13} />Need {short}</> : "Buy"}</button>}
      </div></article>;
  };
  return <Shell><div className="stack" style={{ gap: 24 }}>
    <section className="hero">
      <div className="blob" style={{ width: 220, height: 220, background: "#f59e0b", right: -40, top: -60 }} />
      <div className="hero-mascot"><Mascot mood="cheer" size={130} /></div>
      <span className="pill pill-brand"><Sparkles size={14} />Coin shop</span>
      <h1>Spend your coins</h1>
      <p>Coins come from tests, practice and Lecture Pace. Buy lifelines for Practice mode, or titles and name styles that show on the leaderboards.</p>
      <div className="xp-card"><div className="row between"><b>Your balance</b><span className="coin-chip" style={{ cursor: "default" }}><i className="coin" />{s.coins}</span></div></div>
    </section>
    {err && <div className="alert alert-bad">{err}</div>}{msg && <div className="alert alert-ok">{msg}</div>}
    <section className="dashboard-split">
      <div className="card card-pad stack"><div><h2 className="card-title row" style={{ gap: 8 }}><Gift size={18} />Daily bonus</h2><p className="sub">Come back every day for free coins.</p></div>
        <button className="btn btn-primary" disabled={!s.dailyAvailable || !!busy} onClick={() => run("daily", "/shop/daily", {}, () => `+${s.dailyCoins} coins collected!`)}>{s.dailyAvailable ? `Claim ${s.dailyCoins} coins` : "Claimed today. See you tomorrow!"}</button></div>
      <div className="card card-pad stack"><h2 className="card-title">How to earn coins</h2><ul className="earn-list">{EARN.map(([a, b]) => <li key={a}><b>{a}</b><span className="sub">{b}</span></li>)}</ul>
        <p className="sub">Deleting your test history never takes coins away. <Link to="/dashboard">Take a test</Link> to earn more.</p></div>
    </section>
    <section className="stack" style={{ gap: 12 }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Power-ups</h2><p className="sub">Used in Practice mode. Official exams stay fair, so lifelines are switched off there.</p></div><div className="shop-grid">{group("lifeline").map(card)}</div></section>
    <section className="stack" style={{ gap: 12 }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Titles</h2><p className="sub">Shown next to your name on both leaderboards. Wear one at a time.</p></div><div className="shop-grid">{group("title").map(card)}</div></section>
    <section className="stack" style={{ gap: 12 }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Name styles</h2><p className="sub">Make your name stand out in the rankings.</p></div><div className="shop-grid">{group("frame").map(card)}</div></section>
  </div></Shell>;
}
