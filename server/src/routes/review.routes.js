import { Router } from 'express';
import { many, one } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { notFound } from '../lib/httpError.js';
import * as v from '../lib/validate.js';

const router = Router();
router.use(authenticate);

// Simple spaced repetition: the gap grows with each review — 3, 7, 16, then 35 days.
const INTERVAL = '(CASE review_count WHEN 0 THEN 3 WHEN 1 THEN 7 WHEN 2 THEN 16 ELSE 35 END)';

/** Completed topics that are due to be revisited. */
router.get('/', asyncHandler(async (req, res) => {
  const due = await many(`
    SELECT i.id AS item_id, i.roadmap_id, i.completed_at, i.last_reviewed_at, i.review_count,
           t.id AS topic_id, t.slug, t.title, t.summary, t.difficulty_level,
           b.name AS branch_name, b.color AS branch_color,
           ${INTERVAL} AS interval_days
    FROM roadmap_items i
    JOIN roadmaps r ON r.id = i.roadmap_id
    JOIN topics t ON t.id = i.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE r.user_id = $1
      AND i.status = 'completed'
      AND (i.last_reviewed_at IS NULL
           OR i.last_reviewed_at <= now() - (INTERVAL '1 day' * ${INTERVAL}))
    ORDER BY i.last_reviewed_at NULLS FIRST, t.difficulty_level
    LIMIT 50
  `, [req.user.id]);

  res.json({ due, count: due.length });
}));

router.post('/:itemId', asyncHandler(async (req, res) => {
  const itemId = v.int(req.params.itemId, 'Item id');
  const updated = await one(`
    UPDATE roadmap_items i
       SET last_reviewed_at = now(), review_count = i.review_count + 1
      FROM roadmaps r
     WHERE i.id = $2 AND r.id = i.roadmap_id AND r.user_id = $1
    RETURNING i.id, i.last_reviewed_at, i.review_count
  `, [req.user.id, itemId]);
  if (!updated) throw notFound('Roadmap item not found');
  res.json({ item: updated });
}));

export default router;
