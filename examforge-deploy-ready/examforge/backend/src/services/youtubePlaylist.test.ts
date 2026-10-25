import { describe, it, expect } from "vitest"; import { playlistId, isoToMinutes, fetchPlaylist } from "./youtubePlaylist";
describe("playlist", () => {
  it("finds the id", () => { expect(playlistId("https://www.youtube.com/playlist?list=PLabcdefghijklmn")).toBe("PLabcdefghijklmn"); expect(playlistId("https://www.youtube.com/watch?v=abcdefghijk&list=PLabcdefghijklmn&index=2")).toBe("PLabcdefghijklmn"); expect(playlistId("PLabcdefghijklmn")).toBe("PLabcdefghijklmn"); expect(playlistId("https://youtu.be/abcdefghijk")).toBeNull(); });
  it("converts durations", () => { expect(isoToMinutes("PT1H2M30S")).toBe(63); expect(isoToMinutes("PT45S")).toBe(1); expect(isoToMinutes("PT10M")).toBe(10); expect(isoToMinutes("junk")).toBeNull(); });
  it("pages, skips private/deleted/duplicates and adds durations", async () => {
    const get = async (u: string) => { if (u.includes("/playlists?")) return { items: [{ snippet: { title: "Maths" } }] };
      if (u.includes("/playlistItems?")) return u.includes("pageToken") ? { items: [{ snippet: { title: "C", resourceId: { videoId: "ccc" } } }, { snippet: { title: "A again", resourceId: { videoId: "aaa" } } }] } : { nextPageToken: "n", items: [{ snippet: { title: "A", resourceId: { videoId: "aaa" } } }, { snippet: { title: "Private video", resourceId: { videoId: "bbb" } } }] };
      return { items: [{ id: "aaa", contentDetails: { duration: "PT5M" } }, { id: "ccc", contentDetails: { duration: "PT1H" } }] }; };
    const p = await fetchPlaylist("PLx", "k", 500, get); expect(p.title).toBe("Maths"); expect(p.videos).toEqual([{ videoId: "aaa", title: "A", durationMin: 5 }, { videoId: "ccc", title: "C", durationMin: 60 }]);
  });
});
