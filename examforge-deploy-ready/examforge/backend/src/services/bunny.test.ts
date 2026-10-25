import { describe, it, expect, afterEach } from "vitest"; import { createHash } from "node:crypto";
import { bunnyId, bunnySrc } from "./bunny";
const G = "123e4567-e89b-12d3-a456-426614174000";
afterEach(() => { delete process.env.BUNNY_LIBRARY_ID; delete process.env.BUNNY_EMBED_KEY; });
describe("bunny", () => {
  it("parses ids and links", () => { expect(bunnyId(G)).toBe(G); expect(bunnyId(`bunny:${G.toUpperCase()}`)).toBe(G); expect(bunnyId(`https://iframe.mediadelivery.net/embed/555/${G}`)).toBe(G); expect(bunnyId("https://youtu.be/abcdefghijk")).toBeNull(); expect(bunnyId("hello")).toBeNull(); });
  it("is off without a library id", () => expect(bunnySrc(G)).toBeNull());
  it("signs the link with sha256(key + id + expires)", () => {
    process.env.BUNNY_LIBRARY_ID = "555"; process.env.BUNNY_EMBED_KEY = "k"; const src = bunnySrc(G, 100, 1_000_000)!, expires = 1000 + 100;
    expect(src).toContain(`/embed/555/${G}`); expect(src).toContain(`expires=${expires}`); expect(src).toContain(`token=${createHash("sha256").update("k" + G + expires).digest("hex")}`);
  });
});
