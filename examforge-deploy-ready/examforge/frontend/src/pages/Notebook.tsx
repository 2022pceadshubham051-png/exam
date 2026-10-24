import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { BookMarked, Trash2 } from "lucide-react";
import Shell from "../components/Shell"; import SubNav from "../components/SubNav"; import { Empty, PageHeader } from "../components/ui"; import { api } from "../lib/api"; import { useT } from "../lib/i18n";
import { allNotes, dueNotes, removeNote, mastered, ingestReview, type Note } from "../lib/notebook"; import DoubtButton from "../components/DoubtButton";

/** Pulls wrong answers from the last few attempts into the notebook (once per question), then lets the student revise them. */
export default function Notebook() {
  const t = useT(); const [tab, setTab] = useState<"due" | "all" | "saved">("due"); const [, bump] = useState(0); const [syncing, setSyncing] = useState(true);
  useEffect(() => { const f = () => bump((n) => n + 1); window.addEventListener("ef-notebook", f); return () => window.removeEventListener("ef-notebook", f); }, []);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const h = await api("/history"); const recent = (Array.isArray(h) ? h : []).filter((a: any) => a.result && !a.resultHidden).slice(0, 5);
        for (const a of recent) { const d = await api(`/attempts/${a.id}/review`).catch(() => null); if (off || !d) continue;
          ingestReview(d); }
      } catch { /* offline: show what is stored */ } finally { if (!off) setSyncing(false); }
    })();
    return () => { off = true; };
  }, []);
  const list: Note[] = tab === "due" ? dueNotes() : tab === "all" ? allNotes().filter((n) => n.kind === "mistake") : allNotes().filter((n) => n.kind === "saved");
  const cur = list[0];
  const txt = (n: Note, k: string | null) => (k ? `${k}. ${n.options.find((o) => o.key === k)?.text ?? ""}` : "Open this test's Review to fill in the answer.");
  return <Shell narrow><div className="stack" style={{ gap: 18 }}>
    <SubNav group="me" />
    <PageHeader title={t("Mistake notebook")} sub="Questions you got wrong come back after 1, 3, 7, 14 and 30 days until you remember them." />
    <div className="seg" role="tablist">{([["due", "Revise today"], ["all", "All mistakes"], ["saved", "Saved"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t(l)}<span className="pill">{k === "due" ? dueNotes().length : k === "all" ? allNotes().filter((n) => n.kind === "mistake").length : allNotes().filter((n) => n.kind === "saved").length}</span></button>)}</div>
    {!cur ? <Empty icon={<BookMarked size={32} />} title={syncing ? "Collecting your mistakes…" : t("Nothing due. Come back tomorrow.")}>{tab === "saved" ? "Tap the bookmark on any question in Review to save it here." : <>Take a test and your wrong answers appear here. <Link to="/dashboard">{t("Practice")}</Link></>}</Empty>
      : tab === "due" ? <article className="card card-pad stack" style={{ gap: 12 }}>
        <div className="row between"><span className="pill pill-warn">{t("{n} cards due", { n: list.length })}</span><span className="sub">{t("A daily round has at most 15 cards")}</span></div>
        <p className="flash-q" style={{ margin: 0 }}>{t("Today's revision round is ready. Pick an answer first, then say how easy it felt. This is how mistakes become permanent knowledge.")}</p>
        <Link className="btn btn-primary btn-lg" to="/revise">{t("Start revision")}</Link></article>
      : <div className="stack" style={{ gap: 10 }}>{list.map((n) => <article key={n.key} className="card card-pad stack" style={{ gap: 8 }}>
        <div className="row between"><span className="pill">{n.topic ?? n.testName}</span><button className="btn btn-sm btn-danger" aria-label="Remove" onClick={() => removeNote(n.key)}><Trash2 size={14} /></button></div>
        <p style={{ margin: 0, fontWeight: 600, whiteSpace: "pre-wrap" }}>{n.text}</p><div className="ans good"><span><b>Answer:</b> {txt(n, n.correctKey)}</span></div>{mastered(n) && <span className="pill pill-ok" style={{ width: "fit-content" }}>Mastered</span>}<DoubtButton text={n.text} options={n.options} correctKey={n.correctKey} explanation={n.explanation} topic={n.topic} /></article>)}</div>}
  </div></Shell>;
}
