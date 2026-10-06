import React, { type ReactElement } from "react"; import { createRoot } from "react-dom/client"; import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import "./index.css"; import Login from "./pages/Login"; import Exam from "./pages/Exam"; import Result from "./pages/Result"; import Dashboard from "./pages/Dashboard"; import Review from "./pages/Review"; import Admin from "./pages/Admin"; import Progress from "./pages/Progress";
import { getMe } from "./lib/auth";

// Client-side guards are for UX only. The API enforces the real permissions.
function Guard({ children, admin }: { children: ReactElement; admin?: boolean }) {
  const me = getMe(); const { testId } = useParams();
  if (!me) return <Navigate to={testId ? `/login?test=${testId}` : "/login"} replace />;
  if (admin && me.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}
const Home = () => { const me = getMe(); return <Navigate to={me ? (me.role === "ADMIN" ? "/admin" : "/dashboard") : "/login"} replace />; };

createRoot(document.getElementById("root")!).render(<React.StrictMode><BrowserRouter><Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
  <Route path="/progress" element={<Guard><Progress /></Guard>} />
  <Route path="/exam/:testId" element={<Guard><Exam /></Guard>} />
  <Route path="/result/:attemptId" element={<Guard><Result /></Guard>} />
  <Route path="/review/:attemptId" element={<Guard><Review /></Guard>} />
  <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
  <Route path="*" element={<Home />} /></Routes></BrowserRouter></React.StrictMode>);
