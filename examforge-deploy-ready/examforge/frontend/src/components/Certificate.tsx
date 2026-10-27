import { useEffect, useState } from "react";
import { Award, Download, FileDown, Share2 } from "lucide-react";
import { toast } from "./ui"; import { useT } from "../lib/i18n"; import { getMe } from "../lib/auth"; import { loadProfile } from "../lib/profile"; import { courseUrl } from "../lib/courses";
import { downloadCertificate, drawCertificate, shareCertificate, type CertInput } from "../lib/certificate";

/** Shown when every lecture of a course is done: a certificate with the student's name that can be shared on WhatsApp or saved as a picture / PDF. */
export default function Certificate({ course }: { course: any }) {
  const t = useT(); const [name, setName] = useState(""); const [preview, setPreview] = useState(""); const [busy, setBusy] = useState("");
  useEffect(() => { let live = true; loadProfile().then((p) => live && setName(p.name || "")).catch(() => {}); return () => { live = false; }; }, []);
  const input: CertInput = { name, course: course.title, exam: course.examName, lessons: course.lessonCount ?? 0, subjects: (course.subjects ?? []).length, userId: getMe()?.id ?? "me", courseId: course.id };
  useEffect(() => { if (!name) return; let live = true; void drawCertificate({ ...input }).then((c) => { if (live) setPreview(c.toDataURL("image/jpeg", 0.7)); }).catch(() => {}); return () => { live = false; }; }, [name, course.id]); // eslint-disable-line
  const run = (key: string, fn: () => Promise<unknown>) => async () => { setBusy(key); try { await fn(); } catch (e: any) { toast(e?.message || t("Could not make the certificate."), "bad"); } finally { setBusy(""); } };
  const share = run("share", async () => { const r = await shareCertificate({ ...input }, courseUrl(course.slug ?? course.id)); if (r === "downloaded") toast(t("Certificate saved. Attach it in WhatsApp."), "ok"); });
  return <section className="card card-pad cert-card" aria-label={t("Your certificate")}>
    <div className="cert-prev">{preview ? <img src={preview} alt={t("Your certificate")} width={320} height={226} /> : <span className="skeleton" style={{ width: "100%", height: "100%", minHeight: 150 }} aria-hidden="true" />}</div>
    <div className="stack" style={{ gap: 10, minWidth: 0 }}>
      <div><b className="row" style={{ gap: 8 }}><Award size={18} aria-hidden="true" />{t("Course complete! Your certificate is ready.")}</b><p className="sub" style={{ margin: "2px 0 0" }}>{t("It has your name. Share it with friends and family.")}</p></div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-wa btn-sm" disabled={!name || !!busy} onClick={share}><Share2 size={15} aria-hidden="true" />{t("Share on WhatsApp")}</button>
        <button type="button" className="btn btn-sm" disabled={!name || !!busy} onClick={run("png", () => downloadCertificate({ ...input }, "png"))}><Download size={15} aria-hidden="true" />{t("Image")}</button>
        <button type="button" className="btn btn-sm" disabled={!name || !!busy} onClick={run("pdf", () => downloadCertificate({ ...input }, "pdf"))}><FileDown size={15} aria-hidden="true" />PDF</button>
      </div>
    </div>
  </section>;
}
