import type { ReactNode } from "react";
/** Tiny, safe notes renderer: "# heading", "- bullet", blank-line separated paragraphs, and clickable links. Never renders HTML. */
export default function Notes({ text }: { text: string }) {
  const linkify = (s: string): ReactNode[] => s.split(/(https?:\/\/[^\s)]+)/g).map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p);
  const out: ReactNode[] = []; let bullets: string[] = [];
  const flush = () => { if (bullets.length) { out.push(<ul key={`u${out.length}`}>{bullets.map((b, i) => <li key={i}>{linkify(b)}</li>)}</ul>); bullets = []; } };
  text.split("\n").forEach((raw, i) => {
    const l = raw.trimEnd();
    if (/^\s*[-*•]\s+/.test(l)) { bullets.push(l.replace(/^\s*[-*•]\s+/, "")); return; }
    flush();
    if (/^#{1,3}\s+/.test(l)) out.push(<h4 key={i}>{l.replace(/^#{1,3}\s+/, "")}</h4>);
    else if (l.trim()) out.push(<p key={i}>{linkify(l)}</p>);
  });
  flush(); return <div className="notes">{out}</div>;
}
