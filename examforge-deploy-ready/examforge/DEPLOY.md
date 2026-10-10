# Deploy: GitHub -> Vercel (frontend + backend) + Neon (Postgres)

## 1. Neon (database)

1. Create a Neon project.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Copy the direct connection string into `DIRECT_URL`.
4. From your machine, apply the current Prisma schema:

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
```

For an existing ExamForge deployment, **do not skip this step** after installing the upgraded build. The schema adds:

- `AttemptMode` (`EXAM` / `PRACTICE`)
- `Test.allowPracticeMode`
- `Test.maxAttempts`
- `TestAttempt.mode`

`prisma db push` updates the schema in place.

## 2. GitHub

```bash
git init -b main
git add .
git commit -m "ExamForge upgrade"
git remote add origin https://github.com/<you>/examforge.git
git push -u origin main
```

## 3. Vercel — backend

Create a Vercel project with root directory `backend` and add:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `CORS_ORIGIN`
- `AI_API_KEY` (only when using an AI provider outside the current manual prompt/import flow)

Build/start scripts already run Prisma generation/schema setup as defined in `backend/package.json`.

Verify:

```text
https://<backend>.vercel.app/api/health
```

## 4. Vercel — frontend

Create a second Vercel project with root directory `frontend`.

Environment variable:

```text
VITE_API_URL=https://<backend>.vercel.app
```

Then set the backend's `CORS_ORIGIN` to the deployed frontend URL and redeploy the backend.

## Upgrade notes

The new admin **Delete forever** action intentionally removes the complete exam tree, including attempts/results. Use it only when permanent historical deletion is desired. For normal maintenance, use **Unpublish** instead.

## ExamForge V2 database update

This build adds adaptive practice state to attempts. After deploying the backend, run Prisma against the same PostgreSQL database:

```bash
cd backend
npx prisma generate
npx prisma db push
```

Do not run `prisma migrate reset` or drop the database. Existing users, tests and results are kept. The new `adaptiveQuestionIds` column is nullable, so existing attempts continue to work.

V2 also adds untimed practice, adaptive practice, time-management analytics, global and per-test leaderboards, separate active exam/practice sessions, and hard-delete test cleanup.

## V3 dashboard/API troubleshooting

The dashboard now loads tests independently from history and leaderboard, so an optional analytics endpoint cannot keep the entire test list stuck on Loading.

For a deployed upgrade, confirm the frontend Vercel environment variable is set to the actual backend URL:

```text
VITE_API_URL=https://YOUR-BACKEND.vercel.app
```

Then redeploy the frontend.

For the backend, apply the current Prisma schema to the existing database (never reset it):

```bash
cd backend
npx prisma generate
npx prisma db push
```

Verify the backend health endpoint first:

```text
https://YOUR-BACKEND.vercel.app/api/health
```

It must return JSON containing `{"ok":true}`.

## V6 upgrade note

After deploying V6 run `npx prisma db push` once (the Vercel build script already does this). New optional columns: `User.targetExam`, `User.targetScore`, `QuestionResponse.subject`, `QuestionResponse.ord`, `TestResult.subjectStats`.
`CORS_ORIGIN` may now be a comma-separated list of origins.
