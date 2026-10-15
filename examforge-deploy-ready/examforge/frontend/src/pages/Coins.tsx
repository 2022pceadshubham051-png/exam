import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins as CoinsIcon, Flame, Timer, ShoppingBag, ArrowUpRight, CheckCircle2, CircleAlert, History, Loader2, Zap } from "lucide-react";
import Shell, { Loading } from "../components/Shell";
import { api } from "../lib/api";

type ShopItem = { id: string; name: string; price: number; inventoryKey: string; description: string };
type Tx = { id: string; amount: number; type: string; reason: string; balance: number; createdAt: string };
type Wallet = { coins: number; inventory: Record<string, number>; shop: ShopItem[]; transactions: Tx[] };
const iconFor = (id: string) => id === "streak_freeze" ? <Flame size={22}/> : <Timer size={22}/>;
export default function Coins() {
  const [wallet, setWallet] = useState<Wallet | null>(null); const [busy, setBusy] = useState(""); const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => api<Wallet>("/coins").then(setWallet).catch((e: any) => setMessage({ ok: false, text: e.message || "Wallet unavailable." }));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const buy = async (item: ShopItem) => {
    setBusy(item.id); setMessage(null);
    try { const result = await api<{ coins: number; inventory: Record<string, number>; item: ShopItem }>("/coins/spend", "POST", { itemId: item.id }); setMessage({ ok: true, text: `${item.name} added to your inventory. Open Lecture Pace to use it.` }); await load(); }
    catch (e: any) { setMessage({ ok: false, text: e.message || "Purchase failed." }); }
    finally { setBusy(""); }
  };
  return <Shell><div className="stack" style={{ gap: 24 }}>
    <section className="hero coins-hero"><div className="blob" style={{ width: 230, height: 230, background: "#fbbf24", right: -40, top: -70 }}/><div className="row" style={{ position: "relative", alignItems: "flex-start", gap: 16 }}><div className="coins-hero-icon"><CoinsIcon size={32}/></div><div><span className="pill" style={{ background: "rgba(255,255,255,.16)", color: "white", borderColor: "transparent" }}>ExamForge rewards</span><h1 style={{ marginTop: 8 }}>Coin Shop</h1><p>Earn coins by completing lectures. Spend them on helpful study boosts that work in Lecture Pace.</p></div></div><div className="wallet-total"><span>Available balance</span><strong><CoinsIcon size={26}/>{wallet?.coins ?? "—"}</strong><small>Coins stay synced to your account.</small></div></section>
    {message && <div className={`alert ${message.ok ? "alert-ok" : "alert-bad"}`}>{message.ok ? <CheckCircle2 size={17}/> : <CircleAlert size={17}/>}<span>{message.text}</span></div>}
    {!wallet ? <Loading text="Loading your wallet"/> : <>
      <div className="row between"><div><h2 className="card-title" style={{ fontSize: "1.3rem" }}>Useful study boosts</h2><p className="sub">Each purchase is stored on the backend and added to your inventory.</p></div><Link className="btn btn-primary" to="/lecture-pace">Open Lecture Pace <ArrowUpRight size={16}/></Link></div>
      <section className="shop-grid">{wallet.shop.map((item) => <article className="card shop-item" key={item.id}><div className="shop-item-top"><span className="shop-item-icon">{iconFor(item.id)}</span><span className="pill pill-brand">Consumable</span></div><h3>{item.name}</h3><p className="sub">{item.description}</p><div className="shop-cost"><span><CoinsIcon size={17}/>{item.price}</span><small>Owned: {wallet.inventory?.[item.inventoryKey] ?? 0}</small></div><button className="btn btn-primary btn-block" disabled={busy === item.id || wallet.coins < item.price} onClick={() => buy(item)}>{busy === item.id ? <><Loader2 size={16} className="animate-spin"/>Purchasing…</> : <><ShoppingBag size={16}/>{wallet.coins < item.price ? "Not enough coins" : "Buy item"}</>}</button></article>)}</section>
      <section className="card card-pad stack"><div className="row between"><div><h2 className="card-title row"><History size={18}/>Recent coin activity</h2><p className="sub">Purchases and rewards recorded by the backend.</p></div><span className="pill">Last 30</span></div>{wallet.transactions.length ? <div className="table-wrap"><table className="t"><thead><tr><th>Activity</th><th>Date</th><th>Amount</th><th>Balance</th></tr></thead><tbody>{wallet.transactions.map((t) => <tr key={t.id}><td><b>{t.reason}</b></td><td>{new Date(t.createdAt).toLocaleDateString()}</td><td style={{ color: t.amount < 0 ? "var(--bad)" : "var(--ok)", fontWeight: 800 }}>{t.amount > 0 ? "+" : ""}{t.amount}</td><td>{t.balance}</td></tr>)}</tbody></table></div> : <div className="empty compact"><Zap size={28}/><p>No coin activity yet. Complete a lecture to earn your first reward.</p></div>}</section>
    </>}
  </div></Shell>;
}
