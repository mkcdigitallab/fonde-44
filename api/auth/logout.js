import { clearSessionCookie, destroySession } from "../_lib/auth.js";
import { json, method } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  await destroySession(req);
  clearSessionCookie(res);
  return json(res, 200, { data: true });
}
