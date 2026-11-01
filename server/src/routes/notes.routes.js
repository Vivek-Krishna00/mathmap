import { Router } from 'express';
import { many, one } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/httpError.js';
import * as v from '../lib/validate.js';

const router = Router();
router.use(authenticate);

async function topicIdFor(slug) {
  const row = await one('SELECT id FROM topics WHERE slug = $1', [slug]);
  if (!row) throw notFound('Topic not found');
  return row.id;
}

/** Everything the learner has noted or bookmarked, newest first. */
router.get('/', asyncHandler(async (req, res) => {
  const notes = await many(`
    SELECT n.id, n.body, n.bookmarked, n.updated_at,
           t.slug, t.title, t.difficulty_level,
           b.name AS branch_name, b.color AS branch_color
    FROM topic_notes n
    JOIN topics t ON t.id = n.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE n.user_id = $1 AND (n.bookmarked OR n.body <> '')
    ORDER BY n.updated_at DESC
    LIMIT 100
  `, [req.user.id]);
  res.json({ notes });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const topicId = await topicIdFor(req.params.slug);
  const note = await one(
    'SELECT id, body, bookmarked, updated_at FROM topic_notes WHERE user_id = $1 AND topic_id = $2',
    [req.user.id, topicId],
  );
  res.json({ note: note || { body: '', bookmarked: false, updated_at: null } });
}));

/** Partial upsert: send `body`, `bookmarked`, or both. */
router.put('/:slug', asyncHandler(async (req, res) => {
  const topicId = await topicIdFor(req.params.slug);
  const body = v.str(req.body?.body, 'Note', { required: false, max: 4000 });
  const bookmarked = req.body?.bookmarked === undefined
    ? undefined
    : v.bool(req.body.bookmarked, 'Bookmarked');

  if (body === undefined && bookmarked === undefined) {
    throw badRequest('Provide a note body or a bookmarked flag');
  }

  const note = await one(`
    INSERT INTO topic_notes (user_id, topic_id, body, bookmarked)
    VALUES ($1, $2, COALESCE($3, ''), COALESCE($4, false))
    ON CONFLICT (user_id, topic_id) DO UPDATE
       SET body = COALESCE($3, topic_notes.body),
           bookmarked = COALESCE($4, topic_notes.bookmarked),
           updated_at = now()
    RETURNING id, body, bookmarked, updated_at
  `, [req.user.id, topicId, body ?? null, bookmarked ?? null]);

  res.json({ note });
}));

router.delete('/:slug', asyncHandler(async (req, res) => {
  const topicId = await topicIdFor(req.params.slug);
  await one(
    'DELETE FROM topic_notes WHERE user_id = $1 AND topic_id = $2 RETURNING id',
    [req.user.id, topicId],
  );
  res.json({ ok: true });
}));

export default router;
