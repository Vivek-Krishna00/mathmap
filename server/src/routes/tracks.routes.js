import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { listTracks } from '../services/contentService.js';

const router = Router();

/** Applied goals: each maps a real-world destination onto the maths graph. */
router.get('/', asyncHandler(async (req, res) => {
  res.json({ tracks: await listTracks() });
}));

export default router;
