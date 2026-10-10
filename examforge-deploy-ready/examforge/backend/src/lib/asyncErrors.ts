/**
 * Express 4 does not forward rejected promises from async route handlers to the error middleware.
 * Without this, one bad request (invalid zod input, Prisma error, ...) in a handler without its own
 * try/catch leaves the request hanging and can crash the whole Node process (unhandled rejection).
 * This patches Layer.handle_request once so every async handler is covered.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Layer = require("express/lib/router/layer");

Layer.prototype.handle_request = function handleRequest(req: any, res: any, next: any) {
  const fn = this.handle;
  if (fn.length > 3) return next(); // error-handling middleware: not part of the normal chain
  try {
    const out = fn(req, res, next);
    if (out && typeof out.catch === "function") out.catch(next);
  } catch (err) {
    next(err);
  }
};
