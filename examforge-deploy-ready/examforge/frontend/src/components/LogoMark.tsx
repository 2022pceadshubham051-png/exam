/** ExamForge logo mark (approved brand artwork, /public/brand). `animate` adds a gentle float + glow. */
export default function LogoMark({ size = 34, animate = true, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  const src = size <= 40 ? "/brand/logo-mark-64.png" : size <= 100 ? "/brand/logo-mark-192.png" : "/brand/logo-mark-512.png";
  return <img className={`logo-mark ${animate ? "logo-live" : ""} ${className}`} src={src} srcSet={`${src} 1x`} width={size} height={size} alt="ExamForge logo" draggable={false} />;
}
