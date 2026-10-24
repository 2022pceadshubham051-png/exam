import type { AuthedReq } from "../middleware/auth";
/** Wraps an async handler: zod problems -> 400, thrown {status,message} -> that status, anything else -> a clean 500. */
export const wrap = (fn: (req: AuthedReq, res: any) => Promise<any>) => (req: AuthedReq, res: any) => fn(req, res).catch((e) => {
  if (e?.issues) return res.status(400).json({ error: e.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  if (e?.status) return res.status(e.status).json({ error: e.message });
  console.error("API error:", e); res.status(500).json({ error: "Something went wrong. Please try again." });
});
export const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
