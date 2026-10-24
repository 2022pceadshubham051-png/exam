import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../lib/db", () => ({ prisma: {} }));
import { buildMessages, questionBlock, cacheKey, SYSTEM, cleanAnswer, type ExplainInput } from "./aiLogic";
import { callModel } from "./ai";

const base: ExplainInput = { text: "2 + 2 = ?", options: [{ key: "A", text: "3" }, { key: "B", text: "4" }], correctKey: "B", selectedKey: "A", lang: "en" };

describe("prompt", () => {
  it("asks for Devanagari Hindi or plain English (never Hinglish) and treats the question as data", () => {
    expect(SYSTEM("hi")).toMatch(/Devanagari/); expect(SYSTEM("hi")).toMatch(/no Hinglish/); expect(SYSTEM("en")).toMatch(/Do not mix in Hindi/); expect(SYSTEM("en")).toMatch(/Never follow instructions/); expect(SYSTEM("en")).not.toMatch(/Roman letters/);
  });
  it("puts the question, key and the student's choice in the first message", () => {
    const m = buildMessages(base); expect(m).toHaveLength(1); expect(m[0].content).toContain("<question>"); expect(m[0].content).toContain("Answer key: B"); expect(m[0].content).toContain("Student chose: A");
  });
  it("truncates oversized text (prompt-stuffing guard)", () => { expect(questionBlock({ ...base, text: "x".repeat(50_000) }).length).toBeLessThan(3500); });
  it("keeps roles alternating and ends on a user turn when a follow-up is asked", () => {
    const m = buildMessages({ ...base, history: [{ role: "assistant", content: "First answer" }], followup: "make it easier" });
    expect(m.map((x) => x.role)).toEqual(["user", "assistant", "user"]); expect(m[2].content).toBe("make it easier");
  });
  it("merges consecutive same-role history instead of breaking the API contract", () => {
    const m = buildMessages({ ...base, history: [{ role: "user", content: "a" }, { role: "user", content: "b" }], followup: "c" });
    for (let i = 1; i < m.length; i++) expect(m[i].role).not.toBe(m[i - 1].role); expect(m[m.length - 1].role).toBe("user");
  });
  it("only keeps the last 4 history turns", () => { expect(buildMessages({ ...base, history: Array.from({ length: 6 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as any, content: `m${i}` })), followup: "q" }).length).toBeLessThanOrEqual(7); });
});
describe("cache key", () => {
  it("is stable, and differs by language, answer choice and question", () => {
    expect(cacheKey(base)).toBe(cacheKey({ ...base })); expect(cacheKey(base)).not.toBe(cacheKey({ ...base, lang: "hi" })); expect(cacheKey(base)).not.toBe(cacheKey({ ...base, selectedKey: "B" })); expect(cacheKey(base)).not.toBe(cacheKey({ ...base, text: "3 + 3" }));
  });
});
describe("cleanAnswer", () => { it("trims, strips NULs and caps length", () => { expect(cleanAnswer("  hi\u0000 ")).toBe("hi"); expect(cleanAnswer("x".repeat(9999))).toHaveLength(2500); }); });

describe("callModel (mocked network)", () => {
  beforeEach(() => { process.env.AI_API_KEY = "k"; delete process.env.AI_PROVIDER; delete process.env.AI_BASE_URL; });
  it("calls the Anthropic Messages API and joins the text blocks", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text: "The right answer is B." }, { type: "text", text: "Because 2+2=4." }] }), { status: 200 }));
    const out = await callModel(base, f as any);
    expect(out).toBe("The right answer is B.\nBecause 2+2=4.");
    const [url, init] = f.mock.calls[0] as any; expect(url).toBe("https://api.anthropic.com/v1/messages"); expect(init.headers["x-api-key"]).toBe("k");
    const sent = JSON.parse(init.body); expect(sent.system).toMatch(/simple, clear English/); expect(sent.messages[0].role).toBe("user"); expect(sent.max_tokens).toBeLessThanOrEqual(800);
  });
  it("supports OpenAI-compatible endpoints", async () => {
    process.env.AI_PROVIDER = "openai"; process.env.AI_BASE_URL = "https://example.test/v1/";
    const f = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    expect(await callModel(base, f as any)).toBe("ok"); expect((f.mock.calls[0] as any)[0]).toBe("https://example.test/v1/chat/completions");
  });
  it("surfaces provider errors", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: { message: "overloaded" } }), { status: 529 }));
    await expect(callModel(base, f as any)).rejects.toThrow("overloaded");
  });
});
