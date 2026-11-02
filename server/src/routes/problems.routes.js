import { Router } from 'express';
import { many, one } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { notFound } from '../lib/httpError.js';
import { listProblems } from '../services/contentService.js';
import * as v from '../lib/validate.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const problems = await listProblems({
    topic: req.query.topic,
    difficulty: req.query.difficulty,
    limit: Math.min(200, Number(req.query.limit) || 100),
    offset: Number(req.query.offset) || 0,
  });
  res.json({ problems });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'Problem id');
  const problem = await one(`
    SELECT p.*, t.slug AS topic_slug, t.title AS topic_title, b.name AS branch_name
    FROM problems p
    JOIN topics t ON t.id = p.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE p.id = $1 AND p.status = 'approved'
  `, [id]);
  if (!problem) throw notFound('Problem not found');
  res.json({ problem });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const topicSlug = v.str(req.body.topic, 'Topic', { max: 120 });
  const title = v.str(req.body.title, 'Title', { min: 3, max: 200 });
  const statement = v.str(req.body.statement, 'Statement', { min: 10, max: 4000 });
  const hint = v.str(req.body.hint, 'Hint', { required: false, max: 1000 }) || '';
  const solution = v.str(req.body.solution, 'Solution', { required: false, max: 4000 }) || '';
  const difficulty = v.int(req.body.difficulty, 'Difficulty', { required: false, min: 1, max: 5 }) || 3;
  const sourceUrl = req.body.source_url ? v.httpUrl(req.body.source_url, 'Source URL') : '';

  const topic = await one('SELECT id FROM topics WHERE slug = $1', [topicSlug]);
  if (!topic) throw notFound('Topic not found');

  const problem = await one(
    `INSERT INTO problems (topic_id, title, statement, hint, solution, difficulty_level, source_url, submitted_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING id, title, statement, hint, solution, difficulty_level, source_url, status, created_at`,
    [topic.id, title, statement, hint, solution, difficulty, sourceUrl, req.user.id],
  );

  res.status(201).json({ problem, message: 'Thanks! Your problem is pending moderator review.' });
}));

export default router;
