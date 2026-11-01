import { Router } from 'express';
import { many, one } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { notFound } from '../lib/httpError.js';
import { listTopics, countTopics, getTopicDetail, listAllTopicTags } from '../services/contentService.js';

const router = Router();

// NOTE: '/tags' must be declared before '/:slug'.
router.get('/tags', asyncHandler(async (req, res) => {
  res.json({ tags: await listAllTopicTags(80) });
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 60));
  const filters = {
    branch: req.query.branch,
    search: req.query.search,
    tag: req.query.tag,
    difficulty: req.query.difficulty,
  };
  const [topics, total] = await Promise.all([
    listTopics({ ...filters, limit, offset: (page - 1) * limit }),
    countTopics(filters),
  ]);
  res.json({ topics, total, page, limit });
}));

router.get('/:slug', optionalAuth, asyncHandler(async (req, res) => {
  const topic = await getTopicDetail(req.params.slug, req.user?.id);
  if (!topic) throw notFound('Topic not found');
  res.json({ topic });
}));

router.get('/:slug/neighborhood', asyncHandler(async (req, res) => {
  const topic = await one('SELECT id FROM topics WHERE slug = $1', [req.params.slug]);
  if (!topic) throw notFound('Topic not found');

  const ids = [topic.id];
  const prereqs = await many('SELECT prerequisite_topic_id AS id FROM topic_prerequisites WHERE topic_id = $1', [topic.id]);
  const dependents = await many('SELECT topic_id AS id FROM topic_prerequisites WHERE prerequisite_topic_id = $1', [topic.id]);
  for (const r of [...prereqs, ...dependents]) if (!ids.includes(r.id)) ids.push(r.id);

  const nodes = await many(`
    SELECT t.id, t.slug, t.title, t.difficulty_level, t.tags,
           b.slug AS branch_slug, b.name AS branch_name, b.color AS branch_color
    FROM topics t JOIN branches b ON b.id = t.branch_id
    WHERE t.id = ANY($1)
  `, [ids]);
  const edges = await many(`
    SELECT topic_id, prerequisite_topic_id
    FROM topic_prerequisites
    WHERE topic_id = ANY($1) AND prerequisite_topic_id = ANY($1)
  `, [ids]);

  res.json({ nodes, edges, center: topic.id });
}));

export default router;
