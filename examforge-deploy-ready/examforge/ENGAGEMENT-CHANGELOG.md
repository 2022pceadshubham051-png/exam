# Engagement upgrade

## After pulling this version
1. `cd backend && npx prisma db push`  (adds `UserStreak`, `DailyChallenge`, `DailyEntry`, `Duel`, `DuelEntry`, `AiExplanation`, `AiUsage`, `QuestionReport`, and `User.refCode` / `User.referredBy`. Nothing is dropped.)
2. Optional, for the AI tutor: add `AI_API_KEY` (and optionally `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`) to the backend environment. Without a key the button still works but only shows the author's explanation.
3. Redeploy backend and frontend.

## What is new
| Feature | Where | Notes |
|---|---|---|
| Daily streak + Streak Freeze | Home chip, `/daily`, Shop | Server-side, India-time days. A finished test, Daily Challenge, duel or 5+ revised cards counts. A freeze (60 coins, hold up to 5) is used automatically for each missed day. Milestone coins at 3/7/14/30/60/100 days. |
| Daily Challenge | `/daily` | Same 10 questions for everyone, 10 min, one attempt per day, server clock, server grading (+1 / -0.25), daily leaderboard, 10-30 coins. |
| Revision queue | `/revise`, Notebook | Mistakes are added automatically after each result/review. Active recall (pick an answer first), then Hard/Good/Easy. Intervals 1/3/7/14/30 days. Max 15 cards per round, topics mixed, forgotten cards come back once in the same round. |
| AI doubt solver | "Don't understand? Ask the AI tutor" on Review, Daily, Duel, Notebook, Revision | English / Hindi, follow-up questions, answers cached per question+language, 40 fresh AI calls per student per day, 6 per minute. |
| WhatsApp share + invite | Result page, Daily, Duel, Rooms | Share text + link with your invite code. A friend who registers through it and finishes one test gives both of you coins (50 / 25, max 10 rewarded invites per person). |
| Duel | `/duel` | 5 or 10 questions, played asynchronously over a WhatsApp link. Scores stay hidden until you have finished. Winner 25 coins, loser 8, tie 15. Link valid for 48 h. |
| Tests + CI | `.github/workflows/ci.yml` | 98 backend + 28 frontend tests; CI runs typecheck, tests and the production build. |

## v2 additions
- **Languages:** the app and the AI tutor use English and Hindi only (no Hinglish). A test (`i18n.coverage.test.ts`) fails if a new screen string has no Hindi.
- **Weekly League** (`/league`): points from Daily (10/correct + 20), tests (2/correct, capped + 20) and duel wins (30). Resets Monday (India time). Last week's top 3 get 150/100/60 coins, paid once.
- **Daily goal ring** on Home: Daily Challenge, one finished test, 5 revised cards.
- **Report a question** on Review + admin list at `/admin/reports` (most reported first, mark fixed).
- **Install prompt + offline banner.**
- **Speed:** boot screen (first paint ~1.7 s to ~0.65 s on a throttled phone), recharts removed (own light charts), cached/prefetched API calls, service worker, gzip/brotli, long cache headers, smaller logo, admin seeding no longer blocks start-up.

## Other changes
- Removed `backend/src/routes/study.ts`: it was never mounted and referenced Prisma models that do not exist, so it broke `tsc`.
- Added `backend/.env.example` (the README referred to it but it was missing).

## Known limits
- Notebook cards live on the device (and sync through `/api/sync`), so the server cannot verify revision claims. Rewards are small and capped (2 coins per card, 15 cards per day).
- Daily/duel answers are graded on the server, but nothing stops a student from looking answers up elsewhere while the clock runs. Time is only a tie-breaker.
- Duels are asynchronous (no live head-to-head). Live play would need WebSockets or a realtime service.
- The AI tutor can be wrong; the UI says so. Answers are cached, so a wrong cached answer stays until its row in `AiExplanation` is deleted.
- The AI provider call and the database flows were tested with mocks/an in-memory fake, not against a real Postgres or a real AI key (see the summary).
