const jsonHeaders = { "Content-Type": "application/json" };

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...jsonHeaders, ...(options.headers || {}) },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error || "request_failed");
    error.status = response.status;
    error.details = payload?.details;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function getProducts() {
  const payload = await request("/api/products");
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function createOrder(order) {
  return request("/api/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function createEventRequest(event) {
  return request("/api/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}
