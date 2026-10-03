export const PRODUCTS = [
  {
    id: "fonde",
    name: "Fondé",
    unit: "pot",
    price: 200,
    badge: "Le classique",
    subtitle: "Mil traditionnel, préparé du jour",
    description: "Une préparation de mil douce et réconfortante, préparée chaque jour par Mère Fondé.",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85"
  },
  {
    id: "thiakry",
    name: "Thiakry",
    unit: "pot",
    price: 300,
    badge: "Très demandé",
    subtitle: "Mil & lait caillé, frais",
    description: "Un thiakry généreux et frais, idéal le matin, en dessert ou pour une pause gourmande.",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=85"
  },
  {
    id: "poudre",
    name: "Poudre de mil",
    unit: "kg",
    price: 1500,
    badge: "Maison",
    subtitle: "Pour vos préparations maison",
    description: "Poudre de mil préparée avec soin pour vos bouillies et recettes à la maison.",
    image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=85"
  }
];

export const DELIVERY_FEE = 500;
export const MIN_DELIVERY_POTS = 3;
export const MORNING_SUBSCRIPTION = 5000;
export const EVENING_SUBSCRIPTION = 5000;

export const money = value =>
  new Intl.NumberFormat("fr-FR").format(value) + " FCFA";

export function cartCount(cart) {
  return cart.reduce((total, item) => total + item.qty, 0);
}

export function cartSubtotal(cart) {
  return cart.reduce((total, item) => total + item.price * item.qty, 0);
}

export function potCount(cart) {
  return cart.reduce((total, item) => total + (item.unit === "pot" ? item.qty : 0), 0);
}

export function canDeliver(cart) {
  return potCount(cart) >= MIN_DELIVERY_POTS;
}

export function buildOrder(cart, customer, deliveryMode, address, payment) {
  const subtotal = cartSubtotal(cart);
  const delivery = deliveryMode === "delivery" && canDeliver(cart) ? DELIVERY_FEE : 0;
  return {
    id: "FD-" + Math.floor(1000 + Math.random() * 9000),
    createdAt: new Date().toISOString(),
    status: "received",
    customer,
    items: cart.map(({ id, name, price, unit, qty }) => ({ id, name, price, unit, qty })),
    deliveryMode,
    address: address.trim(),
    payment,
    subtotal,
    delivery,
    total: subtotal + delivery
  };
}
