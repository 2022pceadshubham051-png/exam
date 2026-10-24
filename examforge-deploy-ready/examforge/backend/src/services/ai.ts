import { prisma } from "../lib/db";
import { SYSTEM, buildMessages, cacheKey, cleanAnswer, QUOTA_NOTE, type ExplainInput } from "./aiLogic";

export const aiConfigured = () => !!process.env.AI_API_KEY;
const provider = () => (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
const model = () => process.env.AI_MODEL ?? (provider() === "anthropic" ? "claude-haiku-5-5" : "gpt-4o-mini");

/** One model call. Works with Anthropic's Messages API (default) or any OpenAI-compatible chat endpoint (AI_PROVIDER=openai, AI_BASE_URL). */
export async function callModel(i: ExplainInput, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = process.env.AI_API_KEY!, messages = buildMessages(i), system = SYSTEM(i.lang);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    if (provider() === "anthropic") {
      const r = await fetchImpl((process.env.AI_BASE_URL ?? "https://api.anthropic.com").replace(/\/$/, "") + "/v1/messages", { method: "POST", signal: ctl.signal,
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: model(), max_tokens: 700, system, messages }) });
      const j: any = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message ?? `AI request failed (${r.status})`);
      return cleanAnswer((j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n"));
    }
    const r = await fetchImpl((process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions", { method: "POST", signal: ctl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model: model(), max_tokens: 700, messages: [{ role: "system", content: system }, ...messages] }) });
    const j: any = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message ?? `AI request failed (${r.status})`);
    return cleanAnswer(j.choices?.[0]?.message?.content ?? "");
  } finally { clearTimeout(timer); }
}

export const AI_DAILY_CAP = 40;
/** Counts one fresh call against the student's daily cap. Returns false when the cap is reached. */
export async function takeQuota(userId: string, day: string) {
  const row = await prisma.aiUsage.upsert({ where: { userId_day: { userId, day } }, create: { userId, day, count: 1 }, update: { count: { increment: 1 } } });
  return row.count <= AI_DAILY_CAP;
}

export async function explain(userId: string, day: string, i: ExplainInput) {
  const cacheable = !i.followup && !(i.history?.length), ck = cacheKey(i);
  if (cacheable) { const hit = await prisma.aiExplanation.findUnique({ where: { key: ck } }); if (hit) return { text: hit.text, source: "cache" as const }; }
  if (!(await takeQuota(userId, day))) throw Object.assign(new Error(QUOTA_NOTE(i.lang, AI_DAILY_CAP)), { status: 429 });
  const text = await callModel(i); if (!text) throw new Error("The AI tutor returned an empty answer. Please try again.");
  if (cacheable) await prisma.aiExplanation.upsert({ where: { key: ck }, create: { key: ck, text }, update: { text } });
  return { text, source: "ai" as const };
}
