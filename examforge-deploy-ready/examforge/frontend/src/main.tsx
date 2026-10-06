import React from "react"; import { createRoot } from "react-dom/client"; import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css"; import Login from "./pages/Login"; import Exam from "./pages/Exam"; import Result from "./pages/Result"; import Dashboard from "./pages/Dashboard"; import Review from "./pages/Review"; import Admin from "./pages/Admin"; import Progress from "./pages/Progress";
if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(<BrowserRouter><Routes>
  <Route path="/login" element={<Login />} /><Route path="/exam/:testId" element={<Exam />} /><Route path="/result/:attemptId" element={<Result />} />
  <Route path="/dashboard" element={<Dashboard />} /><Route path="/progress" element={<Progress />} /><Route path="/review/:attemptId" element={<Review />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<Navigate to="/login" />} /></Routes></BrowserRouter>);
