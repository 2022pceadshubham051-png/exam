# Deploy: GitHub -> Vercel (frontend + backend) + Neon (Postgres)

## 1. Neon (database)
1. neon.tech -> New Project. Copy two connection strings from "Connect":
   - **Pooled** (host has `-pooler`) -> `DATABASE_URL`
   - **Direct** (uncheck "Connection pooling") -> `DIRECT_URL`
2. Create tables once from your PC:
   ```
   cd backend && cp .env.example .env   # paste both Neon URLs
   npm i && npx prisma db push
   ```

## 2. GitHub
```
git init -b main && git add . && git commit -m "ExamForge"
git remote add origin https://github.com/<you>/examforge.git && git push -u origin main
```

## 3. Vercel – backend (project 1)
Add New Project -> import repo -> **Root Directory: `backend`** -> Framework: Other.
Env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CORS_ORIGIN` (fill after step 4), `AI_API_KEY`.
Deploy, then open `https://<backend>.vercel.app/api/health` -> `{"ok":true}`.

## 4. Vercel – frontend (project 2)
Import same repo -> **Root Directory: `frontend`** -> Framework: Vite.
Env var: `VITE_API_URL=https://<backend>.vercel.app` (no trailing slash). Deploy.
Then set backend `CORS_ORIGIN=https://<frontend>.vercel.app` and redeploy backend.
