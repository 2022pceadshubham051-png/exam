import { useState, type ReactNode } from "react"; import { Link, NavLink } from "react-router-dom";
import { Sun, Moon, LogOut, LayoutDashboard, TrendingUp, ShieldCheck, GraduationCap } from "lucide-react";
import { getMe, logout, toggleTheme, isDark } from "../lib/auth";

export const Logo = ({ size = 18 }: { size?: number }) => <span className="logo"><GraduationCap size={size} /></span>;

export default function Shell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe(); const [, force] = useState(0);
  const cls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");
  return <>
    <header className="nav"><div className="nav-in">
      <Link to="/dashboard" className="brand"><Logo />ExamForge</Link>
      <nav className="nav-links">
        <NavLink to="/dashboard" className={cls}><LayoutDashboard size={17} /><span>Tests</span></NavLink>
        <NavLink to="/progress" className={cls}><TrendingUp size={17} /><span>My Progress</span></NavLink>
        {me?.role === "ADMIN" && <NavLink to="/admin" className={cls}><ShieldCheck size={17} /><span>Admin</span></NavLink>}
      </nav>
      <button className="btn icon-btn" title="Switch theme" onClick={() => { toggleTheme(); force((n) => n + 1); }}>{isDark() ? <Sun size={17} /> : <Moon size={17} />}</button>
      <button className="btn btn-sm" onClick={logout}><LogOut size={15} /><span className="hidden sm:inline">Logout</span></button>
    </div></header>
    <main className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
  </>;
}

export const Loading = ({ text = "Loading" }: { text?: string }) => <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><div className="spinner mx-auto" /><p className="sub mt-3">{text}</p></div></div>;
