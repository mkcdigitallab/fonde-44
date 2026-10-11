import ipDebug from "../_lib/ipDebug.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ error: "not_found" });
  }
  return ipDebug(req, res);
}
