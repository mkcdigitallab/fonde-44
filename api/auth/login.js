import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { createSession, setSessionCookie } from "../_lib/auth.js";

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  const body = parseBody(req);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const role = String(body?.role || "");
  if (!email || password.length < 8 || !["mere-fonde","livreur"].includes(role)) {
    return json(res, 422, { error: "invalid_credentials" });
  }

  const result = await query("select id,public_id,email,display_name,role,password_hash from auth.staff_users where lower(email)=lower($1) and role=$2 and is_active=true", [email, role]);
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) return json(res, 401, { error: "invalid_credentials" });

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  return json(res, 200, { data: { id:user.public_id, email:user.email, name:user.display_name, role:user.role } });
}
