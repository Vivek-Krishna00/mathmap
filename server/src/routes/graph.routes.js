import { Router } from 'express';
import { many } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getFullGraph } from '../services/contentService.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  let branchIds;
  if (req.query.branches) {
    const slugs = String(req.query.branches).split(',').map((s) => s.trim()).filter(Boolean);
    if (slugs.length) {
      const rows = await many('SELECT id FROM branches WHERE slug = ANY($1)', [slugs]);
      branchIds = rows.map((r) => r.id);
    }
  }
  const graph = await getFullGraph({ branchIds });
  res.json(graph);
}));

export default router;
