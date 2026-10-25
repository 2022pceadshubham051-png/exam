import nodemailer from "nodemailer";

/** Email sending. Configure either SMTP_URL (smtps://user:pass@host:465) or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.
 *  Without any of these, mail is "off": links are printed to the server log and sign-ups are auto-verified,
 *  so local development and existing deployments keep working until you add SMTP. */
let tx: nodemailer.Transporter | null | undefined;
const transport = () => {
  if (tx !== undefined) return tx;
  const { SMTP_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_URL) tx = nodemailer.createTransport(SMTP_URL);
  else if (SMTP_HOST) tx = nodemailer.createTransport({ host: SMTP_HOST, port: +(SMTP_PORT ?? 587), secure: +(SMTP_PORT ?? 587) === 465, auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined });
  else tx = null;
  return tx;
};
export const mailEnabled = () => !!transport();
export const frontendUrl = () => (process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN?.split(",")[0] ?? "http://localhost:5173").trim().replace(/\/$/, "");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const shell = (title: string, body: string, cta: { label: string; url: string }) => `<div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1b2430">
<h2 style="margin:0 0 12px">${esc(title)}</h2><p style="line-height:1.55">${body}</p>
<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#1d4f91;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>
<p style="font-size:12px;color:#6b7684;word-break:break-all">If the button does not work, copy this link:<br>${esc(cta.url)}</p></div>`;

/** Sends one email. Returns false (and logs the message) when SMTP is not configured or sending failed. Never throws. */
export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const t = transport();
  if (!t) { console.log(`[mail disabled] To: ${to}\nSubject: ${subject}\n${text}\n`); return false; }
  try { await t.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "ExamForge <no-reply@examforge.local>", to, subject, html, text }); return true; }
  catch (e: any) { console.error("Mail failed:", e?.message); return false; }
}
export const sendVerifyMail = (to: string, name: string, token: string) => {
  const url = `${frontendUrl()}/verify-email?token=${token}`;
  return sendMail(to, "Verify your ExamForge email", shell("Confirm your email", `Hi ${esc(name)}, tap the button to verify your email and start learning. This link works for 24 hours.`, { label: "Verify email", url }), `Hi ${name}, verify your email (valid 24 hours): ${url}`);
};
export const sendResetMail = (to: string, name: string, token: string) => {
  const url = `${frontendUrl()}/reset-password?token=${token}`;
  return sendMail(to, "Reset your ExamForge password", shell("Reset your password", `Hi ${esc(name)}, we got a request to reset your password. The link works for 1 hour. If this was not you, ignore this email.`, { label: "Choose a new password", url }), `Hi ${name}, reset your password (valid 1 hour): ${url}`);
};
