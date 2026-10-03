export const DELIVERY_FEE = 500;
export const MIN_DELIVERY_POTS = 3;
export const MORNING_SUBSCRIPTION = 5000;
export const EVENING_SUBSCRIPTION = 5000;

export const money = value =>
  new Intl.NumberFormat("fr-FR").format(Number(value) || 0) + " FCFA";

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
