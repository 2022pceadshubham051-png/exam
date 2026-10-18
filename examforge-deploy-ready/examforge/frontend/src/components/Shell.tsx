import { TrainLoader } from "./Journey"; import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"; import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, ShieldCheck, Trophy, Compass } from "lucide-react";
import { getMe } from "../lib/auth"; import Tutorial from "./Tutorial"; import LevelUp from "./LevelUp"; import { BrandLockup } from "./LogoMark"; import { SiteFooter } from "./PublicShell"; import UserMenu from "./UserMenu";
import { loadProfile, refreshCoins, cachedCoins, cachedProfile } from "../lib/profile";

export const Logo = ({ size = 34 }: { size?: number }) => <BrandLockup size={size} />;

let lastPill: { x: number; w: number } | null = null;
export default function Shell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe(); const nav = useNavigate(); const [coins, setC] = useState(cachedCoins()); const [gain, setGain] = useState(0); const prevCoins = useRef<any>(cachedCoins()); const [pname, setPname] = useState(cachedProfile()?.name);
  useEffect(() => {
    if (!me || me.role === "ADMIN") return;
    void refreshCoins(); const f = () => { const n = cachedCoins(); const p = prevCoins.current; prevCoins.current = n; if (typeof p === "number" && typeof n === "number" && n > p) { setGain(n - p); setTimeout(() => setGain(0), 1500); } setC(n); setPname(cachedProfile()?.name); }; window.addEventListener("ef-coins", f);
    // First login (or an older account): collect name/age/target exam once, then show content for that exam.
    loadProfile().then((p) => { setPname(p.name); if (!p.onboarded) nav("/welcome", { replace: true }); }).catch(() => {});
    return () => window.removeEventListener("ef-coins", f);
  }, []); // eslint-disable-line
  const cls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");
  const admin = me?.role === "ADMIN";
  const loc = useLocation(); const navRef = useRef<HTMLElement>(null); const [pill, setPill] = useState<{ x: number; w: number } | null>(lastPill);
  useLayoutEffect(() => {
    const place = () => { const n = navRef.current, a = n?.querySelector<HTMLElement>(".nav-link.active"); if (!n || !a || !n.offsetWidth) { lastPill = null; setPill(null); return; } const nb = n.getBoundingClientRect(), ab = a.getBoundingClientRect(); lastPill = { x: ab.left - nb.left, w: ab.width }; setPill(lastPill); };
    // Each page mounts its own Shell: start at the previous position, then glide to the new one after first paint.
    let r1 = 0, r2 = 0; if (lastPill) { r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(place); }); } else place(); window.addEventListener("resize", place); document.fonts?.ready.then(place).catch(() => {}); return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); window.removeEventListener("resize", place); };
  }, [loc.pathname]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="nav"><div className="nav-in">
      <Link to="/dashboard" className="brand" aria-label="ExamForge home"><BrandLockup size={32} /></Link>
      <nav className={`nav-links app-nav ${pill ? "has-pill" : ""}`} aria-label="Main" ref={navRef}>{pill && <span className="nav-pill" aria-hidden="true" style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} />}
        <NavLink to="/dashboard" className={cls}><LayoutDashboard size={17} aria-hidden="true" /><span>Tests</span></NavLink>
        <NavLink to="/progress" className={cls}><TrendingUp size={17} aria-hidden="true" /><span>Progress</span></NavLink>
        <NavLink to="/coach" className={cls}><Compass size={17} aria-hidden="true" /><span>Smart Coach</span></NavLink>
        <NavLink to="/leaderboard" className={cls}><Trophy size={17} aria-hidden="true" /><span>Leaderboard</span></NavLink>
        {admin && <NavLink to="/admin" className={cls}><ShieldCheck size={17} aria-hidden="true" /><span>Admin</span></NavLink>}
      </nav>
      {!admin && <Link to="/shop" className="coin-chip" aria-label={`${coins} coins. Open the shop`}><i className="coin" aria-hidden="true" />{coins}{gain > 0 && <span className="coin-gain" aria-hidden="true">+{gain}</span>}</Link>}
      <UserMenu name={admin ? "Admin" : pname} admin={admin} />
    </div></header>
    <Tutorial /><LevelUp />
    <main id="main" tabIndex={-1} className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
    <SiteFooter />
  </>;
}

export const Loading = ({ text = "Loading" }: { text?: string }) => <TrainLoader text={text} />;
