import React, { Component, Suspense, lazy, type ReactElement, type ErrorInfo } from "react";
import { createRoot } from "react-dom/client"; import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import "./index.css";
import Login from "./pages/Login"; import Landing from "./pages/Landing";
import { About, Contact, Privacy, TipsList, TipPage } from "./pages/Info";
import { getMe } from "./lib/auth"; import Splash from "./components/Splash"; import { ToastHost, initReveal } from "./components/ui"; import { initTheme } from "./lib/theme";

// Signed-in screens are split into their own chunks so the landing and login pages stay light (charts and the admin panel load on demand).
const Exam = lazy(() => import("./pages/Exam")); const Result = lazy(() => import("./pages/Result")); const Review = lazy(() => import("./pages/Review"));
const Dashboard = lazy(() => import("./pages/Dashboard")); const Admin = lazy(() => import("./pages/Admin")); const Progress = lazy(() => import("./pages/Progress"));
const Leaderboard = lazy(() => import("./pages/Leaderboard")); const Coach = lazy(() => import("./pages/Coach")); const LecturePace = lazy(() => import("./pages/LecturePace"));
const LecturePaceBoard = lazy(() => import("./pages/LecturePaceBoard")); const Welcome = lazy(() => import("./pages/Welcome")); const ProfilePage = lazy(() => import("./pages/Profile")); const Shop = lazy(() => import("./pages/Shop"));
initTheme(); initReveal();

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
  if (!me) return <Navigate to={testId ? `/login?test=${testId}` : "/login"} replace />;
  if (admin && me.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}
const Home = () => { const me = getMe(); return <Navigate to={me ? (me.role === "ADMIN" ? "/admin" : "/dashboard") : "/login"} replace />; };
const PageLoading = () => <div className="grid min-h-screen place-items-center" role="status"><div className="spinner" aria-hidden="true" /><span className="sr">Loading</span></div>;

createRoot(document.getElementById("root")!).render(<React.StrictMode><AppErrorBoundary><><Splash /><BrowserRouter><Suspense fallback={<PageLoading />}><Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} /><Route path="/privacy" element={<Privacy />} />
  <Route path="/tips" element={<TipsList />} /><Route path="/tips/:slug" element={<TipPage />} />
  <Route path="/login" element={<Login />} />
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
  <Route path="*" element={<Home />} /></Routes></Suspense></BrowserRouter><ToastHost /></></AppErrorBoundary></React.StrictMode>);
