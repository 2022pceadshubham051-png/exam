/** Uses the SVG stored in the project's branding folder (served from /branding). */
export default function LogoMark({ size = 34, animate = true, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  return <img
    className={`logo-mark ${animate ? "logo-live" : ""} ${className}`.trim()}
    src="/branding/logo-mark.svg"
    width={size}
    height={size}
    alt="ExamForge"
    decoding="async"
    draggable={false}
  />;
}
