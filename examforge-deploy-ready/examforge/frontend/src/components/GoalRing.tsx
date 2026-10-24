import { Link } from "react-router-dom"; import { Check } from "lucide-react"; import { useT } from "../lib/i18n";

export interface Goal { label: string; done: boolean; to: string }
/** Today's three small goals shown as one progress ring. All three done = a full ring. */
export default function GoalRing({ goals }: { goals: Goal[] }) {
  const t = useT(), n = goals.filter((g) => g.done).length, R = 34, C = 2 * Math.PI * R;
  return <section className="goal" aria-label={t("Today's goals")}>
    <div className="goal-ring" role="img" aria-label={t("{n} of {m} goals done", { n, m: goals.length })}>
      <svg viewBox="0 0 80 80" width="84" height="84" aria-hidden="true"><circle cx="40" cy="40" r={R} className="goal-bg" /><circle cx="40" cy="40" r={R} className="goal-fg" strokeDasharray={C} strokeDashoffset={C * (1 - n / goals.length)} transform="rotate(-90 40 40)" /></svg>
      <b>{n}/{goals.length}</b>
    </div>
    <div className="goal-list"><h2 className="goal-title">{n === goals.length ? t("All goals done today 🎉") : t("Today's goals")}</h2>
      {goals.map((g) => <Link key={g.label} to={g.to} className={"goal-item" + (g.done ? " is-done" : "")}><span className="goal-tick" aria-hidden="true">{g.done && <Check size={13} />}</span>{t(g.label)}</Link>)}
    </div>
  </section>;
}
