import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './passwords.js';

test('hashPassword produit un format scrypt et verifyPassword valide le secret', async () => {
  const encoded = await hashPassword('MotDePasseTresSolide123!');
  assert.match(encoded, /^scrypt\$\d+\$\d+\$\d+\$[^$]+\$[^$]+$/);
  assert.equal(await verifyPassword('MotDePasseTresSolide123!', encoded), true);
  assert.equal(await verifyPassword('mauvais-secret', encoded), false);
  assert.equal(encoded.includes('MotDePasseTresSolide123!'), false);
});