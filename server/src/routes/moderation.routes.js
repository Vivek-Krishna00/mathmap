import { Router } from 'express';
import { many, tx } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/httpError.js';
import * as v from '../lib/validate.js';

const router = Router();

// Every moderation route requires a moderator or admin.
router.use(authenticate, requireRole('moderator', 'admin'));

const ENTITY = {
  resource: { table: 'resources', label: 'Resource' },
  problem: { table: 'problems', label: 'Problem' },
};

function resolveType(type) {
  const cfg = ENTITY[type];
  if (!cfg) throw badRequest('Type must be "resource" or "problem"');
  return cfg;
}

router.get('/queue', asyncHandler(async (req, res) => {
  const [resources, problems] = await Promise.all([
    many(`
      SELECT r.id, r.title, r.url, r.type, r.description, r.provider, r.status, r.created_at,
             u.name AS submitted_by_name,
             COALESCE(array_agg(DISTINCT t.slug) FILTER (WHERE t.slug IS NOT NULL), '{}') AS topic_slugs,
             COALESCE(array_agg(DISTINCT t.title) FILTER (WHERE t.title IS NOT NULL), '{}') AS topic_titles
      FROM resources r
      LEFT JOIN users u ON u.id = r.submitted_by
      LEFT JOIN resource_topics rt ON rt.resource_id = r.id
      LEFT JOIN topics t ON t.id = rt.topic_id
      WHERE r.status = 'pending'
      GROUP BY r.id, u.name
      ORDER BY r.created_at
    `),
    many(`
      SELECT p.id, p.title, p.statement, p.hint, p.solution, p.difficulty_level, p.source_url,
             p.status, p.created_at, u.name AS submitted_by_name,
             t.slug AS topic_slug, t.title AS topic_title
      FROM problems p
      LEFT JOIN users u ON u.id = p.submitted_by
      JOIN topics t ON t.id = p.topic_id
      WHERE p.status = 'pending'
      ORDER BY p.created_at
    `),
  ]);
  res.json({
    resources,
    problems,
    counts: { resources: resources.length, problems: problems.length, total: resources.length + problems.length },
  });
}));

router.get('/log', asyncHandler(async (req, res) => {
  const log = await many(`
    SELECT m.*, u.name AS moderator_name
    FROM moderation_log m
    LEFT JOIN users u ON u.id = m.moderator_id
    ORDER BY m.created_at DESC
    LIMIT 100
  `);
  res.json({ log });
}));

async function moderate(req, res, action) {
  const cfg = resolveType(req.params.type);
  const id = v.int(req.params.id, 'Id');
  const reason = v.str(req.body?.reason, 'Reason', { required: false, max: 500 }) || '';
  const status = action === 'approve' ? 'approved' : 'rejected';

  const item = await tx(async (client) => {
    const { rows } = await client.query(
      `UPDATE ${cfg.table} SET status = $1 WHERE id = $2 RETURNING id, title, status`,
      [status, id],
    );
    if (rows.length === 0) throw notFound(`${cfg.label} not found`);
    await client.query(
      `INSERT INTO moderation_log (entity_type, entity_id, action, moderator_id, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.type, id, action, req.user.id, reason],
    );
    return rows[0];
  });

  res.json({ ok: true, item });
}

router.post('/:type/:id/approve', asyncHandler((req, res) => moderate(req, res, 'approve')));
router.post('/:type/:id/reject', asyncHandler((req, res) => moderate(req, res, 'reject')));

export default router;
