import { useState, type ReactNode } from "react"; import { Link, NavLink } from "react-router-dom";
import { Sun, Moon, LogOut, LayoutDashboard, TrendingUp, ShieldCheck, Trophy, Compass, Volume2, VolumeX, CircleHelp, Palette } from "lucide-react";
import { getMe, logout, toggleTheme, isDark, cycleStyle, nextStyle, STYLE_NAMES } from "../lib/auth"; import { soundOn, toggleSound, savedLevel, savedXp, sfx } from "../lib/game"; import Tutorial, { openTutorial } from "./Tutorial"; import FX from "./FX"; import LevelUp from "./LevelUp"; import LogoMark from "./LogoMark"; import Mascot from "./Mascot";

export const Logo = ({ size = 34 }: { size?: number }) => <LogoMark size={size < 30 ? 34 : size} />;

export default function Shell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe(); const [, force] = useState(0);
  const cls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");
  return <>
    <header className="nav"><div className="nav-in">
      <Link to="/dashboard" className="brand"><Logo />ExamForge</Link>
      <nav className="nav-links">
        <NavLink to="/dashboard" className={cls}><LayoutDashboard size={17} /><span>Tests</span></NavLink>
        <NavLink to="/progress" className={cls}><TrendingUp size={17} /><span>My Progress</span></NavLink>
        <NavLink to="/coach" className={cls}><Compass size={17} /><span>Smart Coach</span></NavLink>
        <NavLink to="/leaderboard" className={cls}><Trophy size={17} /><span>Leaderboard</span></NavLink>
        {me?.role === "ADMIN" && <NavLink to="/admin" className={cls}><ShieldCheck size={17} /><span>Admin</span></NavLink>}
      </nav>
      {savedLevel() > 0 && <span className="coin-chip" title="Your XP coins"><i className="coin" />{savedXp()}</span>}
      {savedLevel() > 0 && <span className="lvl-chip" title="Your level">Lv {savedLevel()}</span>}
      <button className="btn icon-btn" title="How to play" aria-label="How to play" onClick={openTutorial}><CircleHelp size={17} /></button>
      <button className="btn icon-btn" title="Sound effects" aria-label="Toggle sound" onClick={() => { toggleSound(); sfx("pop"); force((n) => n + 1); }}>{soundOn() ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
      <button className="btn icon-btn astra-btn" title={`Switch look: ${STYLE_NAMES[nextStyle()]}`} aria-label="Switch visual style" onClick={() => { cycleStyle(); sfx("level"); force((n) => n + 1); }}><Palette size={17} /></button>
      <button className="btn icon-btn" title="Switch theme" onClick={() => { toggleTheme(); force((n) => n + 1); }}>{isDark() ? <Sun size={17} /> : <Moon size={17} />}</button>
      <button className="btn btn-sm" onClick={logout}><LogOut size={15} /><span className="hidden sm:inline">Logout</span></button>
    </div></header>
    <Tutorial /><FX /><LevelUp />
    <main className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
  </>;
}

export const Loading = ({ text = "Loading" }: { text?: string }) => <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><div className="load-run"><Mascot mood="think" size={90} /></div><div className="load-dots"><i /><i /><i /></div><p className="sub mt-3">{text}</p></div></div>;
