export function countPots(items) {
  return items
    .filter((item) => item.unit === 'pot')
    .reduce((total, item) => total + item.quantity, 0);
}

export function validateDelivery(mode, potCount) {
  if (mode === 'delivery' && potCount < 3) {
    throw new Error('La livraison nécessite au moins 3 pots.');
  }
}

export function computeTotals(items, mode, deliveryFee) {
  const subtotal = items.reduce(
    (total, item) => total + item.price_fcfa * item.quantity,
    0,
  );
  const delivery_fee = mode === 'delivery' ? deliveryFee : 0;

  return {
    subtotal,
    delivery_fee,
    total: subtotal + delivery_fee,
  };
}
