import { HttpError } from '../lib/httpError.js';

/**
 * Tiny in-memory fixed-window rate limiter, used to protect auth endpoints.
 * Not shared across processes - adequate for a single-node deployment.
 */
export function rateLimit({ windowMs = 60_000, max = 30, key } = {}) {
  const hits = new Map();

  // Periodically drop stale buckets so the map cannot grow unbounded.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, bucket] of hits) {
      if (bucket.resetAt <= now) hits.delete(k);
    }
  }, windowMs);
  timer.unref?.();

  return (req, res, next) => {
    const id = key ? key(req) : req.ip;
    const now = Date.now();
    let bucket = hits.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(id, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return next(new HttpError(429, 'Too many requests - please slow down and try again shortly.'));
    }
    next();
  };
}
