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
export type Style = "aura" | "toon" | "astra";
export const STYLES: Style[] = ["aura", "toon", "astra"];
export const STYLE_NAMES: Record<Style, string> = { aura: "Aura (cool)", toon: "Cartoon world", astra: "Astra (space)" };
export function getStyle(): Style { const c = document.documentElement.classList; return c.contains("astra") ? "astra" : c.contains("aura") ? "aura" : "toon"; }
export const isAstra = () => getStyle() === "astra";
export function setStyle(s: Style) {
  const root = document.documentElement; root.classList.remove("aura", "astra");
  if (s !== "toon") root.classList.add(s);
  let pref = ""; try { pref = localStorage.getItem("theme") || ""; localStorage.setItem("ef_style", s); } catch { /* ignore */ }
  if (s === "astra") root.classList.add("dark"); else root.classList.toggle("dark", pref ? pref === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
}
export const nextStyle = (): Style => STYLES[(STYLES.indexOf(getStyle()) + 1) % STYLES.length];
export const cycleStyle = () => { const n = nextStyle(); setStyle(n); return n; };
export const isDark = () => document.documentElement.classList.contains("dark");
export function toggleTheme() { if (isAstra()) { setStyle("aura"); return; } const d = document.documentElement.classList.toggle("dark"); try { localStorage.setItem("theme", d ? "dark" : "light"); } catch { /* ignore */ } }
