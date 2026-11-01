import { Router } from 'express';
import { many } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { unlockedTopics } from '../services/nextSteps.js';
import { buildLearningPath } from '../services/learningPath.js';

const router = Router();
router.use(authenticate);

/** Topics the learner is ready for: every prerequisite already completed. */
router.get('/next', asyncHandler(async (req, res) => {
  const [edges, topics, completed] = await Promise.all([
    many('SELECT topic_id, prerequisite_topic_id FROM topic_prerequisites'),
    many(`
      SELECT t.id, t.slug, t.title, t.summary, t.difficulty_level,
             b.name AS branch_name, b.color AS branch_color,
             c.resource_count
      FROM topics t
      JOIN branches b ON b.id = t.branch_id
      JOIN v_topic_resource_counts c ON c.topic_id = t.id
    `),
    many(`
      SELECT DISTINCT i.topic_id
      FROM roadmap_items i
      JOIN roadmaps r ON r.id = i.roadmap_id
      WHERE r.user_id = $1 AND i.status = 'completed'
    `, [req.user.id]),
  ]);

  const completedIds = completed.map((row) => row.topic_id);
  const unlocked = unlockedTopics({
    completedIds,
    prereqEdges: edges,
    allTopicIds: topics.map((t) => t.id),
  });

  const byId = new Map(topics.map((t) => [t.id, t]));
  const next = unlocked
    .map((id) => byId.get(id))
    .filter(Boolean)
    .sort((a, b) => a.difficulty_level - b.difficulty_level || a.title.localeCompare(b.title))
    .slice(0, 5);

  res.json({ completedCount: completedIds.length, next });
}));

/**
 * The learner's actual path across every roadmap: per-topic state, the order they
 * completed things in, and where they jumped ahead of a prerequisite.
 */
router.get('/graph', asyncHandler(async (req, res) => {
  const [items, edges] = await Promise.all([
    many(`
      SELECT i.topic_id, i.status, i.completed_at, i.last_reviewed_at, i.review_count
      FROM roadmap_items i
      JOIN roadmaps r ON r.id = i.roadmap_id
      WHERE r.user_id = $1
    `, [req.user.id]),
    many('SELECT topic_id, prerequisite_topic_id FROM topic_prerequisites'),
  ]);

  res.json(buildLearningPath(items, edges));
}));

/** Per-branch mastery, plus overall totals. */
router.get('/analytics', asyncHandler(async (req, res) => {
  const branches = await many(`
    SELECT b.id, b.slug, b.name, b.color,
           (SELECT count(*) FROM topics t WHERE t.branch_id = b.id)::int AS total,
           (SELECT count(DISTINCT i.topic_id)
              FROM roadmap_items i
              JOIN roadmaps r ON r.id = i.roadmap_id
              JOIN topics t2 ON t2.id = i.topic_id
             WHERE r.user_id = $1 AND i.status = 'completed' AND t2.branch_id = b.id)::int AS completed
    FROM branches b
    ORDER BY b.sort_order
  `, [req.user.id]);

  const withPercent = branches.map((b) => ({
    ...b,
    percent: b.total ? Math.round((b.completed / b.total) * 100) : 0,
  }));

  res.json({
    branches: withPercent,
    total: {
      topics: withPercent.reduce((acc, b) => acc + b.total, 0),
      completed: withPercent.reduce((acc, b) => acc + b.completed, 0),
    },
  });
}));

export default router;
