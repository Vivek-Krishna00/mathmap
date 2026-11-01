import { Router } from 'express';
import { one } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { conflict, unauthorized } from '../lib/httpError.js';
import * as v from '../lib/validate.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 60_000, max: 30 });
const registerLimiter = rateLimit({ windowMs: 60_000, max: 10 });

// Verified against when the account does not exist, so a failed login costs the
// same scrypt work either way and cannot be used to enumerate accounts by timing.
const TIMING_DUMMY_HASH = hashPassword('timing-equalisation-placeholder');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    bio: user.bio,
    created_at: user.created_at,
  };
}

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const name = v.str(req.body.name, 'Name', { min: 2, max: 80 });
  const email = v.email(req.body.email);
  const password = v.password(req.body.password);
  const bio = v.str(req.body.bio, 'Bio', { required: false, max: 400 }) || '';

  const existing = await one('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) throw conflict('An account with that email already exists');

  const user = await one(
    `INSERT INTO users (name, email, password_hash, role, bio)
     VALUES ($1, $2, $3, 'learner', $4)
     RETURNING id, name, email, role, bio, created_at`,
    [name, email, hashPassword(password), bio],
  );
  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const email = v.email(req.body.email);
  const password = v.str(req.body.password, 'Password', { trim: false, max: 200 });

  const user = await one('SELECT * FROM users WHERE email = $1', [email]);
  const passwordOk = verifyPassword(password, user?.password_hash || TIMING_DUMMY_HASH);
  if (!user || !passwordOk) {
    throw unauthorized('Incorrect email or password');
  }
  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
