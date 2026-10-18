import { Link } from "react-router-dom"; import { Timer, BookOpenText, ArrowRight } from "lucide-react";
import Shell from "../components/Shell"; import { PageHeader } from "../components/ui"; import { TIPS } from "../lib/content"; import { useT } from "../lib/i18n";
export default function Learn() {
  const t = useT();
  return <Shell><div className="stack stagger" style={{ gap: 22 }}>
    <PageHeader title={t("Learn")} sub="" />
    <Link className="card card-pad row tap-card learn-pace" to="/lecture-pace" style={{ gap: 14 }}><Timer size={26} aria-hidden="true" /><div style={{ flex: 1 }}><b>{t("Lecture Pace")}</b><p className="sub" style={{ margin: 0 }}>{t("Time your lectures and beat your own pace.")}</p></div><ArrowRight size={18} aria-hidden="true" /></Link>
    <section className="stack" style={{ gap: 12 }} aria-labelledby="tips-h"><h2 className="card-title row" style={{ gap: 8 }} id="tips-h"><BookOpenText size={18} aria-hidden="true" />{t("Study material")}</h2>
      <div className="learn-list">{TIPS.map((x) => <Link key={x.slug} className="card card-pad stack tap-card" style={{ gap: 4 }} to={`/tips/${x.slug}`}><b>{x.title}</b><span className="sub">{x.summary}</span></Link>)}</div></section>
  </div></Shell>;
}
