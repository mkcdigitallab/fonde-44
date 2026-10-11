import { getSessionUser } from "../_lib/auth.js";
import { json, method } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  const user = await getSessionUser(req);
  return json(res, 200, { data: user ? { id:user.public_id, email:user.email, name:user.display_name, role:user.role } : null });
}
