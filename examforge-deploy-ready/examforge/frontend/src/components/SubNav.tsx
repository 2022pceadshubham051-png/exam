import { NavLink } from "react-router-dom";
import { useT } from "../lib/i18n";
// The 5 main tabs stay small by grouping related pages under a tab. This strip switches between the pages of one group.
const GROUPS = {
  practice: [["/dashboard", "Tests"], ["/daily", "Daily"], ["/duel", "Duel"], ["/league", "League"], ["/leaderboard", "Rankings"]],
  me: [["/profile", "Profile"], ["/progress", "Progress"], ["/notebook", "Mistake notebook"], ["/shop", "Shop"]],
} as const;
export default function SubNav({ group }: { group: keyof typeof GROUPS }) {
  const t = useT();
  return <nav className="seg subnav" aria-label="Section">{GROUPS[group].map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "on" : "")}>{t(l)}</NavLink>)}</nav>;
}
