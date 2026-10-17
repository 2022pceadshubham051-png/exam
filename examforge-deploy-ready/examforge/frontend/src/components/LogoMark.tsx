/** Shared ExamForge brand mark. Uses the supplied SVG asset with a resilient PNG fallback. */
export default function LogoMark({ size = 34, animate = false, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  const fallback = size <= 40 ? "/brand/logo-mark-64.png" : size <= 100 ? "/brand/logo-mark-192.png" : "/brand/logo-mark-512.png";
  return (
    <img
      className={`logo-mark ${animate ? "logo-live" : ""} ${className}`.trim()}
      src="/brand/logo-mark.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      onError={(event) => {
        const image = event.currentTarget;
        if (image.dataset.fallbackApplied === "true") return;
        image.dataset.fallbackApplied = "true";
        image.src = fallback;
      }}
    />
  );
}
