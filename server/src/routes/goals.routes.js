import { Router } from 'express';
import { many } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { computeGoalGraph } from '../services/goals.js';

const router = Router();

/**
 * Public: how the selected branches (goals) connect, and which concepts are shared
 * foundations between them. Query `branches` is a comma-separated list of slugs.
 */
router.get('/', asyncHandler(async (req, res) => {
  const slugs = req.query.branches
    ? String(req.query.branches).split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  const [branches, topics, edges] = await Promise.all([
    many('SELECT id, slug, name, color FROM branches ORDER BY sort_order'),
    many('SELECT id, slug, title, difficulty_level, branch_id FROM topics'),
    many('SELECT topic_id, prerequisite_topic_id FROM topic_prerequisites'),
  ]);

  res.json(computeGoalGraph({ branches, topics, edges, selectedSlugs: slugs }));
}));

export default router;
