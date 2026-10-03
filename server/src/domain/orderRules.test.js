import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeTotals,
  countPots,
  validateDelivery,
} from './orderRules.js';

test('refuse la livraison avec 2 pots', () => {
  assert.equal(countPots([{ unit: 'pot', quantity: 2 }]), 2);
  assert.throws(
    () => validateDelivery('delivery', 2),
    /livraison nécessite au moins 3 pots/i,
  );
});

test('accepte la livraison avec 3 pots', () => {
  assert.equal(countPots([{ unit: 'pot', quantity: 3 }]), 3);
  assert.doesNotThrow(() => validateDelivery('delivery', 3));
});

test('accepte le retrait avec 1 pot', () => {
  assert.equal(countPots([{ unit: 'pot', quantity: 1 }]), 1);
  assert.doesNotThrow(() => validateDelivery('pickup', 1));
});

test('calcule correctement les totaux', () => {
  const items = [
    { unit: 'pot', quantity: 2, price_fcfa: 200 },
    { unit: 'pot', quantity: 1, price_fcfa: 300 },
  ];

  assert.deepEqual(computeTotals(items, 'delivery', 500), {
    subtotal: 700,
    delivery_fee: 500,
    total: 1200,
  });

  assert.deepEqual(computeTotals(items, 'pickup', 500), {
    subtotal: 700,
    delivery_fee: 0,
    total: 700,
  });
});
