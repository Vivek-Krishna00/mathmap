import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/httpError.js';
import { listBranches, getBranchBySlug } from '../services/contentService.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json({ branches: await listBranches() });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const branch = await getBranchBySlug(req.params.slug);
  if (!branch) throw notFound('Branch not found');
  res.json({ branch });
}));

export default router;
