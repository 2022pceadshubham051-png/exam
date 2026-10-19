# ExamForge UI Polish — Change Notes

This pass focuses on shared branding, visual consistency, startup UX, and accessibility while preserving the existing application routes and exam logic.

## Changes

- Published the supplied logo mark and full logo under `frontend/public/brand/`, with duplicate embedded-image references removed from the public SVGs to reduce transfer size.
- Updated the shared `LogoMark` component to use the supplied logo asset and fall back to the existing size-appropriate PNG when the SVG cannot load.
- Updated the landing page, intro screen, and favicon references to use the supplied branding assets, with a PNG fallback for the full logo.
- Added `frontend/src/polish.css` as the last-loaded shared design layer. It establishes a restrained violet/gold academic palette, reduces excessive gradients/glows, aligns shared surfaces and buttons, and improves focus indicators and reduced-motion handling while retaining Aura and Astra modes.
- Removed the always-rendered decorative study-icon backdrop from the app root. Scroll-reveal behavior remains available; the app no longer mounts 22 floating icons across every page.
- Shortened the splash intro and added a keyboard-accessible “Skip intro” action.
- Connected profile field labels to their controls, added pressed state semantics to exam selector chips, and added accessible announcement roles for save errors and success.
- Added skip-to-content links to shared shells and the active exam question screen.
- Reduced the externally requested font families to the two used for the main interface.

## Validation performed

- Parsed the changed TSX files with the TypeScript transpiler for syntax errors.
- Parsed the project CSS files with PostCSS.
- Parsed the public logo SVGs as XML and verified the embedded PNG payloads.
- Rendered both public SVG logo assets to PNG for a visual validity check.
- Verified branding asset paths referenced by `index.html` and confirmed the PNG fallback files exist.

## Validation limitation

A complete TypeScript type-check and Vite production build could not be completed in this environment because npm dependency installation failed while resolving packages from `registry.npmjs.org` (`EAI_AGAIN`). Run `npm ci` and `npm run build` in an environment with registry access before deploying. Browser-based end-to-end checks were not run here.


# v38 design pass

- **Type:** Archivo (headings, numbers) + Hind (body, supports Devanagari). Both self-hosted through `@fontsource`, so the Google Fonts request is gone.
- **Palette:** the default "train" skin moves from cream to a cool paper white with railway blue and a signal-amber accent. Library and Ground skins are unchanged. Fixed low-contrast gold text in train + dark mode.
- **Landing:** new hero with a live sample exam screen (ticking timer, answering loop), exam list, a keyboard-accessible mode switcher, a sample result report, FAQ and a single scroll-triggered "how it works" moment. All sample content is labelled as sample.
- **Result:** tokenised colours (no hardcoded greens/reds), legend on the section chart, larger marks, percentile track on the rank card.
- **Global:** labels in sentence case instead of tracked caps, press feedback on buttons, new 404 page (unknown URLs no longer silently redirect).
- **Cleanup:** the unused root-level stylesheets (`aura.css`, `astra.css`, `cartoon.css` ...) were never imported; they now live in `frontend/src/_unused-css/` and can be deleted.
- Verified: `npm run build` (tsc + vite) passes; checked in Chromium at 1280px and 390px, light and dark.
