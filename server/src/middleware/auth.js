import { verifyToken } from '../lib/jwt.js';
import { one } from '../db/pool.js';
import { unauthorized, forbidden } from '../lib/httpError.js';

const PUBLIC_FIELDS = 'id, name, email, role, bio, created_at';

/** Require a valid Bearer token; attaches `req.user`. */
export async function authenticate(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();
    let claims;
    try {
      claims = verifyToken(token);
    } catch (err) {
      throw unauthorized(err.message || 'Invalid token');
    }
    const user = await one(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [claims.sub]);
    if (!user) throw unauthorized('This account no longer exists');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attach `req.user` when a valid token is present, but never reject. */
export async function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next();
  try {
    const claims = verifyToken(token);
    const user = await one(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [claims.sub]);
    if (user) req.user = user;
  } catch {
    /* ignore invalid token on optional routes */
  }
  next();
}

/** Gate a route to one or more roles. Use after `authenticate`. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
