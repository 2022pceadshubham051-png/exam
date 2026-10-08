import { it, expect } from "vitest";
import { detect, normalizeSubject } from "./classifier";
it("detects subjects and topics", () => {
  expect(detect("If CODE is coded as DPEF, how is TEST written in that code language?")).toMatchObject({ subject: "reasoning", topic: "Coding-Decoding" });
  expect(detect("A train 150 m long runs at a speed of 54 km/h. Time to cross a pole?").subject).toBe("quant");
  expect(detect("Choose the synonym of 'abundant'").subject).toBe("english");
  expect(detect("Which article of the Constitution deals with fundamental rights?")).toMatchObject({ subject: "ga", topic: "Polity & Constitution" });
  expect(detect("What is the time complexity of quick sort in the worst case?")).toMatchObject({ subject: "cs", topic: "Algorithms" });
  expect(detect("Which layer of the OSI model handles routing?").subject).toBe("cs");
  expect(detect("'आँख का तारा' मुहावरे का अर्थ है").subject).toBe("hindi");
});
it("uses admin hints and normalises names", () => {
  expect(detect("Pick the right one", { subject: "Reasoning", topic: "Blood Relations" }).subject).toBe("reasoning");
  expect(normalizeSubject("General Intelligence & Reasoning")).toBe("reasoning");
  expect(normalizeSubject("Quantitative Aptitude")).toBe("quant");
});
