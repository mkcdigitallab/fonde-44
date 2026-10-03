import express from "express";
import { createServer as createViteServer } from "vite";
import health from "../api/health.js";
import products from "../api/products.js";
import orders from "../api/orders.js";
import events from "../api/events.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.get("/api/health", health);
app.get("/api/products", products);
app.post("/api/orders", orders);
app.post("/api/events", events);

const vite = await createViteServer({
  server: { middlewareMode: true, host: "0.0.0.0", hmr: false },
  appType: "spa",
});

app.use(vite.middlewares);
app.listen(port, "0.0.0.0", () => {
  console.log(`Fondé 44 local: http://localhost:${port}`);
});
