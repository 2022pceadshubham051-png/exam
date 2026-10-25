import { useEffect } from "react";

export interface Seo { title?: string | null; description?: string | null; image?: string | null; canonical?: string | null; jsonLd?: object | null }
const setMeta = (sel: string, attr: "name" | "property", key: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(sel); const created = !el;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  const prev = el.getAttribute("content"); el.setAttribute("content", value);
  return () => { if (created) el!.remove(); else if (prev != null) el!.setAttribute("content", prev); };
};
/** Sets the page title, description, link-preview tags (Open Graph), canonical link and optional JSON-LD while the page is open, then puts everything back. */
export function useSeo(seo: Seo | null) {
  const key = JSON.stringify(seo ?? null);
  useEffect(() => {
    if (!seo) return; const undo: Array<() => void> = [];
    if (seo.title) { const old = document.title; document.title = seo.title; undo.push(() => { document.title = old; }); undo.push(setMeta('meta[property="og:title"]', "property", "og:title", seo.title)); }
    if (seo.description) { undo.push(setMeta('meta[name="description"]', "name", "description", seo.description)); undo.push(setMeta('meta[property="og:description"]', "property", "og:description", seo.description)); }
    if (seo.image && /^https?:\/\//.test(seo.image)) undo.push(setMeta('meta[property="og:image"]', "property", "og:image", seo.image));
    if (seo.canonical) {
      let l = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]'); const made = !l, old = l?.href;
      if (!l) { l = document.createElement("link"); l.rel = "canonical"; document.head.appendChild(l); } l.href = seo.canonical;
      undo.push(() => { if (made) l!.remove(); else if (old) l!.href = old; });
    }
    if (seo.jsonLd) { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c"); document.head.appendChild(s); undo.push(() => s.remove()); }
    return () => undo.reverse().forEach((f) => f());
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
