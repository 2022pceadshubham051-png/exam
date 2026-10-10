# ExamForge — Mock Test Platform

ExamForge is a production-oriented mock-test platform built with React, Express, Prisma and PostgreSQL.

## What is included

- Timed exam mode with server-side test/section expiry
- Untimed **Practice mode** for learning without a countdown
- Resume an in-progress attempt
- Per-question timing and global question timer support
- Deterministic question/option shuffling
- Autosave with offline queue recovery
- Mark for review, clear answer and question palette
- Negative marking, passing score and attempt limits
- Result dashboard with accuracy, attempt rate, section/topic/difficulty analysis
- Comparison against the previous official exam attempt
- Answer review with optional explanations
- Admin Studio for test creation, question import/validation and publishing
- Admin exam settings editor
- Duplicate an exam into a fresh draft
- Unpublish a live exam
- **Permanent admin deletion** of the exam, its questions, attempts, results and linked question analytics
- Search and filters for available tests
- Dark/light theme

## Stack

- Frontend: React 18, Vite, TypeScript, React Router, Recharts, Lucide
- Backend: Express, TypeScript, Zod, JWT, bcrypt
- Database: PostgreSQL via Prisma

## Local setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm test

cd ../frontend
npm install
npm run build
```

After pulling the upgraded version into an existing deployment, run:

```bash
cd backend
npx prisma db push
```

This adds the new `AttemptMode`, practice-mode settings and attempt-limit fields without requiring a destructive data reset.

## Security notes

- Correct answers are never sent to the browser while an exam is active.
- Exam scoring happens on the server.
- Exam-mode timers are calculated from persisted server timestamps.
- Practice attempts are stored separately from official exam attempts and are excluded from the leaderboard and official attempt comparison.

### V2 product features

- Separate Exam, untimed Practice and Adaptive Practice modes
- Adaptive sessions built from weaker topics and slower question-solving patterns
- Time-management analytics: average/median/fastest/slowest time, distribution, difficulty and topic speed signals
- Global and per-test leaderboards (official Exam attempts only)
- Independent active Exam and Practice sessions with resume support
- Permanent test deletion that removes linked attempts, results, questions and analytics
- Admin test-library search/filter and richer status controls
- Global UI error boundary so a single page error no longer becomes a blank screen

## V6 — Smart Coach, delete attempts, practice fixes

### New
- **Delete attempted exams**: delete one attempt, a selection, all practice sessions, or your whole history (Dashboard → Test history, and a Delete button on every result page). Official attempts of tests that have an attempt limit are protected; admins can use *Reset attempts*.
- **Smart Coach** (`/coach`): choose SSC CGL / CHSL / MTS / GD / CPO, Railway NTPC (CBT-1, CBT-2) / Group D, SSC IMD Scientific Assistant (CS&IT, ECE, Physics) or a custom weightage. Shows subjects, weightage, your **rating out of 100 per subject and topic**, readiness /100, coverage, projected marks, "work on this first" list (ranked by marks at stake), one-click topic practice, daily study plan and strengths.
- **Auto-detect subject + topic** of every question (Reasoning, Maths, English, GA, Science, Computer, Hindi, Physics, CS&IT, Electronics; Hindi/English keywords). Used on import, on attempt start, in results and in analytics. Admin: *Auto-tag missing* / *Re-tag all*.
- **Result page**: subject-wise rating /100, topic table, rank + percentile, correct section names.
- **Admin**: create a test from a real exam pattern, edit test name/time/sections, question manager (edit, delete, answer-key warning when a question has <20% correct), reset attempts, test analytics.
- **Progress**: switch between Exams / Practice / Both.

### Fixed
- `routes/tests.ts` had an extra `}` (syntax error) that stopped the backend from compiling.
- **Practice mode**: multi-section tests only showed section 1 and could not move on; now every section is shown together with instant "Check answer" + explanation. Practice answers were also rejected outside the first section.
- Exam mode could not finish a section early; added *Next section*.
- Tab-switch counter counted every switch twice (blur + visibility) so students were auto-submitted too early.
- Submit used one slow sequential transaction (timeouts on 100+ question tests) and swallowed submit errors; now batched with a long timeout and visible retry.
- Deleting an old attempt could collide with attempt numbers; numbering now uses max()+1.
- Answer review showed questions in answering order; now in test order.
- Rate limiter treated every user behind Vercel/Render as one IP (`trust proxy`).
- Unpublished tests were readable by students through the API; emails are now case-insensitive; CORS accepts a comma-separated list.

### Upgrade
```bash
cd backend && npx prisma db push   # adds User.targetExam/targetScore, QuestionResponse.subject/ord, TestResult.subjectStats (all optional, no data loss)
```
Then open any test as admin → **Manage questions → Auto-tag missing** once so existing questions get subject/topic tags.

Exam patterns live in `backend/src/services/syllabus/blueprints.ts`; keyword rules in `classifier.ts`. Boards change patterns, so confirm against the official notice.

## What changed in v14 (fixes and polish)

No database change in this build, so `prisma db push` is not required.

**Reliability**
- Async route errors are now caught centrally (`backend/src/lib/asyncErrors.ts` plus a JSON error handler). Before, one bad request in a handler without its own try/catch could hang the request or crash the server process.
- Autosave in the exam screen is now a single ordered queue. Before, quickly changing an answer could re-send an older answer after the newer one, and Submit could run before the last answers were saved.
- The browser no longer stays stuck in fullscreen after an exam ends.

**Security**
- "Show result" off is now enforced on the server for the result, answer review and history endpoints (it was only hidden in the UI).
- Password length is capped (bcrypt cost / request abuse), name length is validated.
- Question status and bulk-verify inputs are validated.

**Features and fixes**
- Admin: **Download results (CSV)** per test (Manage > Name, timing and sections).
- Admin: success and error messages no longer disappear right after they appear.
- Dashboard shows more than 20 tests (it silently stopped at 20); API supports `?limit=` (max 100).
- Per-test leaderboard shows each student once (best attempt) instead of one student filling every row.
- Deleting an already deleted exam returns 404 instead of a generic error.
- Fonts load in one request with `display=swap`; added meta description.

