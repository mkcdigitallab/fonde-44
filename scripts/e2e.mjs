#!/usr/bin/env node

const BASE_URL = String(process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const MERE_EMAIL = process.env.E2E_MERE_EMAIL;
const MERE_PASSWORD = process.env.E2E_MERE_PASSWORD;
const LIVREUR_EMAIL = process.env.E2E_LIVREUR_EMAIL;
const LIVREUR_PASSWORD = process.env.E2E_LIVREUR_PASSWORD;

const jars = {
  public: new Map(),
  mere: new Map(),
  livreur: new Map(),
  customer: new Map(),
};

const results = { passed: 0, failed: 0, skipped: 0 };
let firstFailure = null;
let createdOrders = 0;
const MAX_ORDERS = 6;

function label(status, expected, received) {
  return status === "PASS"
    ? `PASS — HTTP ${received}`
    : status === "SKIP"
      ? `SKIP — ${expected}`
      : `FAIL — HTTP attendu ${expected}, reçu ${received}`;
}

function report(name, expected, received, ok, reason = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name} — ${label(status, expected, received)}${reason ? ` — ${reason}` : ""}`);
  if (ok) results.passed += 1;
  else {
    results.failed += 1;
    firstFailure ??= name;
  }
  return ok;
}

function skip(name, reason) {
  console.log(`[SKIP] ${name} — ${reason}`);
  results.skipped += 1;
}

function jsonResponseBody(body) {
  if (body === "") return null;
  try { return JSON.parse(body); } catch { return null; }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function storeCookies(jar, response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : (() => {
        const value = response.headers.get("set-cookie");
        return value ? [value] : [];
      })();

  for (const value of values) {
    const first = value.split(";", 1)[0];
    const separator = first.indexOf("=");
    if (separator > 0) jar.set(first.slice(0, separator), first.slice(separator + 1));
  }
}

async function request(path, options = {}, role = "public") {
  const jar = jars[role];
  const headers = new Headers(options.headers || {});
  headers.set("Origin", BASE_URL);
  if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const cookies = cookieHeader(jar);
  if (cookies) headers.set("Cookie", cookies);

  const response = await fetch(new URL(path, BASE_URL), {
    ...options,
    headers,
    redirect: "manual",
  });
  storeCookies(jar, response);
  const raw = await response.text();
  return { status: response.status, body: jsonResponseBody(raw) };
}

async function step(name, expected, path, options, role, predicate = () => true) {
  try {
    const response = await request(path, options, role);
    const ok = response.status === expected && predicate(response.body);
    const reason = ok ? "" : "réponse ou contenu inattendu";
    report(name, expected, response.status, ok, reason);
    return ok ? response.body : null;
  } catch {
    report(name, expected, "ERR", false, "requête impossible");
    return null;
  }
}

async function pauseAfterStatusChange() {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

function randomPassword() {
  return `E2E-${Date.now()}-${cryptoRandom()}`;
}

function cryptoRandom() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let value = "";
  for (let i = 0; i < 20; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

function clientReference(prefix) {
  return `e2e-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function orderBody(reference, fulfillment = "delivery", address = "Dakar, E2E") {
  return {
    clientReference: reference,
    customer: {
      name: "E2E TEST",
      phone: "771234567",
      address: fulfillment === "delivery" ? address : "",
    },
    items: [{ productId: "fonde", quantity: 3 }],
    fulfillment,
    paymentMethod: "cash",
    orderTiming: "now",
  };
}

function dataOf(body) {
  return body?.data;
}

async function createOrder(name, fulfillment = "delivery") {
  if (createdOrders >= MAX_ORDERS) {
    report(name, 201, "LIMIT", false, "limite E2E de 6 commandes atteinte");
    return null;
  }
  const body = await step(
    name,
    201,
    "/api/orders",
    { method: "POST", body: JSON.stringify(orderBody(clientReference(name), fulfillment)) },
    "public",
    response => Boolean(dataOf(response)?.id && dataOf(response)?.trackingToken),
  );
  if (!body) return null;
  createdOrders += 1;
  return {
    id: dataOf(body).id,
    token: dataOf(body).trackingToken,
  };
}

async function loginStaff(role, email, password) {
  const body = await step(
    `Connexion ${role}`,
    200,
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password, role }) },
    role,
    response => response?.data?.role === role,
  );
  return Boolean(body);
}

async function publicOrderFlow() {
  const order = await createOrder("commande livraison");
  if (!order) return false;

  const payment = await step(
    "Paiement espèces livraison",
    201,
    "/api/payments",
    { method: "POST", body: JSON.stringify({ orderId: order.id, paymentMethod: "cash" }) },
    "public",
    response => response?.data?.status === "pending",
  );
  if (!payment) return false;

  const tracked = await step(
    "Suivi initial",
    200,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`,
    { method: "GET" },
    "public",
    response => response?.data?.status === "received" && response?.data?.paymentStatus === "pending",
  );
  if (!tracked) return false;

  const changedToken = order.token.slice(0, -1) + (order.token.endsWith("A") ? "B" : "A");
  await step(
    "Jeton de suivi modifié",
    404,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(changedToken)}`,
    { method: "GET" },
    "public",
  );

  return true;
}

async function staffDeliveryFlow(order) {
  if (!order) return false;
  if (!await loginStaff("mere-fonde", MERE_EMAIL, MERE_PASSWORD)) return false;

  const dashboard = await step(
    "Dashboard Mère Fondé contient la commande",
    200,
    "/api/dashboard",
    { method: "GET" },
    "mere",
    response => Array.isArray(response?.data?.orders) && response.data.orders.some(item => item.id === order.id),
  );
  if (!dashboard) return false;

  if (!await step(
    "Mère Fondé → ready",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "ready" }) },
    "mere",
  )) return false;
  await pauseAfterStatusChange();

  if (!await step(
    "Suivi → ready",
    200,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`,
    { method: "GET" },
    "public",
    response => response?.data?.status === "ready",
  )) return false;

  if (!await step(
    "Mère Fondé → assigned",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "assigned" }) },
    "mere",
  )) return false;
  await pauseAfterStatusChange();

  if (!await loginStaff("livreur", LIVREUR_EMAIL, LIVREUR_PASSWORD)) return false;

  const dashboardLivreur = await step(
    "Dashboard livreur contient la mission",
    200,
    "/api/dashboard",
    { method: "GET" },
    "livreur",
    response =>
      Array.isArray(response?.data?.deliveries) &&
      response.data.deliveries.some(item => item.id === order.id) &&
      Array.isArray(response?.data?.orders) &&
      response.data.orders.length === 0,
  );
  if (!dashboardLivreur) return false;

  if (!await step(
    "Livreur → out_for_delivery",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "out_for_delivery" }) },
    "livreur",
  )) return false;
  await pauseAfterStatusChange();

  if (!await step(
    "Livreur → delivered",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "delivered" }) },
    "livreur",
  )) return false;
  await pauseAfterStatusChange();

  return await step(
    "Suivi livraison finale",
    200,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`,
    { method: "GET" },
    "public",
    response => response?.data?.status === "delivered" && response?.data?.paymentStatus === "paid",
  ) !== null;
}

async function pickupFlow() {
  const order = await createOrder("commande retrait", "pickup");
  if (!order) return false;

  if (!await step(
    "Paiement espèces retrait",
    201,
    "/api/payments",
    { method: "POST", body: JSON.stringify({ orderId: order.id, paymentMethod: "cash" }) },
    "public",
    response => response?.data?.status === "pending",
  )) return false;

  if (!await step(
    "Retrait Mère Fondé → ready",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "ready" }) },
    "mere",
  )) return false;
  await pauseAfterStatusChange();

  if (!await step(
    "Retrait Mère Fondé → delivered",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "delivered" }) },
    "mere",
  )) return false;
  await pauseAfterStatusChange();

  return await step(
    "Suivi retrait final",
    200,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`,
    { method: "GET" },
    "public",
    response => response?.data?.status === "delivered" && response?.data?.paymentStatus === "paid",
  ) !== null;
}

async function customerCancellationFlow() {
  const order = await createOrder("commande annulation client");
  if (!order) return false;

  if (!await step(
    "Annulation client",
    200,
    "/api/orders/cancel",
    { method: "POST", body: JSON.stringify({ id: order.id, token: order.token }) },
    "public",
    response => response?.data?.status === "cancelled",
  )) return false;

  if (!await step(
    "Deuxième annulation client",
    409,
    "/api/orders/cancel",
    { method: "POST", body: JSON.stringify({ id: order.id, token: order.token }) },
    "public",
  )) return false;

  return await step(
    "Suivi annulation client",
    200,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`,
    { method: "GET" },
    "public",
    response =>
      response?.data?.status === "cancelled" &&
      response?.data?.cancellation?.by === "customer",
  ) !== null;
}

async function staffCancellationFlow() {
  const order = await createOrder("commande annulation staff");
  if (!order) return false;

  if (!await step(
    "Annulation Mère Fondé sans raison",
    422,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "cancelled" }) },
    "mere",
    response => response?.error === "cancel_reason_required",
  )) return false;

  if (!await step(
    "Annulation Mère Fondé avec raison",
    200,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: order.id, status: "cancelled", reason: "out_of_stock" }) },
    "mere",
    response => response?.data?.status === "cancelled",
  )) return false;
  await pauseAfterStatusChange();

  return await step(
    "Suivi annulation Mère Fondé",
    200,
    `/api/orders/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.token)}`,
    { method: "GET" },
    "public",
    response =>
      response?.data?.status === "cancelled" &&
      response?.data?.cancellation?.by === "staff" &&
      response?.data?.cancellation?.reason === "out_of_stock",
  ) !== null;
}

async function rightsFlow(orderId) {
  if (!await loginStaff("livreur", LIVREUR_EMAIL, LIVREUR_PASSWORD)) return false;
  if (!await step(
    "Droit livreur : annulation",
    409,
    "/api/orders/status",
    { method: "PATCH", body: JSON.stringify({ id: orderId, status: "cancelled", reason: "out_of_stock" }) },
    "livreur",
  )) return false;
  return await step(
    "Droit livreur : admin tables",
    403,
    "/api/admin/tables",
    { method: "GET" },
    "livreur",
  ) !== null;
}

async function unauthenticatedRights() {
  await step("Dashboard sans cookie", 401, "/api/dashboard", { method: "GET" }, "public");
  await step("Admin tables sans cookie", 401, "/api/admin/tables", { method: "GET" }, "public");
}

async function customerFlow() {
  const email = `e2e-${Date.now()}@example.test`;
  const password = randomPassword();

  const registered = await step(
    "Inscription client E2E",
    201,
    "/api/customer/register",
    { method: "POST", body: JSON.stringify({ displayName: "E2E TEST", email, password, phone: "771234567" }) },
    "customer",
    response => response?.data?.email === email,
  );
  if (!registered) return false;

  if (!await step(
    "Client GET /me",
    200,
    "/api/customer/me",
    { method: "GET" },
    "customer",
    response => response?.data?.email === email,
  )) return false;

  const order = await createCustomerOrder();
  if (!order) return false;

  const customerOrders = await step(
    "Commandes client connectées",
    200,
    "/api/customer/orders",
    { method: "GET" },
    "customer",
    response => Array.isArray(response?.data) && response.data.some(item => item.id === order.id && item.trackingToken),
  );
  if (!customerOrders) return false;

  if (!await step(
    "Suppression compte client",
    200,
    "/api/customer/me",
    { method: "DELETE", body: JSON.stringify({ confirm: "SUPPRIMER", password }) },
    "customer",
  )) return false;

  return await step(
    "Client GET /me après suppression",
    401,
    "/api/customer/me",
    { method: "GET" },
    "customer",
  ) !== null;
}

async function createCustomerOrder() {
  if (createdOrders >= MAX_ORDERS) {
    report("Commande client E2E", 201, "LIMIT", false, "limite E2E de 6 commandes atteinte");
    return null;
  }
  const body = await step(
    "Commande client connectée",
    201,
    "/api/orders",
    { method: "POST", body: JSON.stringify(orderBody(clientReference("customer"), "pickup")) },
    "customer",
    response => Boolean(dataOf(response)?.id && dataOf(response)?.trackingToken),
  );
  if (!body) return null;
  createdOrders += 1;
  return { id: dataOf(body).id };
}

async function main() {
  console.log(`E2E Fondé 44 — base ${BASE_URL}`);
  console.log("Aucun secret, cookie ou jeton n'est affiché.");

  const staffAvailable = Boolean(MERE_EMAIL && MERE_PASSWORD && LIVREUR_EMAIL && LIVREUR_PASSWORD);
  if (!staffAvailable) {
    console.log("Identifiants du personnel absents : seules les étapes publiques sont exécutées.");
  }

  const order = await createOrder("commande livraison");
  let deliveryOrder = order;
  if (deliveryOrder) {
    const payment = await step(
      "Paiement espèces livraison",
      201,
      "/api/payments",
      { method: "POST", body: JSON.stringify({ orderId: deliveryOrder.id, paymentMethod: "cash" }) },
      "public",
      response => response?.data?.status === "pending",
    );
    if (!payment) deliveryOrder = null;
    if (deliveryOrder) {
      const tracked = await step(
        "Suivi initial",
        200,
        `/api/orders/track?id=${encodeURIComponent(deliveryOrder.id)}&token=${encodeURIComponent(deliveryOrder.token)}`,
        { method: "GET" },
        "public",
        response => response?.data?.status === "received" && response?.data?.paymentStatus === "pending",
      );
      if (tracked) {
        const changedToken = deliveryOrder.token.slice(0, -1) + (deliveryOrder.token.endsWith("A") ? "B" : "A");
        await step(
          "Jeton de suivi modifié",
          404,
          `/api/orders/track?id=${encodeURIComponent(deliveryOrder.id)}&token=${encodeURIComponent(changedToken)}`,
          { method: "GET" },
          "public",
        );
      }
    }
  }

  if (staffAvailable) {
    await staffDeliveryFlow(deliveryOrder);
    await pickupFlow();
    await staffCancellationFlow();
    await rightsFlow(deliveryOrder?.id);
  } else {
    for (const name of [
      "Connexion Mère Fondé",
      "Dashboard Mère Fondé",
      "Mère Fondé → ready",
      "Suivi → ready",
      "Mère Fondé → assigned",
      "Connexion livreur",
      "Dashboard livreur",
      "Livreur → out_for_delivery",
      "Livreur → delivered",
      "Suivi livraison finale",
      "Commande retrait + paiement",
      "Retrait Mère Fondé → ready",
      "Retrait Mère Fondé → delivered",
      "Suivi retrait final",
      "Commande annulation Mère Fondé",
      "Annulation Mère Fondé sans raison",
      "Annulation Mère Fondé avec raison",
      "Suivi annulation Mère Fondé",
      "Droits livreur",
    ]) skip(name, "identifiants du personnel manquants");
  }

  await customerCancellationFlow();
  await unauthenticatedRights();
  await customerFlow();

  console.log(`\nRésumé : ${results.passed} réussies / ${results.failed} échecs / ${results.skipped} sautées`);
  if (createdOrders > MAX_ORDERS) console.log("ERREUR : la limite de commandes E2E a été dépassée.");
  if (results.failed) {
    console.log(`Premier FAIL : ${firstFailure}`);
    console.log("Un code de sortie non nul est retourné.");
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error("E2E interrompu par une erreur inattendue.");
  process.exitCode = 1;
});
