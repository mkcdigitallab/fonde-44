import { query } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { hashPassword, verifyPassword } from "../_lib/passwords.js";
import { destroyCustomerSessions, requireCustomer, clearCustomerCookie } from "../_lib/customerAuth.js";
import { writeAudit } from "../_lib/audit.js";
import { z } from "zod";

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).refine(
    (value) => value === "" || value.length >= 8,
    "Le téléphone doit contenir au moins 8 caractères ou être vide.",
  ).optional(),
}).strict();
const deleteSchema = z.object({ confirm:z.literal("SUPPRIMER"), password:z.string().optional() }).strict();

export default async function handler(req, res) {
  if (![ "GET","PATCH","DELETE" ].includes(req.method)) return method(res, ["GET","PATCH","DELETE"]);
  if (req.method !== "GET" && !requireSameOrigin(req, res)) return;
  const customer = await requireCustomer(req, res);
  if (!customer) return;

  if (req.method === "GET") {
    return json(res, 200, { data:{id:customer.public_id,name:customer.display_name,email:customer.email,phone:customer.phone,hasPassword:Boolean(customer.password_hash),hasGoogle:Boolean(customer.google_sub)} });
  }

  if (req.method === "PATCH") {
    const parsed = patchSchema.safeParse(parseBody(req));
    if (!parsed.success) return json(res,400,{error:"validation_error",details:parsed.error.flatten()});
    const fields=[], values=[];
    if (parsed.data.displayName !== undefined) { fields.push(`display_name=$${values.length+1}`); values.push(parsed.data.displayName); }
    if (parsed.data.phone !== undefined) { fields.push(`phone=$${values.length+1}`); values.push(parsed.data.phone || null); }
    if (!fields.length) return json(res,200,{data:{id:customer.public_id,name:customer.display_name,email:customer.email,phone:customer.phone,hasPassword:Boolean(customer.password_hash),hasGoogle:Boolean(customer.google_sub)}});
    values.push(customer.id);
    const result=await query(`update auth.customers set ${fields.join(",")} where id=$${values.length} returning public_id,display_name,email,phone,password_hash,google_sub`,values);
    const updated=result.rows[0];
    return json(res,200,{data:{id:updated.public_id,name:updated.display_name,email:updated.email,phone:updated.phone,hasPassword:Boolean(updated.password_hash),hasGoogle:Boolean(updated.google_sub)}});
  }

  const parsed=deleteSchema.safeParse(parseBody(req));
  if(!parsed.success) return json(res,400,{error:"confirmation_required"});
  if(customer.password_hash && (!parsed.data.password || !verifyPassword(parsed.data.password,customer.password_hash))) return json(res,401,{error:"invalid_credentials"});
  const client = await (await import("../_lib/db.js")).getPool().connect();
  try {
    await client.query("begin");
    await destroyCustomerSessions(customer.id, client);
    await client.query("delete from auth.customers where id=$1",[customer.id]);
    await writeAudit(client,null,"customer.deleted",customer.public_id,{});
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    console.error("customer.delete", error);
    return json(res,500,{error:"customer_delete_failed"});
  } finally { client.release(); }
  clearCustomerCookie(res);
  return json(res,200,{data:true});
}
