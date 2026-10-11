import { json } from "./_lib/http.js";
export default async function handler(_req, res) { json(res, 200, { ok: true, service: "fonde-44-api", timestamp: new Date().toISOString() }); }
