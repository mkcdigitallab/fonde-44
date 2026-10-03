export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").end(JSON.stringify(body));
}
export function method(res, allowed) { res.setHeader("Allow", allowed.join(", ")); return json(res, 405, { error: "method_not_allowed" }); }
export function parseBody(req) { if (!req.body) return {}; if (typeof req.body === "object") return req.body; try { return JSON.parse(req.body); } catch { return null; } }
