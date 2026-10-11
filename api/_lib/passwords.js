import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAXMEM = 32 * 1024 * 1024;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algorithm, n, r, p, salt64, hash64] = String(stored || "").split("$");
    if (algorithm !== "scrypt") return false;
    const salt = Buffer.from(salt64, "base64");
    const expected = Buffer.from(hash64, "base64");
    const actual = scryptSync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
