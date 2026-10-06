# ExamForge — Mock Test Platform (core modules)
Done: Express routes (auth, start/resume, autosave, tab-switch, submit, result+comparison, history, import preview/approve),  Prisma schema (immutable per-attempt history), import parser + tests, server-side timing, scoring, improvement/weak-area analytics.
Setup: `cd backend && cp .env.example .env && npm i && npx prisma migrate dev && npm test`
Security: `Question.correctKey` is never sent during an exam; scoring runs server-side on submit.
Next: AI generator (needs provider key), CSV/PDF export, admin dashboard, rank/percentile, assign-questions UI.
