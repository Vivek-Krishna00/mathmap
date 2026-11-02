import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/ and repository root
export const serverDir = path.resolve(__dirname, '..');
export const rootDir = path.resolve(serverDir, '..');

// Load env from the repository root first, then allow a server-local override.
// `.env.local` is included because `neon deploy` writes there when no `.env` is
// present, and it is conventionally the highest-precedence file (as in Vite).
for (const envPath of [
  path.join(rootDir, '.env'),
  path.join(serverDir, '.env'),
  path.join(rootDir, '.env.local'),
  path.join(serverDir, '.env.local'),
]) {
  if (!fs.existsSync(envPath)) continue;
  dotenv.config({ path: envPath, override: envPath.endsWith('.env.local') });
}

function list(value, fallback) {
  const raw = value && value.trim() ? value : fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * How many proxy hops to trust for `req.ip`. Must be set when the API runs behind
 * nginx / a PaaS load balancer, otherwise every client shares one rate-limit bucket.
 * Leave unset when the API is directly exposed, so X-Forwarded-For cannot be spoofed.
 */
function trustProxyValue() {
  const raw = process.env.TRUST_PROXY;
  if (!raw || raw === 'false') return false;
  if (raw === 'true') return 1;
  const hops = Number(raw);
  return Number.isFinite(hops) ? hops : false;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/mathmap',
  jwtSecret: process.env.JWT_SECRET || 'mathmap-dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: list(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),
  trustProxy: trustProxyValue(),
  rootDir,
  serverDir,
};

export const isProd = config.env === 'production';
