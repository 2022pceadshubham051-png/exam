import type { ReactNode } from "react"; import { Link } from "react-router-dom";
import { BrandLockup } from "./LogoMark"; import { getMe } from "../lib/auth"; import { SITE } from "../lib/content";

export const SiteFooter = () => <footer className="site-foot"><div className="site-foot-in">
  <span>© {new Date().getFullYear()} {SITE}</span>
  <nav aria-label="Footer"><Link to="/about">About</Link><Link to="/tips">Exam tips</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms</Link><Link to="/refund">Refunds</Link><Link to="/contact">Contact</Link></nav>
</div></footer>;

export default function PublicShell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const me = getMe();
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="nav"><div className="nav-in">
      <Link to="/" className="brand" aria-label={`${SITE} home`}><BrandLockup size={32} /></Link>
      <nav className="nav-links" aria-label="Main"><Link className="nav-link" to="/tips">Exam tips</Link><Link className="nav-link" to="/about">About</Link></nav>
      <span style={{ flex: 1 }} />
      <Link className="btn btn-primary btn-sm" to={me ? (me.role === "ADMIN" ? "/admin" : "/dashboard") : "/login"}>{me ? "Open dashboard" : "Log in / Register"}</Link>
    </div></header>
    <main id="main" tabIndex={-1} className={narrow ? "page-narrow fade-in" : "page fade-in"}>{children}</main>
    <SiteFooter />
  </>;
}
