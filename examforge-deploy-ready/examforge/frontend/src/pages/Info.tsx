import { useEffect, type ReactNode } from "react"; import { Link, useParams, Navigate } from "react-router-dom";
import { Mail } from "lucide-react"; import PublicShell from "../components/PublicShell"; import { SITE, CONTACT_EMAIL, TIPS } from "../lib/content";

const useTitle = (t: string) => useEffect(() => { document.title = `${t} | ${SITE}`; }, [t]);
const Doc = ({ title, children }: { title: string; children: ReactNode }) => { useTitle(title); return <PublicShell narrow><article className="card card-pad prose"><h1>{title}</h1>{children}</article></PublicShell>; };

export const About = () => <Doc title="About ExamForge">
  <p>{SITE} is an online mock test platform for students preparing for competitive and school exams. It is built to feel like the real paper: timed sections, negative marking where the exam has it, and a detailed analysis after every attempt.</p>
  <h2>What you can do here</h2>
  <ul><li>Take full-length timed mock tests with section and question timers.</li><li>Use untimed practice mode with instant answers and explanations.</li><li>Get adaptive practice sets built from your weaker topics.</li><li>Track accuracy, speed and topic-wise performance across attempts.</li><li>Compare yourself with others on the leaderboard (official exam attempts only).</li></ul>
  <h2>How tests are made</h2>
  <p>Questions are added by the site administrator, reviewed and verified before a test is published. If you find a wrong answer or a typo in any question, please tell us through the <Link to="/contact">contact page</Link> so it can be corrected.</p>
  <h2>Free to use</h2>
  <p>{SITE} is free for students. The site may show advertisements on some pages to cover running costs. There are no ads inside the exam screen.</p>
</Doc>;

export const Contact = () => <Doc title="Contact us">
  <p>Questions, feedback, a wrong answer key, or a problem with your account? Write to us and we will reply as soon as we can.</p>
  <p className="row" style={{ gap: 8 }}><Mail size={18} /><a href={`mailto:${CONTACT_EMAIL}`}><b>{CONTACT_EMAIL}</b></a></p>
  <p>When reporting a wrong question, include the test name and the question number so we can find it quickly.</p>
</Doc>;

export const Privacy = () => <Doc title="Privacy policy">
  <p className="muted">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
  <p>This policy explains what information {SITE} collects, how it is used, and the choices you have. By using the site you agree to this policy.</p>
  <h2>Information we collect</h2>
  <ul><li><b>Account details:</b> your name, email address and a securely hashed password when you register.</li><li><b>Test activity:</b> the tests you attempt, your answers, scores, time taken and results, so that we can show your history, progress and the leaderboard.</li><li><b>Technical data:</b> basic information such as browser type and IP address that servers receive with every request, used for security and abuse prevention.</li></ul>
  <h2>How we use it</h2>
  <p>We use your information to run the service: to log you in, score your tests, show your analysis, rank the leaderboard, and keep the platform secure. We do not sell your personal information.</p>
  <h2>Cookies and local storage</h2>
  <p>The site stores a login token and your preferences (theme, sound, in-progress answers) in your browser's local storage so that it works properly. This is needed for the site to function.</p>
  <h2>Advertising</h2>
  <p>We may show ads served by Google AdSense and other third-party advertising partners. These partners use cookies or similar technologies to show ads based on your previous visits to this and other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to this site and other sites on the internet.</p>
  <p>You can opt out of personalised advertising at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>. For more about how Google uses data from sites that use its services, see <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>. Ads are never shown inside the exam screen.</p>
  <h2>Leaderboard</h2>
  <p>If a test has a leaderboard, your display name and official exam scores can be visible to other students.</p>
  <h2>Data retention and your choices</h2>
  <p>You can delete your attempts from the dashboard at any time. To ask for your account and data to be removed, contact us using the details below.</p>
  <h2>Children</h2>
  <p>{SITE} is meant for students. If you are under 18, please use the site with a parent or guardian's awareness. We do not knowingly collect more information than is needed to run your account.</p>
  <h2>Changes to this policy</h2>
  <p>We may update this policy from time to time. The date above shows when it was last changed.</p>
  <h2>Contact</h2>
  <p>Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
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
