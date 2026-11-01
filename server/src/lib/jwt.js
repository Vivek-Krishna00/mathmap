import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Minimal dependency-free JWT implementation (HS256).
 * Only the features MathMap needs: sign + verify, exp/iat claims.
 */

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function hmac(data) {
  return crypto.createHmac('sha256', config.jwtSecret).update(data).digest();
}

/** Parse an expiry like "7d", "12h", "30m", "45s" or a raw number of seconds. */
export function parseDuration(value) {
  if (typeof value === 'number') return value;
  const match = /^(\d+)\s*([smhd])?$/.exec(String(value).trim());
  if (!match) return 7 * 24 * 60 * 60;
  const n = Number(match[1]);
  const unit = match[2] || 's';
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return n * factor;
}

export function signToken(payload, expiresIn = config.jwtExpiresIn) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp: now + parseDuration(expiresIn) };
  const segments = [
    b64url(JSON.stringify(header)),
    b64url(JSON.stringify(body)),
  ];
  const signature = hmac(segments.join('.'));
  return `${segments.join('.')}.${b64url(signature)}`;
}

export function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [header, payload, signature] = parts;
  const expected = b64url(hmac(`${header}.${payload}`));
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid token signature');
  }
  const claims = JSON.parse(b64urlDecode(payload).toString('utf8'));
  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return claims;
}
