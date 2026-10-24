import { Router } from "express"; import { z } from "zod"; import rateLimit from "express-rate-limit";
import { requireAuth, type AuthedReq } from "../middleware/auth"; import { dayKey } from "../services/coins";
import { aiConfigured, explain } from "../services/ai"; import { FALLBACK_NOTE, BUSY_NOTE } from "../services/aiLogic";
import { wrap, fail } from "./util";

export const ai = Router(); ai.use(requireAuth);
const body = z.object({
  text: z.string().trim().min(3).max(2500), options: z.array(z.object({ key: z.string().max(2), text: z.string().max(400) })).min(2).max(6),
  correctKey: z.string().max(2).nullable().optional(), selectedKey: z.string().max(2).nullable().optional(), explanation: z.string().max(1500).nullable().optional(), topic: z.string().max(80).nullable().optional(),
  lang: z.enum(["hi", "en"]).default("en"), followup: z.string().trim().max(500).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1500) })).max(6).optional(),
});
// Burst limit per student (the daily cap lives in the database, because serverless instances do not share memory).
const burst = rateLimit({ windowMs: 60_000, max: 6, keyGenerator: (r: any) => r.user?.id ?? r.ip, validate: false, message: { error: "You are asking too fast. Please wait a minute. / आप बहुत जल्दी-जल्दी पूछ रहे हैं, एक मिनट रुकिए।" } });

ai.get("/ai/status", (_req, res) => res.json({ configured: aiConfigured() }));
ai.post("/ai/explain", burst, wrap(async (req: AuthedReq, res) => {
  const b = body.parse(req.body);
  // Without a key the button still helps: it shows the author's explanation and says how to enable the tutor.
  if (!aiConfigured()) return res.json({ text: b.explanation?.trim() || FALLBACK_NOTE[b.lang], source: "stored", configured: false });
  try { res.json({ ...(await explain(req.user!.id, dayKey(), { ...b, correctKey: b.correctKey ?? null })), configured: true }); }
  catch (e: any) { if (e?.status) throw e; console.error("AI explain failed:", e?.message); throw fail(502, BUSY_NOTE[b.lang]); }
}));
