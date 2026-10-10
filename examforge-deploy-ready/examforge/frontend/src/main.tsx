import React, { Component, type ReactElement, type ErrorInfo } from "react";
import { createRoot } from "react-dom/client"; import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import "./index.css"; import "./game.css"; import "./cartoon.css"; import "./aura.css"; import "./astra.css"; import "./public.css"; import Login from "./pages/Login"; import Exam from "./pages/Exam"; import Result from "./pages/Result"; import Dashboard from "./pages/Dashboard"; import Review from "./pages/Review"; import Admin from "./pages/Admin"; import Progress from "./pages/Progress"; import Leaderboard from "./pages/Leaderboard"; import Coach from "./pages/Coach"; import Landing from "./pages/Landing"; import { About, Contact, Privacy, TipsList, TipPage } from "./pages/Info";
import { getMe } from "./lib/auth"; import Splash from "./components/Splash";

class AppErrorBoundary extends Component<{children: ReactElement},{error: Error|null}> {
  state={error:null as Error|null};
  static getDerivedStateFromError(error: Error){ return {error}; }
  componentDidCatch(error: Error, info: ErrorInfo){ console.error("ExamForge UI error", error, info); }
  render(){
    if(this.state.error) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{maxWidth:620}}><div className="alert alert-bad"><b>Something went wrong while loading this page.</b></div><p className="sub">The error has been contained so the whole app does not disappear. Reload the page or return to the dashboard.</p><pre className="mono" style={{whiteSpace:"pre-wrap",background:"var(--bg)",padding:12,borderRadius:10,overflow:"auto"}}>{this.state.error.message}</pre><div className="row"><button className="btn btn-primary" onClick={()=>location.reload()}>Reload page</button><button className="btn" onClick={()=>location.href="/dashboard"}>Dashboard</button></div></div></div>;
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

createRoot(document.getElementById("root")!).render(<React.StrictMode><AppErrorBoundary><><Splash /><BrowserRouter><Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} /><Route path="/privacy" element={<Privacy />} />
  <Route path="/tips" element={<TipsList />} /><Route path="/tips/:slug" element={<TipPage />} />
  <Route path="/login" element={<Login />} />
  <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
  <Route path="/progress" element={<Guard><Progress /></Guard>} />
  <Route path="/coach" element={<Guard><Coach /></Guard>} />
  <Route path="/leaderboard" element={<Guard><Leaderboard /></Guard>} />
  <Route path="/exam/:testId" element={<Guard><Exam /></Guard>} />
  <Route path="/result/:attemptId" element={<Guard><Result /></Guard>} />
  <Route path="/review/:attemptId" element={<Guard><Review /></Guard>} />
  <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
  <Route path="*" element={<Home />} /></Routes></BrowserRouter></></AppErrorBoundary></React.StrictMode>);
