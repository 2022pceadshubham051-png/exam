import { useEffect, useState } from "react"; import { Link, useParams } from "react-router-dom";
import { PlayCircle, BookOpen, Users, Lock, Link2, Share2, GraduationCap } from "lucide-react";
import PublicShell from "../components/PublicShell"; import Poster from "../components/Poster"; import { Stars, RatingLine } from "../components/CourseReviews";
import { api } from "../lib/api"; import { getMe } from "../lib/auth"; import { rupees, courseUrl, shareUrl } from "../lib/courses"; import { useSeo } from "../lib/seo"; import { toast } from "../components/ui";

/** Public page of one course at /c/<slug>: readable without logging in, with its own title, description and link preview. */
export default function PublicCourse() {
  const { slug } = useParams(); const [c, setC] = useState<any>(null); const [err, setErr] = useState(""); const me = getMe();
  useEffect(() => { setC(null); setErr(""); api(`/public/courses/${slug}`).then(setC).catch((e) => setErr(e.message)); }, [slug]);
  const page = c ? courseUrl(c.slug ?? c.id) : "";
  useSeo(c ? { title: `${c.seoTitle || c.title} | ExamForge`, description: c.seoDescription || c.description?.slice(0, 160) || `Video course for ${c.examName ?? "your exam"} on ExamForge.`, canonical: page,
    image: c.posterUrl?.startsWith("http") ? c.posterUrl : `${(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || location.origin}/api/public/courses/${c.slug ?? c.id}/poster`,
    jsonLd: { "@context": "https://schema.org", "@type": "Course", name: c.title, description: c.description ?? undefined, provider: { "@type": "Organization", name: "ExamForge" }, offers: { "@type": "Offer", price: c.priceInr, priceCurrency: "INR", url: page },
      ...(c.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: c.rating, reviewCount: c.ratingCount } } : {}) } } : null);
  const go = () => { try { sessionStorage.setItem("ef_after_login", `/courses/${c.slug ?? c.id}`); } catch { /* ignore */ } };
  const share = async (wa?: boolean) => {
    if (wa) { window.open(`https://wa.me/?text=${encodeURIComponent(`${c.title}\n${shareUrl(c.slug ?? c.id)}`)}`, "_blank", "noopener"); return; }
    try { if (navigator.share) await navigator.share({ title: c.title, url: page }); else { await navigator.clipboard.writeText(page); toast("Link copied.", "ok"); } } catch { /* cancelled */ }
  };
  if (err) return <PublicShell narrow><div className="card card-pad stack"><h1 style={{ fontSize: "1.4rem" }}>Course not found</h1><p className="sub">{err}</p><Link className="btn btn-primary" style={{ justifySelf: "start" }} to="/">Go to ExamForge</Link></div></PublicShell>;
  if (!c) return <PublicShell narrow><div className="spinner" role="status" aria-label="Loading" style={{ margin: "40px auto" }} /></PublicShell>;
  const lessons = c.subjects.reduce((n: number, s: any) => n + s.lessons.length, 0);
  return <PublicShell><div className="stack" style={{ gap: 18 }}>
    <div className="course-hero card"><Poster src={c.posterUrl} title={c.title} />
      <div className="stack" style={{ gap: 10, padding: "var(--s-5)" }}>
        {c.examName && <span className="pill pill-brand" style={{ justifySelf: "start" }}>{c.examName}</span>}
        <h1 className="h1" style={{ margin: 0 }}>{c.title}</h1>
        <RatingLine rating={c.rating} count={c.ratingCount} />
        {c.description && <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{c.description}</p>}
        <div className="course-meta"><span><PlayCircle size={14} aria-hidden="true" />{lessons} lessons</span><span><BookOpen size={14} aria-hidden="true" />{c.subjects.length} subjects</span><span><Users size={14} aria-hidden="true" />{c.students} students</span></div>
        <div className="course-price big">{c.priceInr > 0 ? rupees(c.priceInr) : "Free"}</div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {me ? <Link className="btn btn-primary btn-lg" to={`/courses/${c.slug ?? c.id}`}><GraduationCap size={18} aria-hidden="true" />{me.role === "ADMIN" ? "Open course" : c.priceInr > 0 ? "Enroll now" : "Start learning"}</Link>
            : <Link className="btn btn-primary btn-lg" to="/login?reg=1" onClick={go}><GraduationCap size={18} aria-hidden="true" />{c.priceInr > 0 ? "Register to enroll" : "Register to start free"}</Link>}
          {!me && <Link className="btn btn-lg" to="/login" onClick={go}>I have an account</Link>}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button type="button" className="btn btn-sm" onClick={() => share()}><Link2 size={15} aria-hidden="true" />Share</button><button type="button" className="btn btn-sm" onClick={() => share(true)}><Share2 size={15} aria-hidden="true" />WhatsApp</button></div>
      </div></div>
    <section className="card curriculum wide" aria-label="Course content"><div className="curr-head"><b>Course content</b><span className="sub">{lessons} lessons</span></div>
      {c.subjects.map((s: any) => <details key={s.id} className="curr-sub" open><summary><b>{s.name}</b><span className="sub">{s.lessons.length}</span></summary>
        <ul>{s.lessons.map((l: any) => <li key={l.id}><div className={`curr-lesson ${l.isPreview ? "" : "locked"}`}><span className="curr-ico" aria-hidden="true">{l.isPreview ? <PlayCircle size={15} /> : <Lock size={15} />}</span><span className="curr-t">{l.title}</span>{l.isPreview && <span className="pill pill-brand">Free preview</span>}{l.durationMin ? <span className="sub curr-d">{l.durationMin}m</span> : null}</div></li>)}</ul></details>)}</section>
    {c.reviews.length > 0 && <section className="card card-pad stack" style={{ gap: 12 }} aria-label="Reviews"><h2 className="card-title" style={{ margin: 0 }}>What students say</h2>
      <ul className="review-list">{c.reviews.map((r: any, i: number) => <li key={i}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><Stars value={r.rating} size={14} /><b>{r.by}</b></div>{r.text && <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{r.text}</p>}</li>)}</ul></section>}
  </div></PublicShell>;
}
