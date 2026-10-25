import React, { Component, Suspense, lazy, type ReactElement, type ErrorInfo } from "react";
import { createRoot } from "react-dom/client"; import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import "@fontsource-variable/archivo";
import "@fontsource/hind/400.css"; import "@fontsource/hind/500.css"; import "@fontsource/hind/600.css"; import "@fontsource/hind/700.css";
import "./index.css";
import Login from "./pages/Login"; import PublicCourse from "./pages/PublicCourse"; import { VerifyEmail, ForgotPassword, ResetPassword } from "./pages/AuthExtra"; import Landing from "./pages/Landing"; import NotFound from "./pages/NotFound";
import { About, Contact, Privacy, TipsList, TipPage } from "./pages/Info";
import { getMe } from "./lib/auth"; import { api } from "./lib/api"; import { captureRef } from "./lib/engage"; import Splash from "./components/Splash"; import InstallPrompt from "./components/InstallPrompt"; import { ToastHost, initReveal } from "./components/ui"; import { initTheme } from "./lib/theme";

// Signed-in screens are split into their own chunks so the landing and login pages stay light (charts and the admin panel load on demand).
const Exam = lazy(() => import("./pages/Exam")); const Result = lazy(() => import("./pages/Result")); const Review = lazy(() => import("./pages/Review"));
const Dashboard = lazy(() => import("./pages/Dashboard")); const Admin = lazy(() => import("./pages/Admin")); const Progress = lazy(() => import("./pages/Progress"));
const Leaderboard = lazy(() => import("./pages/Leaderboard")); const Coach = lazy(() => import("./pages/Coach")); const LecturePace = lazy(() => import("./pages/LecturePace"));
const LecturePaceBoard = lazy(() => import("./pages/LecturePaceBoard")); const Welcome = lazy(() => import("./pages/Welcome")); const ProfilePage = lazy(() => import("./pages/Profile")); const Shop = lazy(() => import("./pages/Shop")); const HomeTab = lazy(() => import("./pages/Home")); const Notebook = lazy(() => import("./pages/Notebook")); const Rooms = lazy(() => import("./pages/Rooms")); const Daily = lazy(() => import("./pages/Daily")); const Duels = lazy(() => import("./pages/Duels")); const DuelPlay = lazy(() => import("./pages/Duels").then((m) => ({ default: m.DuelPlay }))); const League = lazy(() => import("./pages/League")); const AdminReports = lazy(() => import("./pages/AdminReports")); const Revise = lazy(() => import("./pages/Revise")); const Courses = lazy(() => import("./pages/Courses")); const CourseDetail = lazy(() => import("./pages/Courses").then((m) => ({ default: m.CourseDetail }))); const AdminCourses = lazy(() => import("./pages/AdminCourses")); const OfflineNotes = lazy(() => import("./pages/OfflineNotes")); const AdminCourseStats = lazy(() => import("./pages/AdminCourseStats")); const AdminStudents = lazy(() => import("./pages/AdminStudents")); const AdminCoupons = lazy(() => import("./pages/AdminCoupons")); const RoomDetail = lazy(() => import("./pages/Rooms").then((m) => ({ default: m.RoomDetail })));
initTheme(); initReveal(); captureRef();

class AppErrorBoundary extends Component<{ children: ReactElement }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ExamForge UI error", error, info); }
  render() {
    if (this.state.error) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{ maxWidth: 560 }} role="alert"><h1 style={{ fontSize: "1.3rem" }}>Something went wrong on this page</h1><p className="sub">The rest of the app is still fine. Reload the page, or go back to your dashboard. Your saved answers are not affected.</p><pre className="mono" style={{ whiteSpace: "pre-wrap", background: "var(--surface-2)", padding: 12, borderRadius: 10, overflow: "auto" }}>{this.state.error.message}</pre><div className="row"><button className="btn btn-primary" onClick={() => location.reload()}>Reload page</button><button className="btn" onClick={() => (location.href = "/dashboard")}>Dashboard</button></div></div></div>;
    return this.props.children;
  }
}

function Guard({ children, admin }: { children: ReactElement; admin?: boolean }) {
  const me = getMe(); const { testId } = useParams();
  if (!me) { try { if (/^\/(rooms|duel|daily)/.test(location.pathname)) sessionStorage.setItem("ef_after_login", location.pathname + location.search); } catch { /* ignore */ } }
  if (!me) return <Navigate to={testId ? `/login?test=${testId}` : "/login"} replace />;
  if (admin && me.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}
const PageLoading = () => <div className="grid min-h-screen place-items-center" role="status"><div className="spinner" aria-hidden="true" /><span className="sr">Loading</span></div>;

// Start the first screen's data requests right now, in parallel with downloading the screen's code (instead of after it).
// Without this the API calls only begin once the page chunk has been parsed and rendered, about 0.6 s later on a slow phone.
const EARLY: Record<string, string[]> = {
  "/home": ["/courses", "/profile", "/coins", "/sync", "/streak", "/daily", "/history?limit=60", "/tests?limit=100&q=", "/progress?period=all&scope=all", "/tests/leaderboard?limit=20"],
  "/dashboard": ["/profile", "/coins", "/sync", "/history", "/tests?limit=100&q="],
  "/daily": ["/profile", "/coins", "/streak", "/daily"], "/notebook": ["/profile", "/coins", "/sync"], "/shop": ["/profile", "/coins", "/shop"],
};
if (localStorage.getItem("token")) for (const p of EARLY[location.pathname] ?? []) api(p).catch(() => {});

// Warm the most-used screens while the browser is idle, so tapping a tab feels instant (skipped on data saver / low-data mode).
const warm = () => { const c = (navigator as any).connection; if (c?.saveData || /2g|3g/.test(c?.effectiveType ?? "") || localStorage.getItem("ef_lite") === "1" || !localStorage.getItem("token")) return; void Promise.allSettled([import("./pages/Home"), import("./pages/Dashboard"), import("./pages/Daily"), import("./pages/Courses"), import("./pages/Notebook"), import("./pages/Revise")]); };
// Wait until the current screen is fully loaded (5 s after load) so warming never competes with what the student is waiting for.
window.addEventListener("load", () => setTimeout(() => ((window as any).requestIdleCallback ? (window as any).requestIdleCallback(warm, { timeout: 5000 }) : warm()), 5000));
if ("serviceWorker" in navigator && import.meta.env.PROD) window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });

createRoot(document.getElementById("root")!).render(<React.StrictMode><AppErrorBoundary><><Splash /><InstallPrompt /><BrowserRouter><Suspense fallback={<PageLoading />}><Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} /><Route path="/privacy" element={<Privacy />} />
  <Route path="/tips" element={<TipsList />} /><Route path="/tips/:slug" element={<TipPage />} />
  <Route path="/login" element={<Login />} />
  <Route path="/verify-email" element={<VerifyEmail />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/c/:slug" element={<PublicCourse />} />
  <Route path="/home" element={<Guard><HomeTab /></Guard>} /><Route path="/learn" element={<Navigate to="/rooms" replace />} /><Route path="/notebook" element={<Guard><Notebook /></Guard>} /><Route path="/rooms" element={<Guard><Rooms /></Guard>} /><Route path="/rooms/:id" element={<Guard><RoomDetail /></Guard>} />
  <Route path="/daily" element={<Guard><Daily /></Guard>} /><Route path="/duel" element={<Guard><Duels /></Guard>} /><Route path="/duel/:code" element={<Guard><DuelPlay /></Guard>} /><Route path="/league" element={<Guard><League /></Guard>} /><Route path="/admin/reports" element={<Guard admin><AdminReports /></Guard>} /><Route path="/revise" element={<Guard><Revise /></Guard>} />
  <Route path="/courses" element={<Guard><Courses /></Guard>} /><Route path="/courses/:id" element={<Guard><CourseDetail /></Guard>} /><Route path="/admin/courses" element={<Guard admin><AdminCourses /></Guard>} /><Route path="/admin/course-stats" element={<Guard admin><AdminCourseStats /></Guard>} /><Route path="/admin/students" element={<Guard admin><AdminStudents /></Guard>} /><Route path="/admin/coupons" element={<Guard admin><AdminCoupons /></Guard>} /><Route path="/offline-notes" element={<Guard><OfflineNotes /></Guard>} />
  <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
  <Route path="/progress" element={<Guard><Progress /></Guard>} />
  <Route path="/coach" element={<Guard><Coach /></Guard>} />
  <Route path="/lecture-pace" element={<Guard><LecturePace /></Guard>} />
  <Route path="/lecture-pace/leaderboard" element={<Guard><LecturePaceBoard /></Guard>} />
  <Route path="/welcome" element={<Guard><Welcome /></Guard>} />
  <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
  <Route path="/shop" element={<Guard><Shop /></Guard>} />
  <Route path="/leaderboard" element={<Guard><Leaderboard /></Guard>} />
  <Route path="/exam/:testId" element={<Guard><Exam /></Guard>} />
  <Route path="/result/:attemptId" element={<Guard><Result /></Guard>} />
  <Route path="/review/:attemptId" element={<Guard><Review /></Guard>} />
  <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
  <Route path="*" element={<NotFound />} /></Routes></Suspense></BrowserRouter><ToastHost /></></AppErrorBoundary></React.StrictMode>);
requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("boot")?.remove()));
