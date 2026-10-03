import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import health from "../api/health.js";
import products from "../api/products.js";
import orders from "../api/orders.js";
import events from "../api/events.js";
import voiceRequests from "../api/voice-requests.js";
import authLogin from "../api/auth/login.js";
import authMe from "../api/auth/me.js";
import authLogout from "../api/auth/logout.js";
import dashboard from "../api/dashboard.js";
import orderStatus from "../api/orders/status.js";
import subscriptions from "../api/subscriptions.js";
import payments from "../api/payments.js";
import waveWebhook from "../api/payments/webhook/wave.js";
import orangeWebhook from "../api/payments/webhook/orange.js";
import { MinioMediaStorage } from "../api/media/minio-media-storage.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

app.use(express.json({ limit: "8mb", verify: (req, _res, buffer) => { req.rawBody = buffer.toString("utf8"); } }));
app.get("/api/health", health);
app.post("/api/auth/login", authLogin);
app.get("/api/auth/me", authMe);
app.post("/api/auth/logout", authLogout);
app.get("/api/products", products);
app.patch("/api/products", products);
app.post("/api/orders", orders);
app.patch("/api/orders/status", orderStatus);
app.get("/api/dashboard", dashboard);
app.get("/api/subscriptions", subscriptions);
app.post("/api/subscriptions", subscriptions);
app.patch("/api/subscriptions", subscriptions);
app.post("/api/payments", payments);
app.post("/api/payments/webhook/wave", waveWebhook);
app.post("/api/payments/webhook/orange", orangeWebhook);
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
