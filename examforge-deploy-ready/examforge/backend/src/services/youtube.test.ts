import { describe, it, expect } from "vitest";
import { youtubeId } from "./youtube";

describe("youtubeId", () => {
  const id = "dQw4w9WgXcQ";
  it("reads every common link style", () => {
    for (const u of [`https://www.youtube.com/watch?v=${id}&t=30s`, `https://youtu.be/${id}?si=abc`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`, `https://youtube.com/shorts/${id}`, `https://www.youtube.com/live/${id}`, `youtube.com/watch?v=${id}`, id])
      expect(youtubeId(u), u).toBe(id);
  });
  it("rejects anything else", () => {
    for (const u of ["", "hello", "https://vimeo.com/12345678901", "https://evil.com/watch?v=" + id, `https://youtube.com/watch?v=short`]) expect(youtubeId(u), u).toBeNull();
  });
});
