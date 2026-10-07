import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import health from "../api/health.js";
import products from "../api/products.js";
import orders from "../api/orders.js";
import events from "../api/events.js";
import voiceRequests from "../api/voice-requests.js";
import authLogin from "../api/auth/login.js";
import authActivate from "../api/auth/activate.js";
import authMe from "../api/auth/me.js";
import authLogout from "../api/auth/logout.js";
import dashboard from "../api/dashboard.js";
import orderStatus from "../api/orders/status.js";
import orderTrack from "../api/orders/track.js";
import orderCancel from "../api/orders/cancel.js";
import subscriptions from "../api/subscriptions.js";
import runSubscriptions from "../api/subscriptions/run.js";
import payments from "../api/payments.js";
import { POST as waveWebhookPost } from "../api/payments/webhook/wave.js";
import { POST as orangeWebhookPost } from "../api/payments/webhook/orange.js";
import adminTables from "../api/admin/tables.js";
import adminTable from "../api/admin/table.js";
import adminAudit from "../api/admin/audit.js";
import adminAction from "../api/admin/action.js";
import customerRegister from "../api/customer/register.js";
import customerLogin from "../api/customer/login.js";
import customerGoogle from "../api/customer/google.js";
import customerLogout from "../api/customer/logout.js";
import customerMe from "../api/customer/me.js";
import customerOrders from "../api/customer/orders.js";
import mediaObject from "../api/media/object.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

app.use(express.json({ limit: "8mb", verify: (req, _res, buffer) => { req.rawBody = buffer.toString("utf8"); } }));
app.get("/api/health", health);
app.post("/api/auth/login", authLogin);
app.post("/api/auth/activate", authActivate);
app.get("/api/auth/me", authMe);
app.post("/api/auth/logout", authLogout);
app.post("/api/customer/register", customerRegister);
app.post("/api/customer/login", customerLogin);
app.post("/api/customer/google", customerGoogle);
app.post("/api/customer/logout", customerLogout);
app.get("/api/customer/me", customerMe);
app.patch("/api/customer/me", customerMe);
app.delete("/api/customer/me", customerMe);
app.get("/api/customer/orders", customerOrders);
app.get("/api/products", products);
app.patch("/api/products", products);
app.post("/api/orders", orders);
app.patch("/api/orders/status", orderStatus);
app.get("/api/orders/track", orderTrack);
app.post("/api/orders/cancel", orderCancel);
app.get("/api/dashboard", dashboard);
app.get("/api/subscriptions", subscriptions);
app.post("/api/subscriptions", subscriptions);
app.patch("/api/subscriptions", subscriptions);
app.post("/api/subscriptions/run", runSubscriptions);
app.get("/api/payments", payments);
app.post("/api/payments", payments);

async function adaptWebhook(handler, req, res) {
  const origin = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
    else if (value != null) headers.set(name, value);
  }
  const request = new Request(origin, {
    method: req.method,
    headers,
    body: req.rawBody ?? "",
  });
  const response = await handler(request);
  res.status(response.status);
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(await response.text());
}

app.post("/api/payments/webhook/wave", (req, res) => adaptWebhook(waveWebhookPost, req, res));
app.post("/api/payments/webhook/orange", (req, res) => adaptWebhook(orangeWebhookPost, req, res));
app.post("/api/events", events);
app.get("/api/voice-requests", voiceRequests);
app.post("/api/voice-requests", voiceRequests);
app.patch("/api/voice-requests", voiceRequests);
app.get("/api/admin/tables", adminTables);
app.get("/api/admin/table", adminTable);
app.get("/api/admin/audit", adminAudit);
app.post("/api/admin/action", adminAction);
app.get("/api/media/object", mediaObject);

app.use("/media", express.static(process.env.MEDIA_DIR || path.resolve(process.cwd(), "storage/media")));
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Fondé 44 local: http://localhost:${port}`);
});
