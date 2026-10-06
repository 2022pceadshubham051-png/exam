import { useState } from "react"; import { useNavigate } from "react-router-dom"; import { api } from "../lib/api";
export default function Login() {
  const [f, setF] = useState({ email: "", password: "", name: "" }); const [reg, setReg] = useState(false); const [err, setErr] = useState(""); const nav = useNavigate();
  const go = async () => { try { const r = await api(reg ? "/auth/register" : "/auth/login", "POST", reg ? f : { identifier: f.email, password: f.password }); localStorage.setItem("token", r.token); setErr(""); const t = new URLSearchParams(location.search).get("test"); nav(t ? `/exam/${t}` : r.user.role === "ADMIN" ? "/admin" : "/dashboard"); } catch (e: any) { setErr(e.message); } };
  const inp = "w-full rounded border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2";
  return <div className="min-h-screen grid place-items-center p-4"><div className="w-full max-w-sm space-y-3 rounded-xl bg-white dark:bg-slate-900 p-6 shadow">
    <h1 className="text-xl font-semibold">ExamForge</h1>
    {reg && <input className={inp} placeholder="Name" onChange={(e) => setF({ ...f, name: e.target.value })} />}
    <input className={inp} placeholder={reg ? "Email" : "Email or admin username"} onChange={(e) => setF({ ...f, email: e.target.value })} />
    <input className={inp} type="password" placeholder="Password (8+)" onChange={(e) => setF({ ...f, password: e.target.value })} />
    {err && <p className="text-sm text-red-500">{err}</p>}
    <button onClick={go} className="w-full rounded bg-blue-600 py-2 text-white">{reg ? "Register" : "Login"}</button>
    <button onClick={() => setReg(!reg)} className="text-sm text-blue-600">{reg ? "Have an account? Login" : "New? Register"}</button>
    <button onClick={() => { document.documentElement.classList.toggle("dark"); localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light"); }} className="block text-sm">☀/🌙</button>
  </div></div>;
}
