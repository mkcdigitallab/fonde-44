import { destroyCustomerSession, clearCustomerCookie } from "../_lib/customerAuth.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { json, method } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if (!requireSameOrigin(req, res)) return;
  await destroyCustomerSession(req);
  clearCustomerCookie(res);
  return json(res, 200, { data:true });
}
