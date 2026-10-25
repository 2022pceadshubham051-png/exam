import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { api } from "../lib/api"; import { useT } from "../lib/i18n"; import { toast } from "./ui";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return <span className="stars" role="img" aria-label={`${value} / 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} aria-hidden="true" className={value >= i - 0.25 ? "on" : value >= i - 0.75 ? "half" : ""} />)}</span>;
}
export const RatingLine = ({ rating, count }: { rating: number; count: number }) => count ? <span className="rating-line"><b>{rating.toFixed(1)}</b><Stars value={rating} size={14} /><span className="sub">({count})</span></span> : null;

/** Ratings summary, the list of reviews, and (for enrolled students) the form to add or change their own review. */
export default function CourseReviews({ course, reload }: { course: any; reload?: () => Promise<unknown> | void }) {
  const t = useT(); const my = course.myReview; const [rating, setRating] = useState<number>(my?.rating ?? 0); const [text, setText] = useState<string>(my?.text ?? ""); const [busy, setBusy] = useState(false);
  const id = course.slug ?? course.id;
  const submit = async () => { if (!rating) return toast(t("Choose a star rating first."), "info"); setBusy(true); try { await api(`/courses/${id}/review`, "PUT", { rating, text: text.trim() || null }); toast(t("Thanks for your review!"), "ok"); await reload?.(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await api(`/courses/${id}/review`, "DELETE"); setRating(0); setText(""); await reload?.(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); } };
  return <section className="card card-pad stack" style={{ gap: 14 }} aria-label={t("Ratings and reviews")}>
    <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}><h2 className="card-title" style={{ margin: 0 }}>{t("Ratings & reviews")}</h2>{course.ratingCount ? <RatingLine rating={course.rating} count={course.ratingCount} /> : <span className="sub">{t("No reviews yet")}</span>}</div>
    {course.canReview && <div className="stack" style={{ gap: 8 }}>
      <b>{my ? t("Your review") : t("Rate this course")}</b>
      <div className="star-pick" role="radiogroup" aria-label={t("Your rating")}>{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i}`} className={rating >= i ? "on" : ""} onClick={() => setRating(i)}><Star size={26} aria-hidden="true" /></button>)}</div>
      <textarea className="textarea" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("What did you like? What could be better? (optional)")} aria-label={t("Your review")} />
      <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-primary btn-sm" disabled={busy || !rating} onClick={submit}>{my ? t("Update review") : t("Submit review")}</button>{my && <button type="button" className="btn btn-sm" disabled={busy} onClick={remove}><Trash2 size={14} aria-hidden="true" />{t("Delete")}</button>}</div>
    </div>}
    {course.reviews?.length ? <ul className="review-list">{course.reviews.map((r: any, i: number) => <li key={i}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><Stars value={r.rating} size={14} /><b>{r.by}</b>{r.mine && <span className="pill pill-brand">{t("You")}</span>}<span className="sub">{new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>{r.text && <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{r.text}</p>}</li>)}</ul> : null}
  </section>;
}
