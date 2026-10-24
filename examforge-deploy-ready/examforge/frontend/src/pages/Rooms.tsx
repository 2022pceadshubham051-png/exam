import { useEffect, useState, type FormEvent } from "react"; import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Users, Plus, LogIn, Share2, Copy, LogOut, Play } from "lucide-react";
import Shell from "../components/Shell"; import SubNav from "../components/SubNav"; import { Empty, PageHeader, SkeletonRows, toast } from "../components/ui"; import { api, fmt } from "../lib/api"; import { shareText } from "../lib/engage"; import { useT } from "../lib/i18n";

const invite = (r: { code: string; name: string }) => `Join my study room "${r.name}" on ExamForge. Code: ${r.code}\n${location.origin}/rooms?join=${r.code}`;
async function share(r: { code: string; name: string }) {
  const text = invite(r);
  try { await shareText(text, "ExamForge study room"); } catch { await navigator.clipboard?.writeText(text); toast("Invite copied. Paste it in WhatsApp.", "ok"); }
}

/** List of my rooms, plus create and join. */
export default function Rooms() {
  const t = useT(); const nav = useNavigate(); const [qs] = useSearchParams();
  const [list, setList] = useState<any[] | null>(null); const [tests, setTests] = useState<any[]>([]); const [err, setErr] = useState("");
  const [code, setCode] = useState((qs.get("join") ?? "").toUpperCase()); const [testId, setTestId] = useState(""); const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => api("/rooms").then((d) => setList(Array.isArray(d) ? d : [])).catch((e) => { setErr(e.message); setList([]); });
  const join = async (c: string) => { setBusy(true); setErr(""); try { const r = await api("/rooms/join", "POST", { code: c }); nav(`/rooms/${r.id}`, { replace: true }); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  useEffect(() => { void load(); api("/tests?limit=100&q=").then((d) => Array.isArray(d) && setTests(d)).catch(() => {}); if (qs.get("join")) void join(qs.get("join")!.toUpperCase()); }, []); // eslint-disable-line
  const create = async (e: FormEvent) => { e.preventDefault(); if (!testId) return; setBusy(true); setErr(""); try { const r = await api("/rooms", "POST", { testId, name: name.trim() || undefined }); nav(`/rooms/${r.id}`); } catch (e: any) { setErr(e.message); setBusy(false); } };
  return <Shell narrow><div className="stack stagger" style={{ gap: 20 }}>
    <SubNav group="practice" />
    <PageHeader title={t("Study rooms")} sub={t("Pick one test, invite friends with a code, and see who scores best. Only Exam-mode attempts count.")} />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    <form className="card card-pad row" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); if (code.trim()) void join(code.trim()); }}>
      <label className="sr" htmlFor="room-code">Room code</label><input id="room-code" className="input room-code" placeholder={t("ROOM CODE")} value={code} maxLength={10} autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ flex: 1, minWidth: 140 }} />
      <button className="btn btn-primary" disabled={busy || code.trim().length < 4}><LogIn size={16} aria-hidden="true" />{t("Join")}</button>
    </form>
    <form className="card card-pad stack" style={{ gap: 10 }} onSubmit={create}>
      <b>{t("Create a room")}</b>
      <label className="sr" htmlFor="room-test">Test</label><select id="room-test" className="input" value={testId} onChange={(e) => setTestId(e.target.value)}><option value="">{t("Choose a test…")}</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <label className="sr" htmlFor="room-name">Room name</label><input id="room-name" className="input" placeholder={t("Room name (optional)")} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-primary" disabled={busy || !testId}><Plus size={16} aria-hidden="true" />{t("Create room")}</button>
    </form>
    {!list ? <SkeletonRows rows={2} /> : list.length ? <div className="stack" style={{ gap: 10 }}>{list.map((r) => <Link key={r.id} to={`/rooms/${r.id}`} className="card card-pad row between tap-card"><div><b>{r.name}</b><p className="sub" style={{ margin: 0 }}>{r.testName} · {r.members} {t(r.members === 1 ? "member" : "members")}</p></div><span className="pill">{r.code}</span></Link>)}</div>
      : <Empty icon={<Users size={32} />} title={t("No rooms yet")}>{t("Create one, or enter a friend's code above.")}</Empty>}
  </div></Shell>;
}

export function RoomDetail() {
  const t = useT(); const { id } = useParams(); const nav = useNavigate(); const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/rooms/${id}`).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const leave = async () => { if (!confirm("Leave this room?")) return; await api(`/rooms/${id}/leave`, "DELETE").catch(() => {}); nav("/rooms", { replace: true }); };
  if (err) return <Shell narrow><div className="alert alert-bad" role="alert">{err}</div><p><Link to="/rooms">Back to rooms</Link></p></Shell>;
  if (!d) return <Shell narrow><SkeletonRows rows={4} /></Shell>;
  return <Shell narrow><div className="stack stagger" style={{ gap: 18 }}>
    <SubNav group="practice" />
    <PageHeader title={d.name} sub={`${d.test.name} · ${d.test.examName}`} actions={<span className="pill">{d.code}</span>} />
    <div className="row" style={{ gap: 8 }}>
      <Link className="btn btn-primary" to={`/exam/${d.test.id}`}><Play size={16} aria-hidden="true" />{t("Take the test")}</Link>
      <button className="btn" onClick={() => share(d)}><Share2 size={16} aria-hidden="true" />{t("Invite friends")}</button>
      <button className="btn" onClick={() => { void navigator.clipboard?.writeText(d.code); toast("Code copied.", "ok"); }}><Copy size={16} aria-hidden="true" />{t("Copy code")}</button>
      <button className="btn btn-danger" onClick={leave}><LogOut size={16} aria-hidden="true" />{t("Leave")}</button>
    </div>
    <section className="card table-wrap room-table"><table className="t"><caption className="sr">Room standings</caption><thead><tr><th>{t("Rank")}</th><th>{t("Student")}</th><th>{t("Score")}</th><th>{t("Accuracy")}</th><th>{t("Time")}</th></tr></thead>
      <tbody>{d.rows.map((r: any, i: number) => <tr key={i} className={r.isMe ? "me-row" : ""}><td>{r.rank ?? "–"}</td><td>{r.name}{r.isMe ? ` ${t("(you)")}` : ""}</td>{r.rank ? <><td>{Math.round(r.percentage)}%</td><td>{Math.round(r.accuracy)}%</td><td>{fmt(r.timeTakenSec)}</td></> : <td colSpan={3} className="muted">{t("Not attempted yet")}</td>}</tr>)}</tbody></table></section>
    <ol className="room-cards" aria-label="Room standings">{d.rows.map((r: any, i: number) => <li key={i} className={`card ${r.isMe ? "me-row" : ""}`}><span className="room-rank">{r.rank ?? "–"}</span>
      <div><b>{r.name}{r.isMe ? ` ${t("(you)")}` : ""}</b>{r.rank ? <p className="sub" style={{ margin: 0 }}>{Math.round(r.accuracy)}% {t("Accuracy").toLowerCase()} · {fmt(r.timeTakenSec)}</p> : <p className="sub" style={{ margin: 0 }}>{t("Not attempted yet")}</p>}</div>
      {r.rank ? <span className="room-score">{Math.round(r.percentage)}%</span> : null}</li>)}</ol>
    <p className="sub">{t("Standings use each student's best Exam-mode attempt on this test.")}</p>
  </div></Shell>;
}
