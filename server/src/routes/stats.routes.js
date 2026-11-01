import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getCommunityStats } from '../services/contentService.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await getCommunityStats());
}));

export default router;
