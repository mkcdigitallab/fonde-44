const KEY = "fonde44-orders";
const MAX = 5;

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(item => item && typeof item.id === "string" && typeof item.token === "string")
      : [];
  } catch {
    return [];
  }
}

function write(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value.slice(0, MAX)));
  } catch {}
}

export function getTrackedOrders() {
  return read();
}

export function rememberTrackedOrder({ id, token, createdAt = new Date().toISOString() }) {
  if (!id || !token) return;
  write([
    { id, token, createdAt },
    ...read().filter(item => item.id !== id),
  ].slice(0, MAX));
}

export function removeTrackedOrder(id) {
  write(read().filter(item => item.id !== id));
}
