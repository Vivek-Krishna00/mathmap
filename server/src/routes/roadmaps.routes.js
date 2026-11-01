import { Router } from 'express';
import crypto from 'node:crypto';
import { many, one, tx } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { badRequest, notFound, forbidden } from '../lib/httpError.js';
import { generateRoadmap, LEVELS, LENGTHS } from '../services/roadmapEngine.js';
import { loadEngineData } from '../services/contentService.js';
import { ITEM_STATUSES } from '../lib/constants.js';
import * as v from '../lib/validate.js';

const router = Router();

// Generation runs four queries plus the engine, so throttle it separately from
// the global limiter — this endpoint is reachable without authentication.
const generateLimiter = rateLimit({ windowMs: 60_000, max: 40 });

function parseInput(body = {}) {
  return {
    branchIds: v.intArray(body.branchIds, 'Branches', { required: false, max: 6 }) || [],
    level: v.oneOf(body.level, 'Level', LEVELS, { required: false, defaultValue: 'beginner' }),
    goal: v.str(body.goal, 'Goal', { required: false, max: 300 }) || '',
    interestTags: v.strArray(body.interestTags, 'Interests', { max: 30 }),
    length: v.oneOf(body.length, 'Length', LENGTHS, { required: false, defaultValue: 'medium' }),
  };
}

router.post('/preview', generateLimiter, asyncHandler(async (req, res) => {
  const input = parseInput(req.body);
  const data = await loadEngineData();
  const roadmap = generateRoadmap(input, data);
  res.json({ roadmap });
}));

router.post('/', generateLimiter, authenticate, asyncHandler(async (req, res) => {
  const input = parseInput(req.body);
  const data = await loadEngineData();
  const roadmap = generateRoadmap(input, data);
  if (!roadmap.items.length) {
    throw badRequest(roadmap.meta.message || 'No topics matched your selection');
  }
  const title = v.str(req.body.title, 'Title', { required: false, max: 160 }) || roadmap.title;

  const saved = await tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO roadmaps (user_id, title, goal, level, branch_ids, interest_tags, length, is_saved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [req.user.id, title, roadmap.goal, roadmap.level, roadmap.branchIds, roadmap.interestTags, roadmap.length],
    );
    const rm = rows[0];
    for (const item of roadmap.items) {
      await client.query(
        'INSERT INTO roadmap_items (roadmap_id, topic_id, order_index) VALUES ($1, $2, $3)',
        [rm.id, item.topic.id, item.order],
      );
    }
    return rm;
  });

  res.status(201).json({ roadmap: { ...saved, items: roadmap.items, meta: roadmap.meta } });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const roadmaps = await many(`
    SELECT r.*,
      (SELECT count(*) FROM roadmap_items i WHERE i.roadmap_id = r.id)::int AS topic_count,
      (SELECT count(*) FROM roadmap_items i WHERE i.roadmap_id = r.id AND i.status = 'completed')::int AS completed_count
    FROM roadmaps r
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `, [req.user.id]);
  res.json({ roadmaps });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'Roadmap id');
  const roadmap = await one('SELECT * FROM roadmaps WHERE id = $1', [id]);
  if (!roadmap) throw notFound('Roadmap not found');
  if (roadmap.user_id !== req.user.id && !['moderator', 'admin'].includes(req.user.role)) {
    throw forbidden();
  }

  const items = await many(`
    SELECT i.id AS item_id, i.order_index, i.status, i.completed_at,
           t.id, t.slug, t.title, t.summary, t.difficulty_level, t.tags, t.est_minutes,
           b.slug AS branch_slug, b.name AS branch_name, b.color AS branch_color
    FROM roadmap_items i
    JOIN topics t ON t.id = i.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE i.roadmap_id = $1
    ORDER BY i.order_index
  `, [id]);

  const topicIds = items.map((i) => i.id);
  const resourcesByTopic = new Map();
  if (topicIds.length) {
    const rows = await many(`
      SELECT r.id, r.title, r.url, r.type, r.provider, r.description, rt.topic_id, s.net_votes,
             COALESCE((SELECT v.value FROM resource_votes v
                        WHERE v.resource_id = r.id AND v.user_id = $2), 0)::int AS my_vote
      FROM resources r
      JOIN resource_topics rt ON rt.resource_id = r.id
      JOIN v_resource_scores s ON s.resource_id = r.id
      WHERE r.status = 'approved' AND rt.topic_id = ANY($1)
      ORDER BY s.net_votes DESC, r.title
    `, [topicIds, req.user.id]);
    for (const r of rows) {
      if (!resourcesByTopic.has(r.topic_id)) resourcesByTopic.set(r.topic_id, []);
      resourcesByTopic.get(r.topic_id).push(r);
    }
  }

  const completed = items.filter((i) => i.status === 'completed').length;
  res.json({
    // is_owner lets the client hide share/delete/progress controls from
    // moderators and admins who can view a roadmap but not modify it.
    roadmap: { ...roadmap, is_owner: roadmap.user_id === req.user.id },
    items: items.map((i) => ({ ...i, resources: (resourcesByTopic.get(i.id) || []).slice(0, 5) })),
    progress: {
      total: items.length,
      completed,
      percent: items.length ? Math.round((completed / items.length) * 100) : 0,
    },
  });
}));

router.patch('/:id/items/:itemId', authenticate, asyncHandler(async (req, res) => {
  const roadmapId = v.int(req.params.id, 'Roadmap id');
  const itemId = v.int(req.params.itemId, 'Item id');
  const status = v.oneOf(req.body.status, 'Status', ITEM_STATUSES);

  const roadmap = await one('SELECT user_id FROM roadmaps WHERE id = $1', [roadmapId]);
  if (!roadmap) throw notFound('Roadmap not found');
  if (roadmap.user_id !== req.user.id) throw forbidden();

  const updated = await one(
    'UPDATE roadmap_items SET status = $1 WHERE id = $2 AND roadmap_id = $3 RETURNING *',
    [status, itemId, roadmapId],
  );
  if (!updated) throw notFound('Roadmap item not found');
  res.json({ item: updated });
}));

/* ---------------------------------------------------------------- sharing */

/** Mint (or reuse) a share token and make the roadmap publicly readable. */
router.post('/:id/share', authenticate, asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'Roadmap id');
  const roadmap = await one('SELECT user_id, share_token FROM roadmaps WHERE id = $1', [id]);
  if (!roadmap) throw notFound('Roadmap not found');
  if (roadmap.user_id !== req.user.id) throw forbidden();

  const token = roadmap.share_token || crypto.randomBytes(18).toString('base64url');
  const share = await one(
    'UPDATE roadmaps SET share_token = $1, is_public = true WHERE id = $2 RETURNING share_token, is_public',
    [token, id],
  );
  res.json({ share: { shareToken: share.share_token, isPublic: share.is_public } });
}));

/** Revoke: clears the token so a previously shared link stops working. */
router.delete('/:id/share', authenticate, asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'Roadmap id');
  const roadmap = await one('SELECT user_id FROM roadmaps WHERE id = $1', [id]);
  if (!roadmap) throw notFound('Roadmap not found');
  if (roadmap.user_id !== req.user.id) throw forbidden();

  await one('UPDATE roadmaps SET share_token = NULL, is_public = false WHERE id = $1', [id]);
  res.json({ share: { shareToken: null, isPublic: false } });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'Roadmap id');
  const roadmap = await one('SELECT user_id FROM roadmaps WHERE id = $1', [id]);
  if (!roadmap) throw notFound('Roadmap not found');
  if (roadmap.user_id !== req.user.id) throw forbidden();
  await tx((c) => c.query('DELETE FROM roadmaps WHERE id = $1', [id]));
  res.json({ ok: true });
}));

export default router;
