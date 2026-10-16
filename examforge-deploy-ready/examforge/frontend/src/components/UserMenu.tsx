import { useEffect, useRef, useState } from "react"; import { Link } from "react-router-dom";
import { UserRound, Settings, CircleHelp, LogOut, Timer, Store } from "lucide-react";
import { logout } from "../lib/auth"; import { openTutorial } from "./Tutorial";

/** One small avatar button replaces the row of help / sound / look / theme / logout buttons. Everything else lives on the Profile page. */
export default function UserMenu({ name, admin }: { name?: string; admin?: boolean }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  return <div className="user-menu" ref={ref}>
    <button className="avatar-btn" aria-haspopup="menu" aria-expanded={open} title="Account" aria-label="Account menu" onClick={() => setOpen(!open)}>{initial || <UserRound size={18} />}</button>
    {open && <div className="menu-pop" role="menu">
      {name && <div className="menu-head"><b>{name}</b><span className="sub">{admin ? "Admin" : "Student"}</span></div>}
      <Link to="/profile" className="menu-item" role="menuitem" onClick={() => setOpen(false)}><Settings size={16} />{admin ? "Settings" : "Profile & settings"}</Link>
      {!admin && <Link to="/shop" className="menu-item" role="menuitem" onClick={() => setOpen(false)}><Store size={16} />Shop</Link>}
      {!admin && <Link to="/lecture-pace" className="menu-item" role="menuitem" onClick={() => setOpen(false)}><Timer size={16} />Lecture Pace</Link>}
      <button className="menu-item" role="menuitem" onClick={() => { setOpen(false); openTutorial(); }}><CircleHelp size={16} />Help &amp; quick tour</button>
      <button className="menu-item danger" role="menuitem" onClick={logout}><LogOut size={16} />Logout</button>
    </div>}
  </div>;
}
