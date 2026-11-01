import { badRequest } from './httpError.js';

/** Small hand-rolled validators that throw HttpError(400) on failure. */

export function str(value, name, opts = {}) {
  const { required = true, min = 0, max = 5000, trim = true } = opts;
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${name} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw badRequest(`${name} must be text`);
  const v = trim ? value.trim() : value;
  if (v.length < min) throw badRequest(`${name} must be at least ${min} characters`);
  if (v.length > max) throw badRequest(`${name} must be at most ${max} characters`);
  return v;
}

export function email(value) {
  const v = str(value, 'Email', { min: 3, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw badRequest('Enter a valid email address');
  return v;
}

export function password(value) {
  const v = str(value, 'Password', { min: 8, max: 200, trim: false });
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) {
    throw badRequest('Password must contain at least one letter and one number');
  }
  return v;
}

export function int(value, name, opts = {}) {
  // Default ceiling is the Postgres integer range, so an oversized path id is a
  // clean 400 instead of a driver-level overflow error.
  const { required = true, min = -Infinity, max = 2147483647 } = opts;
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${name} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`${name} must be a whole number`);
  if (n < min) throw badRequest(`${name} must be at least ${min}`);
  if (n > max) throw badRequest(`${name} must be at most ${max}`);
  return n;
}

export function bool(value, name, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  throw badRequest(`${name} must be a boolean`);
}

export function oneOf(value, name, allowed, opts = {}) {
  const { required = true, defaultValue } = opts;
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${name} is required`);
    return defaultValue;
  }
  if (!allowed.includes(value)) {
    throw badRequest(`${name} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

export function intArray(value, name, opts = {}) {
  const { required = true, min = 0, max = 100 } = opts;
  if (value === undefined || value === null) {
    if (required) throw badRequest(`${name} is required`);
    return undefined;
  }
  if (!Array.isArray(value)) throw badRequest(`${name} must be an array`);
  if (value.length < min) throw badRequest(`${name} must contain at least ${min} item(s)`);
  if (value.length > max) throw badRequest(`${name} must contain at most ${max} items`);
  return value.map((v, i) => int(v, `${name}[${i}]`, { min: 1 }));
}

export function strArray(value, name, opts = {}) {
  const { required = false, max = 40, itemMax = 60 } = opts;
  if (value === undefined || value === null) {
    if (required) throw badRequest(`${name} is required`);
    return [];
  }
  if (!Array.isArray(value)) throw badRequest(`${name} must be an array`);
  if (value.length > max) throw badRequest(`${name} must contain at most ${max} items`);
  return value
    .map((v, i) => str(v, `${name}[${i}]`, { max: itemMax }))
    .filter((v) => v !== undefined);
}

export function httpUrl(value, name) {
  const v = str(value, name, { max: 2000 });
  let parsed;
  try {
    parsed = new URL(v);
  } catch {
    throw badRequest(`${name} must be a valid URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw badRequest(`${name} must start with http:// or https://`);
  }
  return v;
}
