import { describe, it, expect } from "vitest";
import { buildPdf, certId, certFile } from "./certificate";

const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9]);
const text = (u: Uint8Array) => new TextDecoder("latin1").decode(u);

describe("buildPdf", () => {
  const pdf = buildPdf(fakeJpeg, 1600, 1131), s = text(pdf);
  it("is a PDF with a header and an end marker", () => { expect(s.startsWith("%PDF-1.4")).toBe(true); expect(s.trimEnd().endsWith("%%EOF")).toBe(true); });
  it("sizes the page to the picture's shape", () => expect(s).toContain("/MediaBox [0 0 842 595]"));
  it("stores the picture bytes untouched and declares their length", () => { expect(s).toContain(`/Length ${fakeJpeg.length} `); expect(s).toContain("/Filter /DCTDecode"); });
  it("has a cross-reference table whose offsets point at each object", () => {
    const start = Number(/startxref\n(\d+)/.exec(s)![1]); expect(s.slice(start, start + 4)).toBe("xref");
    const rows = s.slice(start).split("\n").slice(3, 8); expect(rows).toHaveLength(5);
    rows.forEach((r, k) => { const off = Number(r.slice(0, 10)); expect(s.slice(off, off + `${k + 1} 0 obj`.length)).toBe(`${k + 1} 0 obj`); });
  });
});
describe("certId", () => {
  it("is stable for the same student and course", () => expect(certId("u1", "c1")).toBe(certId("u1", "c1")));
  it("differs between students and between courses", () => { expect(certId("u1", "c1")).not.toBe(certId("u2", "c1")); expect(certId("u1", "c1")).not.toBe(certId("u1", "c2")); });
  it("looks like EF-XXXXXX without confusing characters", () => expect(certId("u1", "c1")).toMatch(/^EF-[2-9A-HJKMNP-Z]{6}$/));
});
describe("certFile", () => {
  it("makes a safe file name", () => { expect(certFile("SSC CGL Maths – Complete!", "pdf")).toBe("certificate-ssc-cgl-maths-complete.pdf"); expect(certFile("!!!", "png")).toBe("certificate-course.png"); });
});
