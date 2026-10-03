import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

function scryptAsync(password, salt, length = KEYLEN, options = {}) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024, ...options }, (error, derivedKey) => {
      if (error) reject(error); else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, saltBase64, hashBase64] = encoded.split('$');
    if (algorithm !== 'scrypt' || !n || !r || !p || !saltBase64 || !hashBase64) return false;
    const salt = Buffer.from(saltBase64, 'base64');
    const expected = Buffer.from(hashBase64, 'base64');
    const actual = await scryptAsync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export const PASSWORD_SCRYPT_PARAMS = Object.freeze({ N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });