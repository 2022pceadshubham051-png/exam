import "./lib/asyncErrors";
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
if (!process.env.JWT_SECRET) console.error("JWT_SECRET is not set: login and register will fail until you add it.");
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
// Central error handler: validation problems -> 400, missing rows -> 404, everything else -> a clean 500 (never a hung request).
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) return;
  if (err?.issues) return res.status(400).json({ error: err.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "That request is too large." });
  if (err instanceof SyntaxError && "body" in err) return res.status(400).json({ error: "Invalid JSON body." });
  if (err?.code === "P2025") return res.status(404).json({ error: "Not found" });
  if (err?.code === "P2002") return res.status(409).json({ error: "That record already exists." });
  if (err?.name === "PrismaClientValidationError") return res.status(400).json({ error: "Invalid input." });
  console.error("Unhandled API error:", err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
});
process.on("unhandledRejection", (e) => console.error("Unhandled rejection:", e));
// Admin bootstrap from env: no Prisma Studio needed. Password in env is the source of truth.
async function ensureAdmin() {
  const { ADMIN_USERNAME: username, ADMIN_PASSWORD: pw, ADMIN_EMAIL } = process.env; if (!username || !pw) return;
  const passwordHash = await bcrypt.hash(pw, 12), email = ADMIN_EMAIL ?? `${username}@admin.local`;
  try { await prisma.user.upsert({ where: { username }, update: { passwordHash, role: "ADMIN" }, create: { username, email, name: "Admin", passwordHash, role: "ADMIN" } }); } catch (e: any) { console.error("Admin seed failed:", e.message); }
}
// Local/Render: start a server. On Vercel the app is exported and run as a serverless function (see api/index.ts).
if (!process.env.VERCEL) app.listen(+(process.env.PORT ?? 4000), () => console.log("API up"));
export default app;
