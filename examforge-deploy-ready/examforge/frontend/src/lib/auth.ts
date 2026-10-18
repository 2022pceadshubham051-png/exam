export type Me = { id: string; role: "USER" | "ADMIN" } | null;
export function getMe(): Me {
  try {
    const t = localStorage.getItem("token"); if (!t) return null;
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { id: p.id, role: p.role };
  } catch { return null; }
}
export const logout = () => { localStorage.removeItem("token"); location.href = "/login"; };
// Appearance helpers live in ./theme; re-exported so older imports keep working.
export { STYLES, STYLE_NAMES, getStyle, setStyle, isDark, isAstra, toggleTheme } from "./theme";
