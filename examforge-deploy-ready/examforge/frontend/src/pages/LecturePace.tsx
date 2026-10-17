import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import Shell from "../components/Shell";
import { api } from "../lib/api";
import { getStyle, isDark } from "../lib/auth";

// Lecture Pace planner. The tool itself is a standalone page (/lecture-pace.html) shown in an iframe.
// This page (1) saves/loads its data through the ExamForge backend and (2) pushes the current ExamForge theme into it.
const css = (cs: CSSStyleDeclaration, n: string, fb = "") => cs.getPropertyValue(n).trim() || fb;

function themeCss() {
  const root = document.documentElement, cs = getComputedStyle(root), style = getStyle();
  const head = document.querySelector("h1, h2, .brand") as HTMLElement | null;
  const body = getComputedStyle(document.body).fontFamily, display = head ? getComputedStyle(head).fontFamily : body;
  const dark = isDark();
  const v: Record<string, string> = {
    "--bg": css(cs, "--bg"), "--surface": css(cs, "--surface"), "--surface-2": css(cs, "--surface-2"),
    "--fg": css(cs, "--text"), "--muted": css(cs, "--muted"),
    "--line": css(cs, "--border", `color-mix(in srgb, ${css(cs, "--text")} 14%, transparent)`),
    "--accent": css(cs, "--brand"), "--accent-ink": css(cs, "--brand-ink", dark ? "#0b1020" : "#ffffff"),
    "--good": css(cs, "--ok", "#16a34a"), "--warn": css(cs, "--bad", "#dc2626"),
    "--scrim": dark ? "rgba(3,6,20,.66)" : "rgba(20,30,60,.38)",
    "--f-body": body, "--f-display": display,
    "--ef-shadow": css(cs, "--shadow", "none"), "--ef-shadow-1": css(cs, "--shadow-1", "none"),
    "--ef-r": "18px", "--ef-ink": css(cs, "--ink", "#2b1b55"),
  };
  return `:root:root:root{${Object.entries(v).map(([k, x]) => `${k}:${x}`).join(";")};color-scheme:${dark ? "dark" : "light"}}`;
}

export default function LecturePace() {
  const ref = useRef<HTMLIFrameElement>(null);

  const applyTheme = () => {
    try {
      const doc = ref.current?.contentDocument; if (!doc) return;
      let el = doc.getElementById("ef-theme"); if (!el) { el = doc.createElement("style"); el.id = "ef-theme"; doc.head.appendChild(el); }
      el.textContent = themeCss();
      doc.documentElement.setAttribute("data-efstyle", getStyle());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const obs = new MutationObserver(applyTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onMsg = async (e: MessageEvent) => {
      const win = ref.current?.contentWindow, d = e.data;
      if (!win || e.source !== win || e.origin !== location.origin || d?.lp !== "req") return;
      const reply = (data?: unknown, error?: string) => win.postMessage({ lp: "res", id: d.id, data, error }, location.origin);
      try {
        if (d.op === "pull") reply(await api("/lecture-pace"));
        else if (d.op === "push") reply(await api("/lecture-pace", "PUT", { json: d.payload?.json, updatedAt: d.payload?.updatedAt }));
        else reply(undefined, "Unknown request");
      } catch (err: any) { reply(undefined, err?.message ?? "Request failed"); }
    };
    window.addEventListener("message", onMsg);
    return () => { obs.disconnect(); window.removeEventListener("message", onMsg); };
  }, []);

  return (
    <Shell>
      <div className="stack" style={{ gap: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div><h1 style={{ margin: 0 }}>Lecture Pace</h1><p className="sub" style={{ margin: "4px 0 0" }}>Plan your course, track lectures, focus and revision. Your progress is saved to your account.</p></div>
          <Link to="/lecture-pace/leaderboard" className="btn"><Trophy size={16} />Leaderboard</Link>
        </div>
        <iframe
          ref={ref}
          src="/lecture-pace.html?embed=1"
          title="Lecture Pace"
          onLoad={applyTheme}
          style={{ width: "100%", height: "calc(100vh - 230px)", minHeight: 640, border: 0, background: "transparent", display: "block" }}
        />
      </div>
    </Shell>
  );
}
