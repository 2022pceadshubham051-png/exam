import type { ReactNode } from "react";
import { SKIN_NAMES } from "../lib/skin";
import { useSkin } from "./Journey"; import { useCountUp } from "./ui";

// Result "ticket": a railway ticket for RRB, a library issue card, or a ground scorecard. Only real data is shown.
export const pnr = (id: string) => { let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9000000000; return String(h + 1000000000); };
export const LABELS = {
  train: { head: "Mock Test Ticket", id: "PNR", test: "Train / Test", pass: "Confirmed", fail: "Waiting list", note: "Class: Practice" },
  library: { head: "Library Issue Card", id: "Card No.", test: "Title", pass: "Cleared", fail: "Re-issue", note: "Return: next attempt" },
  ground: { head: "Scorecard", id: "Chest No.", test: "Event", pass: "Qualified", fail: "Try again", note: "Round: Mock" },
} as const;

export function ResultTicket({ attemptId, testName, attemptNo, score, total, pct, passed, date, children }: { attemptId: string; testName: string; attemptNo: number; score: number; total: number; pct: number; passed: boolean; date?: string | null; children?: ReactNode }) {
  const skin = useSkin(), L = LABELS[skin], shown = useCountUp(Math.round(pct), 1000);
  const when = date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const row = (k: string, v: ReactNode) => <div className="tk-row"><span>{k}</span><b>{v}</b></div>;
  return <section className={`ticket ticket-${skin}`} aria-label={`${SKIN_NAMES[skin]} result: ${score} of ${total}, ${pct}%, ${passed ? L.pass : L.fail}`}>
    <div className="tk-main">
      <div className="tk-head">ExamForge · {L.head}</div>
      {row(L.test, testName)}
      {row(L.id, pnr(attemptId))}
      {row("Attempt", `#${attemptNo}${when ? ` · ${when}` : ""}`)}
      {row("Marks", `${Math.round(score * 100) / 100} / ${total}`)}
      <span className={`tk-stamp ${passed ? "ok" : "no"}`} aria-hidden="true">{passed ? L.pass : L.fail}</span>
      {children}
    </div>
    <div className="tk-stub"><b>{shown}%</b><small>{L.note}</small></div>
  </section>;
}
