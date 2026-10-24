import { useEffect, useState } from "react"; import { Check } from "lucide-react";
import Shell from "../components/Shell"; import { Empty, PageHeader, SkeletonRows } from "../components/ui"; import { api } from "../lib/api"; import { useT } from "../lib/i18n";

const WHY: Record<string, string> = { wrong_answer: "The answer key looks wrong", unclear: "The question is unclear", typo: "Spelling or typing mistake", other: "Something else" };
/** Admin: questions that students flagged, most reported first. */
export default function AdminReports() {
  const t = useT(), [rows, setRows] = useState<any[] | null>(null);
  const load = () => api("/admin/reports").then((r) => setRows(Array.isArray(r) ? r : [])).catch(() => setRows([]));
  useEffect(() => { void load(); }, []);
  const resolve = async (id: string) => { await api(`/admin/reports/${id}/resolve`, "POST"); setRows((r) => (r ?? []).filter((x) => x.questionId !== id)); };
  return <Shell narrow><div className="stack" style={{ gap: 16 }}><PageHeader title={t("Reported questions")} />
    {!rows ? <SkeletonRows rows={4} /> : !rows.length ? <Empty title={t("No open reports")}>{t("Nothing to review right now.")}</Empty> : rows.map((q) => <article key={q.questionId} className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
      <b style={{ whiteSpace: "pre-wrap" }}>{q.text}</b><div className="sub">{q.test?.name} · {t("{n} report(s)", { n: q.count })}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{q.options.map((o: any) => <li key={o.key} style={o.key === q.correctKey ? { fontWeight: 700 } : undefined}>{o.key}. {o.text}{o.key === q.correctKey ? " ✓" : ""}</li>)}</ul>
      <ul className="sub" style={{ margin: 0, paddingLeft: 18 }}>{q.reasons.map((r: any, i: number) => <li key={i}>{t(WHY[r.reason] ?? "Something else")}{r.note ? `: ${r.note}` : ""}</li>)}</ul>
      <button type="button" className="btn btn-primary btn-sm" style={{ justifySelf: "start" }} onClick={() => resolve(q.questionId)}><Check size={14} aria-hidden="true" />{t("Mark as fixed")}</button></article>)}
  </div></Shell>;
}
