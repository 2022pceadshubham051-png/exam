import { useEffect, useState, type ReactNode } from "react"; import { Link, NavLink } from "react-router-dom";
import { Sun, Moon, LogOut, LayoutDashboard, TrendingUp, ShieldCheck, Trophy, Compass, Volume2, VolumeX, CircleHelp, Palette, BookOpen, Coins as CoinsIcon } from "lucide-react";
import { getMe, logout, toggleTheme, isDark, cycleStyle, nextStyle, STYLE_NAMES } from "../lib/auth"; import { api } from "../lib/api"; import { soundOn, toggleSound, savedLevel, sfx } from "../lib/game"; import Tutorial, { openTutorial } from "./Tutorial"; import FX from "./FX"; import LevelUp from "./LevelUp"; import LogoMark from "./LogoMark"; import { SiteFooter } from "./PublicShell"; import Mascot from "./Mascot";

export const Logo = ({ size = 34 }: { size?: number }) => <LogoMark size={size < 30 ? 34 : size} />;

export default function Shell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe(); const [, force] = useState(0); const [coins, setCoins] = useState<number | null>(null);
  useEffect(() => { if (me && me.role !== "ADMIN") api<{ coins: number }>("/coins").then((w) => setCoins(w.coins)).catch(() => setCoins(null)); }, []);
  const cls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");
  return <>
    <header className="nav"><div className="nav-in">
      <Link to="/dashboard" className="brand"><Logo />ExamForge</Link>
      <nav className="nav-links">
        <NavLink to="/dashboard" className={cls}><LayoutDashboard size={17} /><span>Tests</span></NavLink>
        <NavLink to="/progress" className={cls}><TrendingUp size={17} /><span>My Progress</span></NavLink>
        <NavLink to="/coach" className={cls}><Compass size={17} /><span>Smart Coach</span></NavLink>
        <NavLink to="/lecture-pace" className={cls}><BookOpen size={17} /><span>Lecture Pace</span></NavLink>
        <NavLink to="/leaderboard" className={cls}><Trophy size={17} /><span>Leaderboard</span></NavLink>
        {me?.role === "ADMIN" && <NavLink to="/admin" className={cls}><ShieldCheck size={17} /><span>Admin</span></NavLink>}
      </nav>
      {me?.role !== "ADMIN" && coins !== null && <Link className="coin-chip" to="/coins" title="Open your coin wallet"><i className="coin" /><CoinsIcon size={14}/>{coins}</Link>}
      {savedLevel() > 0 && <span className="lvl-chip" title="Your level">Lv {savedLevel()}</span>}
      <button className="btn icon-btn" title="How to play" aria-label="How to play" onClick={openTutorial}><CircleHelp size={17} /></button>
      <button className="btn icon-btn" title="Sound effects" aria-label="Toggle sound" onClick={() => { toggleSound(); sfx("pop"); force((n) => n + 1); }}>{soundOn() ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
      <button className="btn icon-btn astra-btn" title={`Switch look: ${STYLE_NAMES[nextStyle()]}`} aria-label="Switch visual style" onClick={() => { cycleStyle(); window.dispatchEvent(new Event("examforge:theme")); sfx("level"); force((n) => n + 1); }}><Palette size={17} /></button>
      <button className="btn icon-btn" title="Switch theme" onClick={() => { toggleTheme(); window.dispatchEvent(new Event("examforge:theme")); force((n) => n + 1); }}>{isDark() ? <Sun size={17} /> : <Moon size={17} />}</button>
      <button className="btn btn-sm" onClick={logout}><LogOut size={15} /><span className="hidden sm:inline">Logout</span></button>
    </div></header>
    <Tutorial /><FX /><LevelUp />
    <main className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
    <SiteFooter />
  </>;
}

export const Loading = ({ text = "Loading" }: { text?: string }) => <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><div className="load-run"><Mascot mood="think" size={90} /></div><div className="load-dots"><i /><i /><i /></div><p className="sub mt-3">{text}</p></div></div>;
