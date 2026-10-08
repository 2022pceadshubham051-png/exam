import express from "express"; import bcrypt from "bcrypt"; import { prisma } from "./lib/db"; import helmet from "helmet"; import cors from "cors"; import rateLimit from "express-rate-limit";
import { tests } from "./routes/tests"; import { progress } from "./routes/progress"; import { auth } from "./routes/auth"; import { attempts } from "./routes/attempts"; import { questions } from "./routes/questions"; import { coach } from "./routes/coach";
const app = express();
// Behind Vercel/Render proxies: without this every user shares one rate-limit bucket.
app.set("trust proxy", 1);
const origins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
app.use(helmet(), cors({ origin: origins?.length ? origins : true }), express.json({ limit: "2mb" }));
app.get("/api/health", (_, res) => res.json({ ok: true }));
// Make sure the admin account exists before serving any request (serverless can freeze after cold start).
let seeded: Promise<void> | null = null;
app.use((_req, _res, next) => { seeded ??= ensureAdmin(); seeded.then(() => next(), () => next()); });
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, max: 50 }), auth);
app.use("/api/questions", questions);
app.use("/api/tests", tests);
app.use("/api", progress);
app.use("/api", coach);
app.use("/api", attempts);
// Admin bootstrap from env: no Prisma Studio needed. Password in env is the source of truth.
async function ensureAdmin() {
  const { ADMIN_USERNAME: username, ADMIN_PASSWORD: pw, ADMIN_EMAIL } = process.env; if (!username || !pw) return;
  const passwordHash = await bcrypt.hash(pw, 12), email = ADMIN_EMAIL ?? `${username}@admin.local`;
  try { await prisma.user.upsert({ where: { username }, update: { passwordHash, role: "ADMIN" }, create: { username, email, name: "Admin", passwordHash, role: "ADMIN" } }); } catch (e: any) { console.error("Admin seed failed:", e.message); }
}
// Local/Render: start a server. On Vercel the app is exported and run as a serverless function (see api/index.ts).
if (!process.env.VERCEL) app.listen(+(process.env.PORT ?? 4000), () => console.log("API up"));
export default app;
