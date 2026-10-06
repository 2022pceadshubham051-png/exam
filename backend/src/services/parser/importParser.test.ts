import { it, expect } from "vitest";
import { parseQuestions } from "./importParser";
it("parses mixed formats", () => {
  const r = parseQuestions(`Question 1. Which protocol is secure?\n(A) HTTP\n(B) HTTPS\n(C) FTP\n(D) SMTP\nCorrect Option: B\nExplanation: TLS.\n\nQuestion 2. FIFO?\nA) Stack\nB) Queue\nC) Tree\nD) Graph\nAns: Queue`);
  expect(r[0].errors).toEqual([]); expect(r[0].correctKey).toBe("B"); expect(r[1].correctKey).toBe("B");
});
it("flags missing option / bad answer", () => {
  const r = parseQuestions(`Question 17. X?\nA. a\nB. b\nC. c\nAnswer: E`);
  expect(r[0].errors.join()).toMatch(/Missing option D/);
  expect(r[0].errors.join()).toMatch(/"E" does not exist/);
});
