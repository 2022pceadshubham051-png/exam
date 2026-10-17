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
