import { useEffect, useState, type ReactNode } from "react"; import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, ShieldCheck, Trophy, Compass } from "lucide-react";
import { getMe } from "../lib/auth"; import { savedLevel } from "../lib/game"; import Tutorial from "./Tutorial"; import LevelUp from "./LevelUp"; import LogoMark from "./LogoMark"; import { SiteFooter } from "./PublicShell"; import { BookLoader } from "./StudyFx"; import UserMenu from "./UserMenu";
import { loadProfile, refreshCoins, cachedCoins, cachedProfile } from "../lib/profile";

export const Logo = ({ size = 34 }: { size?: number }) => <LogoMark size={size < 30 ? 34 : size} />;

export default function Shell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe(); const nav = useNavigate(); const [coins, setC] = useState(cachedCoins()); const [pname, setPname] = useState(cachedProfile()?.name);
  useEffect(() => {
    if (!me || me.role === "ADMIN") return;
    void refreshCoins(); const f = () => { setC(cachedCoins()); setPname(cachedProfile()?.name); }; window.addEventListener("ef-coins", f);
    // First login (or an older account): collect name/age/target exam once, then show content for that exam.
    loadProfile().then((p) => { setPname(p.name); if (!p.onboarded) nav("/welcome", { replace: true }); }).catch(() => {});
    return () => window.removeEventListener("ef-coins", f);
  }, []); // eslint-disable-line
  const cls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");
  const admin = me?.role === "ADMIN";
  return <>
    <header className="nav"><div className="nav-in">
      <Link to="/dashboard" className="brand"><Logo />ExamForge</Link>
      <nav className="nav-links app-nav">
        <NavLink to="/dashboard" className={cls}><LayoutDashboard size={17} /><span>Tests</span></NavLink>
        <NavLink to="/progress" className={cls}><TrendingUp size={17} /><span>Progress</span></NavLink>
        <NavLink to="/coach" className={cls}><Compass size={17} /><span>Smart Coach</span></NavLink>
                <NavLink to="/leaderboard" className={cls}><Trophy size={17} /><span>Leaderboard</span></NavLink>
        {admin && <NavLink to="/admin" className={cls}><ShieldCheck size={17} /><span>Admin</span></NavLink>}
      </nav>
      {!admin && <Link to="/shop" className="coin-chip" title="Your coins. Tap to spend them in the Shop"><i className="coin" />{coins}</Link>}
            <UserMenu name={admin ? "Admin" : pname} admin={admin} />
    </div></header>
    <Tutorial /><LevelUp />
    <main className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
    <SiteFooter />
  </>;
}

export const Loading = ({ text = "Loading" }: { text?: string }) => <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><BookLoader /><div className="load-dots"><i /><i /><i /></div><p className="sub mt-3">{text}</p></div></div>;
