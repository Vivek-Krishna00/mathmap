import { Router } from 'express';
import { many, one, tx } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/httpError.js';
import { RESOURCE_TYPES } from '../lib/constants.js';
import { listResources, getResourceById } from '../services/contentService.js';
import * as v from '../lib/validate.js';

const router = Router();

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const resources = await listResources({
    topic: req.query.topic,
    type: req.query.type,
    status: 'approved',
    viewerId: req.user?.id,
    limit: Math.min(200, Number(req.query.limit) || 100),
    offset: Number(req.query.offset) || 0,
  });
  res.json({ resources });
}));

router.get('/mine', authenticate, asyncHandler(async (req, res) => {
  const resources = await listResources({ submittedBy: req.user.id, status: null });
  res.json({ resources });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const title = v.str(req.body.title, 'Title', { min: 3, max: 200 });
  const url = v.httpUrl(req.body.url, 'URL');
  const type = v.oneOf(req.body.type, 'Type', RESOURCE_TYPES);
  const description = v.str(req.body.description, 'Description', { required: false, max: 1000 }) || '';
  const provider = v.str(req.body.provider, 'Provider', { required: false, max: 120 }) || '';
  const topicSlugs = v.strArray(req.body.topics, 'Topics', { max: 8 });
  if (topicSlugs.length === 0) throw badRequest('Select at least one topic for this resource');

  const topics = await many('SELECT id, slug FROM topics WHERE slug = ANY($1)', [topicSlugs]);
  if (topics.length === 0) throw badRequest('None of the selected topics exist');

  const created = await tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO resources (title, url, type, description, provider, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, title, url, type, description, provider, status, created_at`,
      [title, url, type, description, provider, req.user.id],
    );
    const resource = rows[0];
    for (const t of topics) {
      await client.query('INSERT INTO resource_topics (resource_id, topic_id) VALUES ($1, $2)', [resource.id, t.id]);
    }
    return resource;
  });

  res.status(201).json({
    resource: { ...created, net_votes: 0, vote_count: 0, topic_slugs: topics.map((t) => t.slug) },
    message: 'Thanks! Your resource is pending moderator review.',
  });
}));

router.post('/:id/vote', authenticate, asyncHandler(async (req, res) => {
  const resourceId = v.int(req.params.id, 'Resource id');
  const resource = await getResourceById(resourceId);
  // Only approved resources can be voted on, and not by their own submitter.
  if (!resource || resource.status !== 'approved') throw notFound('Resource not found');
  if (resource.submitted_by === req.user.id) {
    throw badRequest('You cannot vote on a resource you submitted');
  }

  const provided = req.body?.value;
  const value = provided === undefined || provided === null || provided === ''
    ? null
    : v.oneOf(Number(provided), 'value', [-1, 1]);

  const existing = await one(
    'SELECT value FROM resource_votes WHERE user_id = $1 AND resource_id = $2',
    [req.user.id, resourceId],
  );

  let desired;
  if (value === null) {
    desired = !existing ? 1 : existing.value === 1 ? -1 : 0;
  } else {
    desired = existing && existing.value === value ? 0 : value;
  }

  if (desired === 0) {
    await tx((c) => c.query('DELETE FROM resource_votes WHERE user_id = $1 AND resource_id = $2', [req.user.id, resourceId]));
  } else {
    await tx((c) => c.query(
      `INSERT INTO resource_votes (user_id, resource_id, value) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, resource_id) DO UPDATE SET value = EXCLUDED.value`,
      [req.user.id, resourceId, desired],
    ));
  }

  const score = await one('SELECT net_votes, vote_count FROM v_resource_scores WHERE resource_id = $1', [resourceId]);
  res.json({ resourceId, myVote: desired, ...score });
}));

export default router;
