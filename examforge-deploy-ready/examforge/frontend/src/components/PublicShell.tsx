import type { ReactNode } from "react"; import { Link } from "react-router-dom";
import LogoMark from "./LogoMark"; import { getMe } from "../lib/auth"; import { SITE } from "../lib/content";

export const SiteFooter = () => <footer className="site-foot"><div className="site-foot-in">
  <span>© {new Date().getFullYear()} {SITE}</span>
  <nav aria-label="Footer"><Link to="/about">About</Link><Link to="/tips">Exam tips</Link><Link to="/privacy">Privacy policy</Link><Link to="/contact">Contact</Link></nav>
</div></footer>;

export default function PublicShell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe();
  return <>
    <header className="nav"><div className="nav-in">
      <Link to="/" className="brand"><LogoMark size={34} />{SITE}</Link>
      <nav className="nav-links"><Link className="nav-link" to="/tips"><span>Exam tips</span></Link><Link className="nav-link" to="/about"><span>About</span></Link></nav>
      <span style={{ flex: 1 }} />
      <Link className="btn btn-primary btn-sm" to={me ? (me.role === "ADMIN" ? "/admin" : "/dashboard") : "/login"}>{me ? "Open dashboard" : "Login / Register"}</Link>
    </div></header>
    <main className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
    <SiteFooter />
  </>;
}
