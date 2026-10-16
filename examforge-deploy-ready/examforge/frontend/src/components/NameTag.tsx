/** A leaderboard name with the cosmetics the student bought in the Shop (title + name style). */
export default function NameTag({ r, block }: { r: { name: string; title?: string | null; frame?: string | null }; block?: boolean }) {
  return <span style={block ? { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : undefined}>
    <b className={r.frame ? `nm nm-${r.frame}` : "nm"}>{r.name}</b>{r.title && <span className="nm-title">{r.title}</span>}</span>;
}
