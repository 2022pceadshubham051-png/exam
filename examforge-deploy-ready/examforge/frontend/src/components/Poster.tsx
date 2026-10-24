import { GraduationCap } from "lucide-react";

/** Course poster (16:9). Falls back to a coloured tile with the course initial when no image was added. */
export default function Poster({ src, title, className = "" }: { src?: string | null; title: string; className?: string }) {
  return <div className={`poster ${className}`} role="img" aria-label={title}>
    {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <div className="poster-empty" aria-hidden="true"><GraduationCap size={34} /><b>{title.slice(0, 40)}</b></div>}
  </div>;
}
