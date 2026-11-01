import crypto from 'node:crypto';

/**
 * Password hashing with Node's built-in scrypt (no external bcrypt dependency).
 * Format: scrypt$N$r$p$saltBase64$hashBase64
 */

const KEYLEN = 64;
const N = 16384;
const R = 8;
const P = 1;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), derived.toString('base64')].join('$');
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
