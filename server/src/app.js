import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { securityHeaders, webSecurityHeaders } from './middleware/securityHeaders.js';
import { rateLimit } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.routes.js';
import branchRoutes from './routes/branches.routes.js';
import trackRoutes from './routes/tracks.routes.js';
import topicRoutes from './routes/topics.routes.js';
import graphRoutes from './routes/graph.routes.js';
import resourceRoutes from './routes/resources.routes.js';
import problemRoutes from './routes/problems.routes.js';
import roadmapRoutes from './routes/roadmaps.routes.js';
import sharedRoutes from './routes/shared.routes.js';
import placementRoutes from './routes/placement.routes.js';
import notesRoutes from './routes/notes.routes.js';
import reviewRoutes from './routes/review.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import goalsRoutes from './routes/goals.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import adminRoutes from './routes/admin.routes.js';
import statsRoutes from './routes/stats.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Only trust proxy headers when explicitly configured, otherwise a client could
  // spoof X-Forwarded-For and slip out of the rate-limit bucket.
  if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);

  app.use(cors({ origin: config.clientOrigins }));
  app.use('/api', securityHeaders);
  app.use(webSecurityHeaders);

  // Global backstop against unauthenticated abuse of expensive endpoints.
  app.use('/api', rateLimit({ windowMs: 60_000, max: 600 }));

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', async (req, res) => {
    let db = 'down';
    try {
      await pool.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    res.json({ status: 'ok', db, env: config.env, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/branches', branchRoutes);
  app.use('/api/tracks', trackRoutes);
  app.use('/api/topics', topicRoutes);
  app.use('/api/graph', graphRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/problems', problemRoutes);
  app.use('/api/roadmaps', roadmapRoutes);
  app.use('/api/shared', sharedRoutes);
  app.use('/api/placement', placementRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/review', reviewRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/stats', statsRoutes);

  // Serve the built client when it is present, so a single container can host the
  // whole app. Absent in development, where Vite serves the client and proxies
  // /api to this server.
  const clientDist = path.join(config.rootDir, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    // Vite fingerprints asset filenames, so they are safe to cache indefinitely.
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    // Client-side routes fall back to the SPA shell; /api keeps its JSON 404.
    app.get(/^\/(?!api(\/|$)).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
