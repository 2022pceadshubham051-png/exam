import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; import { PlayCircle, TrainFront } from "lucide-react";
import { api } from "../lib/api"; import { useT } from "../lib/i18n";

/** After a quiz that belongs to a course: the stations (lectures) that cover the topics the student got wrong, each one a direct link to that lecture. */
export default function RevisitCard({ attemptId }: { attemptId: string }) {
  const t = useT(); const [d, setD] = useState<any>(null);
  useEffect(() => { let live = true; api(`/attempts/${attemptId}/revisit`).then((x) => live && setD(x)).catch(() => {}); return () => { live = false; }; }, [attemptId]);
  if (!d?.course || !d.items?.length) return null;
  return <section className="card card-pad stack revisit" style={{ gap: 10 }} aria-label={t("Watch these stations again")}>
    <div><h2 className="card-title row" style={{ gap: 8 }}><TrainFront size={18} aria-hidden="true" />{t("Watch these stations again")}</h2><p className="sub" style={{ margin: "2px 0 0" }}>{t("Based on the questions you got wrong in this quiz.")}</p></div>
    <ul className="revisit-list">{d.items.map((x: any) => <li key={x.lessonId}>
      <Link className="rt-row lesson revisit-row" to={`/courses/${d.course.slug ?? d.course.id}?lesson=${x.lessonId}`}>
        <span className="rt-row-ico" aria-hidden="true">{x.n}</span>
        <span className="rt-row-t"><b>{x.title}</b><small>{x.subjectName} · {t("Station {n}", { n: x.n })} · {t("{n} wrong", { n: x.wrong })}: {x.topic}{x.exact ? "" : ` · ${t("closest lecture")}`}</small></span>
        <PlayCircle size={20} aria-hidden="true" className="rt-row-go" /></Link></li>)}</ul>
  </section>;
}
