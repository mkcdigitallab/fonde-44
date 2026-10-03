import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import health from "../api/health.js";
import products from "../api/products.js";
import orders from "../api/orders.js";
import events from "../api/events.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

app.use(express.json({ limit: "1mb" }));
app.get("/api/health", health);
app.get("/api/products", products);
app.post("/api/orders", orders);
app.post("/api/events", events);

app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Fondé 44 local: http://localhost:${port}`);
});
