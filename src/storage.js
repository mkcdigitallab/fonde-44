const KEYS = {
  cart: "fonde44.cart.v2",
  orders: "fonde44.orders.v2",
  profile: "fonde44.profile.v2",
  theme: "fonde44.theme.v2"
};

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("fonde44:storage"));
}

export const storage = {
  getCart: () => read(KEYS.cart, []),
  setCart: value => write(KEYS.cart, value),
  getOrders: () => read(KEYS.orders, []),
  setOrders: value => write(KEYS.orders, value),
  getProfile: () => read(KEYS.profile, { name: "", phone: "", address: "", theme: "dark" }),
  setProfile: value => write(KEYS.profile, value),
  getTheme: () => localStorage.getItem(KEYS.theme) || "dark",
  setTheme: value => localStorage.setItem(KEYS.theme, value)
};
