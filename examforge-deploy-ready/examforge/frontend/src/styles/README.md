# Styles

Single token-driven system, imported by `src/index.css` in this order:
`tokens.css` (light / `.dark` / `.astra` variables) → `base.css` → `components.css` → `layout.css` → `pages.css` → `motion.css` (all animations; honours reduced-motion and the in-app toggle).
All component CSS sits in `@layer components`, so Tailwind utilities still override it.
Do not hardcode colours in pages; use tokens. `public/lecture-pace.html` receives these tokens through `themeCss()` in `pages/LecturePace.tsx`.
Theme storage keys: `theme` (light/dark), `ef_style` (aura/astra), `ef_motion`, `ef_sound`, `ef_instant`.
