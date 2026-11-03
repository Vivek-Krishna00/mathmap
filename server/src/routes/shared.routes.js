import { Router } from 'express';
import { many, one } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/httpError.js';
import * as v from '../lib/validate.js';

const router = Router();

/** Public gallery of roadmaps their owners have chosen to share. */
router.get('/', asyncHandler(async (req, res) => {
  const roadmaps = await many(`
    SELECT r.share_token, r.title, r.goal, r.level, r.created_at,
           u.name AS owner_name,
           (SELECT count(*) FROM roadmap_items i WHERE i.roadmap_id = r.id)::int AS topic_count
    FROM roadmaps r
    JOIN users u ON u.id = r.user_id
    WHERE r.is_public = true AND r.share_token IS NOT NULL
    ORDER BY r.created_at DESC
    LIMIT 60
  `);
  res.json({ roadmaps });
}));

/**
 * Public read-only view of a shared roadmap. No authentication: the token is the
 * capability. Revoked (is_public = false) roadmaps are indistinguishable from
 * non-existent ones.
 */
router.get('/:token', asyncHandler(async (req, res) => {
  const token = v.str(req.params.token, 'Share token', { max: 64 });

  const roadmap = await one(`
    SELECT r.id, r.title, r.goal, r.level, r.length, r.created_at,
           u.name AS owner_name
    FROM roadmaps r
    JOIN users u ON u.id = r.user_id
    WHERE r.share_token = $1 AND r.is_public = true
  `, [token]);
  if (!roadmap) throw notFound('This shared roadmap is not available');

  const items = await many(`
    SELECT i.id AS item_id, i.order_index, i.status,
           t.id, t.slug, t.title, t.summary, t.difficulty_level, t.tags, t.est_minutes,
           b.slug AS branch_slug, b.name AS branch_name, b.color AS branch_color
    FROM roadmap_items i
    JOIN topics t ON t.id = i.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE i.roadmap_id = $1
    ORDER BY i.order_index
  `, [roadmap.id]);

  const topicIds = items.map((i) => i.id);
  const byTopic = new Map();
  if (topicIds.length) {
    const rows = await many(`
      SELECT r.id, r.title, r.url, r.type, r.provider, r.description, rt.topic_id, s.net_votes
      FROM resources r
      JOIN resource_topics rt ON rt.resource_id = r.id
      JOIN v_resource_scores s ON s.resource_id = r.id
      WHERE r.status = 'approved' AND rt.topic_id = ANY($1)
      ORDER BY s.net_votes DESC, r.title
    `, [topicIds]);
    for (const row of rows) {
      if (!byTopic.has(row.topic_id)) byTopic.set(row.topic_id, []);
      byTopic.get(row.topic_id).push(row);
    }
  }

  const completed = items.filter((i) => i.status === 'completed').length;

  res.json({
    roadmap,
    items: items.map((i) => ({ ...i, resources: (byTopic.get(i.id) || []).slice(0, 5) })),
    progress: {
      total: items.length,
      completed,
      percent: items.length ? Math.round((completed / items.length) * 100) : 0,
    },
  });
}));

export default router;
