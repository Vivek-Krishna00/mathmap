import { Router } from 'express';
import { many, one, tx } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/httpError.js';
import { USER_ROLES, CONTENT_STATUSES } from '../lib/constants.js';
import * as v from '../lib/validate.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', asyncHandler(async (req, res) => {
  const users = await many(`
    SELECT u.id, u.name, u.email, u.role, u.bio, u.created_at,
           (SELECT count(*) FROM roadmaps r WHERE r.user_id = u.id)::int AS roadmap_count,
           (SELECT count(*) FROM resources x WHERE x.submitted_by = u.id)::int AS resource_count
    FROM users u
    ORDER BY u.created_at
  `);
  res.json({ users });
}));

router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'User id');
  const role = v.oneOf(req.body.role, 'Role', USER_ROLES);
  if (id === req.user.id && role !== 'admin') {
    throw badRequest('You cannot remove your own admin role');
  }
  const user = await one(
    'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
    [role, id],
  );
  if (!user) throw notFound('User not found');
  res.json({ user });
}));

router.get('/content', asyncHandler(async (req, res) => {
  const status = v.oneOf(req.query.status, 'Status', CONTENT_STATUSES, { required: false, defaultValue: 'pending' });
  const [resources, problems] = await Promise.all([
    many(`
      SELECT r.id, r.title, r.url, r.type, r.status, r.created_at, u.name AS submitted_by_name
      FROM resources r LEFT JOIN users u ON u.id = r.submitted_by
      WHERE r.status = $1 ORDER BY r.created_at DESC LIMIT 200
    `, [status]),
    many(`
      SELECT p.id, p.title, p.difficulty_level, p.status, p.created_at, u.name AS submitted_by_name
      FROM problems p LEFT JOIN users u ON u.id = p.submitted_by
      WHERE p.status = $1 ORDER BY p.created_at DESC LIMIT 200
    `, [status]),
  ]);
  res.json({ resources, problems, status });
}));

router.delete('/:type/:id', asyncHandler(async (req, res) => {
  const table = { resource: 'resources', problem: 'problems' }[req.params.type];
  if (!table) throw badRequest('Type must be "resource" or "problem"');
  const id = v.int(req.params.id, 'Id');
  const deleted = await tx(async (client) => {
    const { rows } = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
    return rows[0];
  });
  if (!deleted) throw notFound('Content not found');
  res.json({ ok: true });
}));

export default router;
