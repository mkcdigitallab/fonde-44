import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import health from "../api/health.js";
import products from "../api/products.js";
import orders from "../api/orders.js";
import events from "../api/events.js";
import voiceRequests from "../api/voice-requests.js";
import { MinioMediaStorage } from "../api/media/minio-media-storage.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

app.use(express.json({ limit: "8mb" }));
app.get("/api/health", health);
app.get("/api/products", products);
app.patch("/api/products", products);
app.post("/api/orders", orders);
app.post("/api/events", events);
app.get("/api/voice-requests", voiceRequests);
app.post("/api/voice-requests", voiceRequests);
app.patch("/api/voice-requests", voiceRequests);
app.get("/api/media/object", async (req, res) => {
  if (!req.query.key) return res.status(400).json({ error: "key requis" });
  if (!process.env.MINIO_ENDPOINT) return res.status(404).end();
  try {
    const storage = new MinioMediaStorage({ endpoint: process.env.MINIO_ENDPOINT, accessKeyId: process.env.MINIO_ACCESS_KEY, secretAccessKey: process.env.MINIO_SECRET_KEY, bucket: process.env.MINIO_BUCKET || "fonde44" });
    const object = await storage.get({ key: String(req.query.key) });
    res.setHeader("Content-Type", object.ContentType || "application/octet-stream");
    object.Body.pipe(res);
  } catch { res.status(404).end(); }
});

app.use("/media", express.static(process.env.MEDIA_DIR || path.resolve(process.cwd(), "storage/media")));
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Fondé 44 local: http://localhost:${port}`);
});
