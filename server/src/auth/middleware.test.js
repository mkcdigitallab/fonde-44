import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth, requireRole } from './middleware.js';

test('requireAuth refuse une requête sans utilisateur', () => {
  let error; requireAuth({}, {}, value => { error = value; });
  assert.equal(error.status, 401);
});

test('requireRole refuse un rôle incorrect', () => {
  let error; requireRole('mere-fonde')({ user: { role: 'client' } }, {}, value => { error = value; });
  assert.equal(error.status, 403);
});

test('requireRole accepte le rôle autorisé', () => {
  let called = false; requireRole('mere-fonde')({ user: { role: 'mere-fonde' } }, {}, () => { called = true; });
  assert.equal(called, true);
});