import { useEffect } from "react"; import { Link } from "react-router-dom"; import { ArrowRight } from "lucide-react";
import PublicShell from "../components/PublicShell"; import { getMe } from "../lib/auth";

export default function NotFound() {
  useEffect(() => { document.title = "Page not found | ExamForge"; }, []);
  const me = getMe();
  return <PublicShell narrow><div className="nf">
    <span className="nf-code" aria-hidden="true">404</span>
    <h1>This page does not exist</h1>
    <p>The link may be old, or the address may have a typo. {me ? "Your tests and results are right where you left them." : "You can still browse the exam tips or sign in to take a test."}</p>
    <div className="lp-actions"><Link className="btn btn-primary" to={me ? "/dashboard" : "/login"}>{me ? "Go to dashboard" : "Log in"}<ArrowRight size={16} aria-hidden="true" /></Link><Link className="btn" to="/tips">Read exam tips</Link></div>
  </div></PublicShell>;
}
