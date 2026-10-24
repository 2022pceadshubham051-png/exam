import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from "vitest";
import express from "express"; import type { AddressInfo } from "node:net"; import type { Server } from "node:http";
import { mkQuestion } from "../testkit/fakeDb";
import { daily } from "./daily"; import { duels } from "./duels"; import { streak } from "./streak"; import { sign } from "../middleware/auth"; import { resetPoolCache } from "../services/quiz";

// The route modules import "../lib/db"; give them the in-memory fake instead (vitest hoists vi.mock above the imports).
vi.mock("../lib/db", async () => { const { makeFakeDb } = await import("../testkit/fakeDb"); const f = makeFakeDb(); (globalThis as any).__fake = f; return { prisma: f.prisma }; });
const fake = (globalThis as any).__fake as ReturnType<typeof import("../testkit/fakeDb").makeFakeDb>;
process.env.JWT_SECRET = "test-secret";

let server: Server, base = "";
beforeAll(async () => { const app = express(); app.use(express.json()); app.use("/api", daily, duels, streak); await new Promise<void>((r) => { server = app.listen(0, () => r()); }); base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`; });
afterAll(() => { server.close(); });
const tok = (id: string) => sign({ id, role: "USER" });
const call = async (user: string | null, method: string, path: string, body?: unknown) => {
  const r = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(user ? { authorization: `Bearer ${tok(user)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as any };
};
const answersFor = (qs: any[], right: number) => qs.map((q, i) => ({ questionId: q.id, selectedKey: i < right ? q.id && fake.t.questions.find((x) => x.id === q.id)!.correctKey : null, timeMs: 1000 }));

beforeEach(() => {
  resetPoolCache();
  Object.assign(fake.t, { challenges: [], daily: [], coins: [], streaks: [], duels: [], duelEntries: [], questions: Array.from({ length: 30 }, (_, i) => mkQuestion(i)) });
  fake.t.users.clear(); fake.t.users.set("u1", { id: "u1", name: "Asha", displayName: null, inventory: null }); fake.t.users.set("u2", { id: "u2", name: "Ravi", displayName: "Ravi K", inventory: null });
});

describe("auth", () => { it("rejects anonymous calls", async () => { expect((await call(null, "GET", "/daily")).status).toBe(401); expect((await call(null, "POST", "/duels", {})).status).toBe(401); }); });

describe("daily challenge", () => {
  it("shows a new challenge, never leaking answers, and the same questions to everyone", async () => {
    const a = await call("u1", "GET", "/daily"); expect(a.json).toMatchObject({ status: "new", count: 10, durationSec: 600 });
    const s1 = await call("u1", "POST", "/daily/start", {}), s2 = await call("u2", "POST", "/daily/start", {});
    expect(s1.json.questions).toHaveLength(10); expect(JSON.stringify(s1.json)).not.toMatch(/correctKey|explanation|Because/);
    expect(s1.json.questions.map((q: any) => q.id)).toEqual(s2.json.questions.map((q: any) => q.id));
  });
  it("grades on the server, pays coins once, starts a streak and reveals answers afterwards", async () => {
    const s = await call("u1", "POST", "/daily/start", {});
    const r = await call("u1", "POST", "/daily/submit", { answers: answersFor(s.json.questions, 7) });
    expect(r.status).toBe(200);
    expect(r.json.summary).toMatchObject({ correct: 7, incorrect: 0, unanswered: 3, total: 10, score: 7, rank: 1 });
    expect(r.json.coins).toBe(24); expect(r.json.streak).toMatchObject({ current: 1, changed: true });
    expect(r.json.review[0]).toHaveProperty("correctKey"); expect(fake.t.coins.filter((c) => c.reason === "daily-challenge")).toHaveLength(1);
    expect((await call("u1", "GET", "/daily")).json).toMatchObject({ status: "done", summary: { correct: 7 } });
  });
  it("applies negative marking", async () => {
    const s = await call("u1", "POST", "/daily/start", {});
    const wrong = s.json.questions.map((q: any) => ({ questionId: q.id, selectedKey: fake.t.questions.find((x) => x.id === q.id)!.correctKey === "A" ? "B" : "A", timeMs: 500 }));
    const r = await call("u1", "POST", "/daily/submit", { answers: wrong }); expect(r.json.summary).toMatchObject({ correct: 0, incorrect: 10, score: -2.5 });
  });
  it("allows only one attempt per day and ignores a double-tap submit", async () => {
    const s = await call("u1", "POST", "/daily/start", {}); const body = { answers: answersFor(s.json.questions, 5) };
    const [x, y] = await Promise.all([call("u1", "POST", "/daily/submit", body), call("u1", "POST", "/daily/submit", body)]);
    expect([x.status, y.status].sort()).toEqual([200, 409]);
    expect(fake.t.coins.filter((c) => c.reason === "daily-challenge")).toHaveLength(1);
    expect((await call("u1", "POST", "/daily/start", {})).status).toBe(409);
  });
  it("cannot submit before starting, or send malformed answers", async () => {
    expect((await call("u1", "POST", "/daily/submit", { answers: [] })).status).toBe(400);
    await call("u1", "POST", "/daily/start", {});
    expect((await call("u1", "POST", "/daily/submit", { answers: [{ questionId: "q1", selectedKey: "Z" }] })).status).toBe(400);
  });
  it("resuming does not reset the clock", async () => {
    await call("u1", "POST", "/daily/start", {}); fake.t.daily[0].startedAt = new Date(Date.now() - 400_000);
    const again = await call("u1", "POST", "/daily/start", {}); expect(again.json.remainingSec).toBeLessThanOrEqual(200); expect(again.json.remainingSec).toBeGreaterThan(190);
  });
  it("a very late submission still grades but is kept off the leaderboard", async () => {
    const s = await call("u1", "POST", "/daily/start", {}); fake.t.daily[0].startedAt = new Date(Date.now() - 2_000_000);
    const r = await call("u1", "POST", "/daily/submit", { answers: answersFor(s.json.questions, 9) });
    expect(r.json.summary).toMatchObject({ late: true, rank: null, correct: 9 }); expect((await call("u2", "GET", "/daily/leaderboard")).json.rows).toHaveLength(0);
  });
  it("ranks by score, then speed", async () => {
    for (const [u, right, secs] of [["u1", 6, 300], ["u2", 8, 500]] as const) { const s = await call(u, "POST", "/daily/start", {}); fake.t.daily.find((e) => e.userId === u)!.startedAt = new Date(Date.now() - secs * 1000); await call(u, "POST", "/daily/submit", { answers: answersFor(s.json.questions, right) }); }
    const lb = (await call("u1", "GET", "/daily/leaderboard")).json; expect(lb.rows.map((r: any) => r.name)).toEqual(["Ravi K", "Asha"]); expect(lb.rows[1].isMe).toBe(true);
  });
  it("needs enough questions", async () => { fake.t.questions = fake.t.questions.slice(0, 3); expect((await call("u1", "GET", "/daily")).status).toBe(404); });
});

describe("streak across days (service + route)", () => {
  it("continues yesterday's streak and a freeze covers one missed day", async () => {
    const { dayKey } = await import("../services/coins"); const { touchStreak } = await import("../services/streak");
    const ist = (back: number) => new Date(Date.now() + 5.5 * 3600_000 - back * 86_400_000).toISOString().slice(0, 10); void dayKey;
    fake.t.streaks.push({ userId: "u1", current: 4, best: 4, lastDay: ist(1), freezesUsed: 0 });
    expect(await touchStreak("u1")).toMatchObject({ current: 5, changed: true });
    fake.t.streaks[0].lastDay = ist(2); fake.t.users.get("u1")!.inventory = { freezes: 1 };
    const r = await touchStreak("u1"); expect(r).toMatchObject({ current: 6, freezesUsed: 1 }); expect(fake.t.users.get("u1")!.inventory.freezes).toBe(0);
    fake.t.streaks[0].lastDay = ist(3); expect(await touchStreak("u1")).toMatchObject({ current: 1, reset: true });
  });
  it("pays a milestone bonus once", async () => {
    const { touchStreak } = await import("../services/streak"); const ist = (back: number) => new Date(Date.now() + 5.5 * 3600_000 - back * 86_400_000).toISOString().slice(0, 10);
    fake.t.streaks.push({ userId: "u1", current: 2, best: 2, lastDay: ist(1), freezesUsed: 0 });
    expect((await touchStreak("u1")).milestoneCoins).toBe(10); expect((await touchStreak("u1")).milestoneCoins).toBe(0);
  });
});

describe("duels", () => {
  it("full flow: create, friend joins, both submit, winner decided, coins paid once", async () => {
    const c = await call("u1", "POST", "/duels", { count: 5 }); expect(c.status).toBe(200); expect(c.json.code).toMatch(/^[A-Z2-9]{6}$/); expect(c.json.questions).toHaveLength(5); expect(JSON.stringify(c.json)).not.toMatch(/correctKey|Because/);
    const code = c.json.code;
    const peek = await call("u2", "GET", `/duels/${code}`); expect(peek.json).toMatchObject({ creator: "Asha", state: "waiting", me: { joined: false }, results: null });
    const j = await call("u2", "POST", `/duels/${code}/join`, {}); expect(j.json.questions.map((q: any) => q.id)).toEqual(c.json.questions.map((q: any) => q.id));
    const first = await call("u1", "POST", `/duels/${code}/submit`, { answers: answersFor(c.json.questions, 5) });
    expect(first.json.results).toMatchObject({ opponent: null, winner: null }); expect(first.json.review).toHaveLength(5);
    const second = await call("u2", "POST", `/duels/${code}/submit`, { answers: answersFor(j.json.questions, 2) });
    expect(second.json.results).toMatchObject({ winner: "opponent", opponentName: "Asha" }); expect(second.json.coins).toBe(8);
    const view1 = await call("u1", "GET", `/duels/${code}`); expect(view1.json).toMatchObject({ state: "done", results: { winner: "me", opponent: { name: "Ravi K", correct: 2 } } });
    expect(fake.t.coins.filter((x) => x.reason === "duel")).toHaveLength(2); expect(fake.t.coins.find((x) => x.reason === "duel" && x.userId === "u1")!.amount).toBe(25);
  });
  it("hides the opponent's score until you have finished", async () => {
    const c = await call("u1", "POST", "/duels", { count: 5 }); await call("u2", "POST", `/duels/${c.json.code}/join`, {});
    await call("u1", "POST", `/duels/${c.json.code}/submit`, { answers: answersFor(c.json.questions, 5) });
    const v = await call("u2", "GET", `/duels/${c.json.code}`); expect(v.json.results).toBeNull(); expect((await call("u2", "GET", `/duels/${c.json.code}/review`)).status).toBe(403);
  });
  it("a third person cannot take the second seat, and nobody can finish twice", async () => {
    fake.t.users.set("u3", { id: "u3", name: "Zed", displayName: null });
    const c = await call("u1", "POST", "/duels", { count: 5 }); await call("u2", "POST", `/duels/${c.json.code}/join`, {});
    expect((await call("u3", "POST", `/duels/${c.json.code}/join`, {})).status).toBe(409);
    const b = { answers: answersFor(c.json.questions, 3) }; expect((await call("u1", "POST", `/duels/${c.json.code}/submit`, b)).status).toBe(200); expect((await call("u1", "POST", `/duels/${c.json.code}/submit`, b)).status).toBe(409);
    expect((await call("u3", "POST", `/duels/${c.json.code}/submit`, b)).status).toBe(400);
  });
  it("ties on score are broken by time", async () => {
    const c = await call("u1", "POST", "/duels", { count: 5 }); const code = c.json.code; await call("u2", "POST", `/duels/${code}/join`, {});
    fake.t.duelEntries.find((e) => e.userId === "u1")!.startedAt = new Date(Date.now() - 200_000);
    await call("u1", "POST", `/duels/${code}/submit`, { answers: answersFor(c.json.questions, 3) }); const r = await call("u2", "POST", `/duels/${code}/submit`, { answers: answersFor(c.json.questions, 3) });
    expect(r.json.results).toMatchObject({ winner: "me", reason: "time" });
  });
  it("unknown code, bad count, and expired links are handled", async () => {
    expect((await call("u1", "GET", "/duels/NOPE22")).status).toBe(404); expect((await call("u1", "POST", "/duels", { count: 7 })).status).toBe(400);
    const c = await call("u1", "POST", "/duels", { count: 5 }); fake.t.duels[0].createdAt = new Date(Date.now() - 49 * 3600_000);
    expect((await call("u2", "POST", `/duels/${c.json.code}/join`, {})).status).toBe(410);
  });
  it("lists my duels", async () => { await call("u1", "POST", "/duels", { count: 5 }); const l = await call("u1", "GET", "/duels"); expect(l.json).toHaveLength(1); expect(l.json[0]).toMatchObject({ state: "waiting", finished: false }); });
});
