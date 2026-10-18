import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleCheck, TriangleAlert, X, Info } from "lucide-react";

/* ---------- Modal: role=dialog, labelled, focus trap, Escape, focus restore, scroll lock ---------- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function Modal({ open, onClose, title, children, dismissible = true, alert = false, width }: { open: boolean; onClose: () => void; title: string; children: ReactNode; dismissible?: boolean; alert?: boolean; width?: number }) {
  const ref = useRef<HTMLDivElement>(null); const titleId = useId(); const down = useRef(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null, node = ref.current; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node; first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === node)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open]); // eslint-disable-line
  if (!open) return null;
  return createPortal(
    <div className="modal-bg" onMouseDown={(e) => { down.current = e.target === e.currentTarget; }} onClick={(e) => { if (dismissible && down.current && e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="card modal stack" style={{ gap: 14, ...(width ? { maxWidth: width } : null) }} role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className="card-title" style={{ fontSize: "1.2rem" }}>{title}</h2>
        {children}
      </div>
    </div>, document.body);
}

export function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, busy, error, onConfirm, onCancel }: { open: boolean; title: string; children?: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean; busy?: boolean; error?: string; onConfirm: () => void; onCancel: () => void }) {
  return <Modal open={open} onClose={() => !busy && onCancel()} title={title} alert dismissible={!busy}>
    {children && <div className="sub">{children}</div>}
    {error && <div className="alert alert-bad" role="alert"><TriangleAlert size={16} />{error}</div>}
    <div className="modal-actions"><button className="btn" disabled={busy} onClick={onCancel} data-autofocus>{cancelLabel}</button>
      <button className={`btn ${danger ? "btn-danger solid" : "btn-primary"}`} disabled={busy} onClick={onConfirm}>{busy ? "Working..." : confirmLabel}</button></div>
  </Modal>;
}

/* ---------- Toasts: one polite live region, mounted once ---------- */
type T = { id: number; msg: string; kind: "ok" | "bad" | "info" | "gold" };
export const toast = (msg: string, kind: T["kind"] = "info") => window.dispatchEvent(new CustomEvent("ef:toast", { detail: { msg, kind } }));
export function ToastHost() {
  const [items, setItems] = useState<T[]>([]); const n = useRef(0);
  const drop = useCallback((id: number) => setItems((x) => x.filter((t) => t.id !== id)), []);
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail as Omit<T, "id">; const id = ++n.current; setItems((x) => [...x.slice(-3), { id, ...d }]); window.setTimeout(() => drop(id), d.kind === "bad" ? 7000 : 4000); };
    window.addEventListener("ef:toast", on); return () => window.removeEventListener("ef:toast", on);
  }, [drop]);
  return <div className="toast-host" role="status" aria-live="polite" aria-atomic="false">{items.map((t) => <div key={t.id} className={`toast ${t.kind}`}>
    {t.kind === "bad" ? <TriangleAlert size={16} /> : t.kind === "info" ? <Info size={16} /> : <CircleCheck size={16} />}<span>{t.msg}</span>
    <button aria-label="Dismiss notification" onClick={() => drop(t.id)}><X size={14} /></button></div>)}</div>;
}

/* ---------- Field: label + control + hint + error, wired with ids ---------- */
export function Field({ label, hint, error, children, optional }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactElement<any>; optional?: boolean }) {
  const id = useId(), hid = `${id}-h`, eid = `${id}-e`;
  const child = Children.only(children);
  const ctl = isValidElement(child) ? cloneElement(child as ReactElement<any>, { id, "aria-invalid": error ? true : undefined, "aria-describedby": [hint ? hid : "", error ? eid : "", (child.props as any)["aria-describedby"] ?? ""].filter(Boolean).join(" ") || undefined }) : child;
  return <div><label className="label" htmlFor={id}>{label}{optional && <small> (optional)</small>}</label>{ctl}
    {hint && <div className="hint" id={hid}>{hint}</div>}{error && <div className="field-error" id={eid} role="alert">{error}</div>}</div>;
}

/* ---------- page furniture ---------- */
export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return <header className="page-head"><div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>{actions && <div className="row">{actions}</div>}</header>;
}
export function Empty({ icon, title, children, compact }: { icon?: ReactNode; title: string; children?: ReactNode; compact?: boolean }) {
  return <div className={`card empty ${compact ? "compact" : ""}`}>{icon}<b style={{ color: "var(--text)" }}>{title}</b>{children && <div className="sub">{children}</div>}</div>;
}
export const Skeleton = ({ w = "100%", h = 16 }: { w?: number | string; h?: number }) => <span className="skeleton" style={{ width: w, height: h }} aria-hidden="true" />;
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return <div className="card card-pad stack" style={{ gap: 14 }} role="status" aria-label="Loading"><span className="sr">Loading</span>{Array.from({ length: rows }).map((_, i) => <div key={i} className="stack" style={{ gap: 8 }}><Skeleton w={`${60 + ((i * 13) % 30)}%`} h={16} /><Skeleton w="35%" h={12} /></div>)}</div>;
}

/* ---------- Motion helpers ---------- */
const reduced = () => document.documentElement.classList.contains("reduce-motion") || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/** Numbers count up once on mount. Returns the final value immediately when motion is reduced. */
export function useCountUp(to: number, ms = 1000) {
  const [v, setV] = useState(() => (typeof window === "undefined" || reduced() ? to : 0));
  useEffect(() => {
    if (reduced()) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}
let revealStarted = false;
/** Reveals [data-reveal] elements as they scroll into view. Without JS or IntersectionObserver everything stays visible. */
export function initReveal() {
  if (revealStarted || typeof IntersectionObserver === "undefined") return; revealStarted = true;
  const root = document.documentElement; root.classList.add("js-reveal");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  const scan = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.seen)").forEach((el) => {
    el.classList.add("seen"); const sib = el.parentElement ? Array.from(el.parentElement.children).filter((c) => (c as HTMLElement).hasAttribute("data-reveal")).indexOf(el) : 0;
    el.style.setProperty("--i", String(Math.max(0, Math.min(sib, 5)))); io.observe(el);
  });
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); scan();
}

/** Coins fly from an element to the balance chip in the header. Visual only; the balance itself comes from the server. */
export function flyCoins(from: Element | null, n = 6) {
  const to = document.querySelector(".coin-chip"); if (!from || !to || reduced() || !("animate" in Element.prototype)) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i"); c.className = "coin-fly"; c.setAttribute("aria-hidden", "true");
    c.style.left = `${a.left + a.width / 2 - 9}px`; c.style.top = `${a.top + a.height / 2 - 9}px`; document.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), sx = (Math.random() - 0.5) * 70, sy = -30 - Math.random() * 40;
    const an = c.animate([{ transform: "translate(0,0) scale(.6)", opacity: 0 }, { transform: `translate(${sx}px,${sy}px) scale(1)`, opacity: 1, offset: 0.3 }, { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: 0.9 }], { duration: 850 + i * 70, delay: i * 55, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
    an.onfinish = () => c.remove();
  }
}
export const SkeletonCards = ({ n = 3 }: { n?: number }) => <div className="test-list" role="status" aria-label="Loading tests"><span className="sr">Loading</span>{Array.from({ length: n }).map((_, i) => <div key={i} className="test-row" aria-hidden="true"><div className="stack" style={{ gap: 8, flex: 1 }}><Skeleton w="55%" h={18} /><Skeleton w="35%" h={13} /></div><Skeleton w={64} h={26} /></div>)}</div>;
export const SkeletonResult = () => <div className="stack" style={{ gap: 18 }} role="status" aria-label="Loading result"><span className="sr">Loading</span>
  <div className="card card-pad row" style={{ gap: 28 }} aria-hidden="true"><span className="skeleton" style={{ width: 140, height: 140, borderRadius: "50%" }} /><div className="stack" style={{ gap: 12, flex: 1 }}><Skeleton w="30%" h={14} /><Skeleton w="45%" h={40} /><Skeleton w="70%" h={16} /></div></div>
  <div className="grid-stats" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="stat"><Skeleton w="60%" h={12} /><Skeleton w="40%" h={26} /></div>)}</div></div>;

/** Page-shaped loading placeholder: title, a stat row and two cards. */
export function SkeletonPage() {
  return <div className="stack" role="status" aria-label="Loading" style={{ gap: 20 }}><span className="sr">Loading</span>
    <div className="stack" style={{ gap: 8 }}><Skeleton w="38%" h={30} /><Skeleton w="60%" h={14} /></div>
    <div className="grid-stats">{[0, 1, 2, 3].map((i) => <div key={i} className="card card-pad stack" style={{ gap: 10 }}><Skeleton w="50%" h={12} /><Skeleton w="40%" h={26} /></div>)}</div>
    <div className="card card-pad stack" style={{ gap: 12 }}><Skeleton w="30%" h={18} /><Skeleton h={180} /></div>
  </div>;
}
