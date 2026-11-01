import { isProd } from '../config.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, req, res, next) {
  const status = Number(err.status) || 500;

  if (status >= 500) {
    // Log the real cause server-side; never hand upstream internals to the client.
    console.error('[error]', err);
  }

  const body = status >= 500
    ? { error: 'Something went wrong on our end.' }
    : { error: err.message || 'Request failed' };

  if (status < 500 && err.details !== undefined) body.details = err.details;
  if (!isProd && status >= 500) body.stack = err.stack;

  res.status(status).json(body);
}
