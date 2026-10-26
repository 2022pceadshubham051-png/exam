import { useEffect, type ReactNode } from "react"; import { Link, useParams, Navigate } from "react-router-dom";
import { Mail } from "lucide-react"; import PublicShell from "../components/PublicShell"; import { SITE, CONTACT_EMAIL, TIPS } from "../lib/content";

const useTitle = (t: string) => useEffect(() => { document.title = `${t} | ${SITE}`; }, [t]);
export const Doc = ({ title, children }: { title: string; children: ReactNode }) => { useTitle(title); return <PublicShell narrow><article className="card card-pad prose"><h1>{title}</h1>{children}</article></PublicShell>; };
export const UPDATED = "26 October 2026";
const Mail_ = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export const About = () => <Doc title={`About ${SITE}`}>
  <p>{SITE} is an online learning platform for students preparing for competitive and school exams. We combine <b>video courses</b> taught by our faculty with <b>full-length mock tests</b>, so you can learn a topic, practise it and measure your progress in one place.</p>
  <h2>What you can do on {SITE}</h2>
  <ul>
    <li><b>Learn from video courses:</b> structured subjects and lessons, downloadable lecture notes, playback speed control, bookmarks and your own notes at any moment of a video, and the option to watch downloaded lessons offline.</li>
    <li><b>Practise like the real exam:</b> timed mock tests with section and question timers, negative marking where the exam has it, and untimed practice with instant explanations.</li>
    <li><b>Know where you stand:</b> accuracy, speed and topic-wise analysis after every attempt, adaptive practice from your weaker topics, and a smart coach that plans your preparation.</li>
    <li><b>Get your doubts solved:</b> ask under any lesson and get help from classmates, your teacher or the built-in AI tutor.</li>
    <li><b>Stay on track:</b> daily challenges, streaks, a mistake notebook for revision, and optional notifications for new lessons and announcements.</li>
  </ul>
  <h2>Our approach to quality</h2>
  <p>Courses and questions are prepared and reviewed by the site administrator before they are published. If you notice a wrong answer, a typing mistake or a problem in a lecture, please tell us at <Mail_ /> and we will correct it.</p>
  <h2>Free and paid content</h2>
  <p>Mock tests and several lessons are free. Some courses are paid; the price is always shown on the course page before you enrol. Please read our <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/refund">Refund Policy</Link> before buying a course.</p>
  <h2>Contact</h2>
  <p>Write to us at <Mail_ /> or visit the <Link to="/contact">contact page</Link>.</p>
</Doc>;

export const Contact = () => <Doc title="Contact us">
  <p>We are happy to help with questions about courses, payments, your account, or the tests. Write to us and we will reply as soon as we can.</p>
  <p className="row" style={{ gap: 8 }}><Mail size={18} /><a href={`mailto:${CONTACT_EMAIL}`}><b>{CONTACT_EMAIL}</b></a></p>
  <h2>Reply time</h2>
  <p>We usually reply within 1 to 2 working days. Payment and access problems are looked at first.</p>
  <h2>To help us answer faster, please include</h2>
  <ul>
    <li><b>Payment or access problem:</b> the email you registered with, the course name, the date, the amount and the UPI transaction ID.</li>
    <li><b>Wrong question or answer:</b> the test name and the question number.</li>
    <li><b>Video or notes problem:</b> the course and lesson name, your device and browser, and a screenshot if possible.</li>
    <li><b>Account or data request:</b> write from your registered email address so we can verify it is you.</li>
  </ul>
  <p>Useful pages: <Link to="/terms">Terms &amp; Conditions</Link> · <Link to="/privacy">Privacy Policy</Link> · <Link to="/refund">Refund Policy</Link>.</p>
</Doc>;

export const Privacy = () => <Doc title="Privacy Policy">
  <p className="muted">Last updated: {UPDATED}</p>
  <p>This Privacy Policy explains what personal information {SITE} ("we", "us") collects when you use our website and app, why we collect it, who we share it with, and the choices you have. By creating an account or using the service you agree to this policy. If you do not agree, please do not use the service.</p>

  <h2>1. Information we collect</h2>
  <ul>
    <li><b>Account details:</b> your name, email address and a securely hashed password. If you sign in with Google, we receive your name, email address and Google account identifier from Google. We never see your Google password.</li>
    <li><b>Learning activity:</b> tests attempted, answers, scores, time taken, courses you enrol in, lessons completed, the position where you stopped a video, your notes and bookmarks, reviews and ratings you write, and doubts and replies you post.</li>
    <li><b>Payment details:</b> for paid courses we record the course, the amount, any coupon used and the UPI transaction ID you submit. We do <b>not</b> collect or store your card, UPI PIN or bank login details. Payments are made directly to the account shown on the course page.</li>
    <li><b>Device and security information:</b> a random device identifier, browser and operating-system type, and the time of your last activity. We use this to sign you in, to limit an account to two devices at a time, and to protect the platform from misuse.</li>
    <li><b>Notification data:</b> if you turn on notifications, your browser gives us a push subscription address so we can deliver them. You can turn this off at any time.</li>
    <li><b>Content on your device:</b> lecture notes and videos you choose to save for offline use are stored only in your own browser storage. They are removed when you remove them, when they expire, or when you log out.</li>
    <li><b>Messages to us:</b> anything you send to our contact email.</li>
  </ul>

  <h2>2. How we use your information</h2>
  <ul>
    <li>to create and secure your account, verify your email address and let you reset your password;</li>
    <li>to provide courses, tests, results, analysis, notes, doubts and recommendations;</li>
    <li>to approve payments, apply coupons and give or remove course access;</li>
    <li>to show a <b>watermark with your name and email on lecture videos</b>, so that leaked recordings can be traced and course content is protected;</li>
    <li>to send service messages such as verification and password-reset emails, enrolment confirmations and (if you allow) push notifications;</li>
    <li>to show leaderboards, to improve the service, to prevent fraud and abuse, and to meet legal obligations.</li>
  </ul>
  <p>We do not sell your personal information.</p>

  <h2>3. Who we share it with</h2>
  <p>We use trusted service providers who process data only to run the service:</p>
  <ul>
    <li><b>Hosting and database</b> providers that store the application and its data.</li>
    <li><b>Google</b> for sign-in, and for the YouTube player when a lesson is hosted on YouTube. YouTube and Google may collect data under their own policies when the player loads.</li>
    <li><b>Bunny.net</b> or a similar video host when a lesson is hosted there.</li>
    <li><b>An email provider</b> to deliver verification and reset emails.</li>
    <li><b>An AI provider</b> when you use the AI tutor: the text of the question or doubt you submit (and the lesson title) is sent to the provider to generate an answer. Please do not put personal information in doubts.</li>
    <li><b>Advertising partners</b> (see section 5).</li>
  </ul>
  <p>Your first name and last initial may be shown with your reviews, doubts and replies; on leaderboards your display name and scores may be visible to other students. Your email address is never shown to other students. Your teacher/administrator can see your name, email, enrolment, payment reference, progress and doubts. We may also disclose information if required by law or to protect our rights and users.</p>

  <h2>4. Cookies and local storage</h2>
  <p>We store a login token, your preferences (theme, language, playback speed), a device identifier and in-progress test data in your browser so the service works. Offline notes and videos use your browser's storage. These are necessary for the service and are not used to track you across other sites.</p>

  <h2>5. Advertising</h2>
  <p>We may show ads served by Google AdSense and other third-party partners on some public pages. These partners may use cookies or similar technologies to show ads based on your previous visits to this and other websites. You can opt out of personalised advertising at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>. There are no ads inside the exam screen or the video player.</p>

  <h2>6. How long we keep data</h2>
  <p>We keep your account and learning data while your account is active. Payment records are kept as long as needed for accounting and dispute handling. Password-reset and verification links expire automatically. You can delete test attempts and your own notes, doubts and reviews from within the app. When you ask us to delete your account, we remove or anonymise your personal data, except what we must keep by law.</p>

  <h2>7. Security</h2>
  <p>Passwords are stored only as salted hashes. Course videos and notes are sent only to enrolled students, and video links are time-limited where our video host supports it. No system is perfectly secure, so please use a strong, unique password and do not share your account; sharing may lead to your access being removed.</p>

  <h2>8. Your rights and choices</h2>
  <p>Subject to applicable law, including India's Digital Personal Data Protection Act, 2023, you may ask to access, correct or delete your personal data, withdraw consent, or raise a complaint. You can turn off notifications in your browser, remove offline downloads inside the app, and delete your attempts from the dashboard. To make a request, email <Mail_ /> from your registered address. We will respond within a reasonable time.</p>

  <h2>9. Children</h2>
  <p>{SITE} is meant for students. If you are under 18, please use the service with the knowledge and consent of a parent or guardian. We do not knowingly collect more information from children than is needed to run their account. A parent or guardian who believes a child has given us information without consent can contact us to have it removed.</p>

  <h2>10. Changes to this policy</h2>
  <p>We may update this policy from time to time. The date at the top shows the latest version. If a change is significant we will tell you in the app or by email.</p>

  <h2>11. Contact</h2>
  <p>For questions, requests or complaints about privacy, write to <Mail_ />.</p>
</Doc>;

export const TipsList = () => { useTitle("Exam preparation tips"); return <PublicShell><div className="stack" style={{ gap: 18 }}>
  <div><h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Exam preparation tips</h1><p className="sub">Practical advice on mock tests, time management and analysis.</p></div>
  <div className="grid-auto">{TIPS.map((t) => <Link key={t.slug} to={`/tips/${t.slug}`} className="card card-pad stack pub-link" style={{ gap: 6 }}><b>{t.title}</b><span className="sub">{t.summary}</span></Link>)}</div></div></PublicShell>; };

export const TipPage = () => {
  const { slug } = useParams(); const t = TIPS.find((x) => x.slug === slug); useTitle(t?.title ?? "Exam tips");
  if (!t) return <Navigate to="/tips" replace />;
  return <PublicShell narrow><article className="card card-pad prose"><h1>{t.title}</h1>{t.body.map((p, i) => <p key={i}>{p}</p>)}
    <div className="row" style={{ marginTop: 18, gap: 10 }}><Link className="btn btn-primary" to="/login">Try a mock test</Link><Link className="btn" to="/tips">More articles</Link></div></article></PublicShell>;
};
