import { describe, it, expect, afterEach } from "vitest"; import { createHash } from "node:crypto";
import { bunnyId, bunnySrc, bunnyDownload } from "./bunny";
const G = "123e4567-e89b-12d3-a456-426614174000";
afterEach(() => { delete process.env.BUNNY_LIBRARY_ID; delete process.env.BUNNY_EMBED_KEY; delete process.env.BUNNY_ALLOW_DOWNLOAD; delete process.env.BUNNY_CDN_HOST; delete process.env.BUNNY_CDN_KEY; });
describe("bunny", () => {
  it("parses ids and links", () => { expect(bunnyId(G)).toBe(G); expect(bunnyId(`bunny:${G.toUpperCase()}`)).toBe(G); expect(bunnyId(`https://iframe.mediadelivery.net/embed/555/${G}`)).toBe(G); expect(bunnyId("https://youtu.be/abcdefghijk")).toBeNull(); expect(bunnyId("hello")).toBeNull(); });
  it("is off without a library id", () => expect(bunnySrc(G)).toBeNull());
  it("signs the link with sha256(key + id + expires)", () => {
    process.env.BUNNY_LIBRARY_ID = "555"; process.env.BUNNY_EMBED_KEY = "k"; const src = bunnySrc(G, 100, 1_000_000)!, expires = 1000 + 100;
    expect(src).toContain(`/embed/555/${G}`); expect(src).toContain(`expires=${expires}`); expect(src).toContain(`token=${createHash("sha256").update("k" + G + expires).digest("hex")}`);
  });
  it("download link is off by default and signed when enabled", () => {
    expect(bunnyDownload(G)).toBeNull(); process.env.BUNNY_ALLOW_DOWNLOAD = "1"; process.env.BUNNY_CDN_HOST = "vz-x.b-cdn.net"; process.env.BUNNY_CDN_KEY = "k";
    const d = bunnyDownload(G, 100, 1_000_000)!, tok = createHash("sha256").update("k" + `/${G}/play_720p.mp4` + 1100).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(d.url).toBe(`https://vz-x.b-cdn.net/${G}/play_720p.mp4?token=${tok}&expires=1100`);
  });
});
