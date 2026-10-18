// Appearance preferences. Stored in localStorage (the app has no server-side preference field) and applied as classes on <html>:
//   style: "aura" (default) | "astra" (night, always dark)      mode: "system" | "light" | "dark"      motion: "system" | "reduce"
// index.html runs the same logic before first paint so there is no flash of the wrong theme.
export type Style = "aura" | "astra";
export type Mode = "system" | "light" | "dark";
export type Motion = "system" | "reduce";
export const STYLES: Style[] = ["aura", "astra"];
export const STYLE_NAMES: Record<Style, string> = { aura: "Aura", astra: "Astra" };
export const STYLE_HINTS: Record<Style, string> = { aura: "Ivory and violet. Follows light or dark mode.", astra: "Deep violet night theme. Always dark." };
import { getSkin } from "./skin"; import { getLite } from "./prefs";
const K = { mode: "theme", style: "ef_style", motion: "ef_motion" };

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable (private mode): the change still applies for this page view */ } };

export const getStoredStyle = (): Style => (read(K.style) === "astra" ? "astra" : "aura");
export const getMode = (): Mode => { const t = read(K.mode); return t === "dark" || t === "light" ? t : "system"; };
export const getMotion = (): Motion => (read(K.motion) === "reduce" ? "reduce" : "system");
export const getStyle = (): Style => (document.documentElement.classList.contains("astra") ? "astra" : "aura");
export const isAstra = () => getStyle() === "astra";
export const isDark = () => document.documentElement.classList.contains("dark");
const prefersDark = () => !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function applyTheme() {
  const root = document.documentElement, style = getStoredStyle(), mode = getMode();
  const dark = style === "astra" || mode === "dark" || (mode === "system" && prefersDark());
  root.classList.toggle("aura", style === "aura"); root.classList.toggle("astra", style === "astra"); root.classList.toggle("dark", dark);
  root.classList.toggle("lite", getLite()); root.classList.toggle("reduce-motion", getMotion() === "reduce" || getLite()); root.dataset.skin = getSkin();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? (style === "astra" ? "#0c0a1a" : "#12101e") : "#f7f5ef");
}
let started = false;
/** Call once at startup: applies the saved theme, follows OS changes while mode is "system", and syncs other tabs. */
export function initTheme() {
  applyTheme(); if (started) return; started = true;
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (getMode() === "system") applyTheme(); });
  window.addEventListener("ef-skin", applyTheme); window.addEventListener("ef-prefs", applyTheme);
  window.addEventListener("storage", (e) => { if (e.key && (Object.values(K).includes(e.key) || e.key === "ef_skin" || e.key === "ef_lite" || e.key === "ef_skin_auto")) { applyTheme(); window.dispatchEvent(new Event("ef-theme")); } });
}
let lx = innerWidth / 2, ly = 0;
if (typeof window !== "undefined") window.addEventListener("pointerdown", (e) => { lx = e.clientX; ly = e.clientY; }, true);
/** Applies a theme change as a circular reveal from the last click (View Transitions API); plain crossfade elsewhere. */
function transition(apply: () => void) {
  const d = document as any, calm = document.documentElement.classList.contains("reduce-motion") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!d.startViewTransition || calm) { fade(); apply(); return; }
  const r = document.documentElement; r.style.setProperty("--vx", `${lx}px`); r.style.setProperty("--vy", `${ly}px`);
  r.style.setProperty("--vr", `${Math.hypot(Math.max(lx, innerWidth - lx), Math.max(ly, innerHeight - ly))}px`);
  d.startViewTransition(apply);
}
let fadeT: number | undefined;
const fade = () => { const r = document.documentElement; r.classList.add("theme-fade"); clearTimeout(fadeT); fadeT = window.setTimeout(() => r.classList.remove("theme-fade"), 320); };
const announce = () => window.dispatchEvent(new Event("ef-theme"));
export function setMode(m: Mode) { transition(() => { write(K.mode, m === "system" ? null : m); applyTheme(); announce(); }); }
export function setStyle(s: Style) { transition(() => { write(K.style, s); applyTheme(); announce(); }); }
export function setMotion(m: Motion) { write(K.motion, m === "reduce" ? "reduce" : null); applyTheme(); announce(); }
/** Simple light/dark flip used by the login page button. */
export function toggleTheme() { if (isAstra()) { setStyle("aura"); setMode("light"); return; } setMode(isDark() ? "light" : "dark"); }
