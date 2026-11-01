import { Router } from 'express';
import { many } from '../db/pool.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { badRequest } from '../lib/httpError.js';
import { scorePlacement, difficultyBand } from '../services/placement.js';
import * as v from '../lib/validate.js';

const router = Router();

const scoreLimiter = rateLimit({ windowMs: 60_000, max: 40 });
const PER_BRANCH = 4;

/** The questions themselves — never includes `correct_index`. */
router.get('/questions', asyncHandler(async (req, res) => {
  const slugs = req.query.branches
    ? String(req.query.branches).split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  const rows = await many(`
    SELECT q.id, q.prompt, q.options, q.difficulty_level,
           b.id AS branch_id, b.slug AS branch_slug, b.name AS branch_name
    FROM placement_questions q
    JOIN branches b ON b.id = q.branch_id
    WHERE ($1::text[] IS NULL OR b.slug = ANY($1))
    ORDER BY b.sort_order, q.difficulty_level, q.id
  `, [slugs]);

  // Cap the check at a handful per branch so it stays a quick self-assessment.
  const counted = new Map();
  const questions = [];
  for (const row of rows) {
    const seen = counted.get(row.branch_slug) || 0;
    if (seen >= PER_BRANCH) continue;
    counted.set(row.branch_slug, seen + 1);
    questions.push(row);
  }

  res.json({ questions, perBranch: PER_BRANCH, branchCount: counted.size });
}));

router.post('/score', scoreLimiter, asyncHandler(async (req, res) => {
  const raw = req.body?.answers;
  if (!Array.isArray(raw)) throw badRequest('answers must be an array');
  if (raw.length === 0) throw badRequest('Answer at least one question');
  if (raw.length > 60) throw badRequest('Too many answers');

  const answers = raw
    .map((a, i) => ({
      questionId: v.int(a?.questionId, `answers[${i}].questionId`, { min: 1 }),
      choiceIndex: v.int(a?.choiceIndex, `answers[${i}].choiceIndex`, { required: false, min: 0, max: 3 }),
    }))
    .filter((a) => a.choiceIndex !== undefined);

  if (answers.length === 0) throw badRequest('Answer at least one question');

  const ids = [...new Set(answers.map((a) => a.questionId))];
  const questions = await many(`
    SELECT q.id, q.branch_id, q.correct_index,
           b.slug AS branch_slug, b.name AS branch_name
    FROM placement_questions q
    JOIN branches b ON b.id = q.branch_id
    WHERE q.id = ANY($1)
  `, [ids]);

  const result = scorePlacement(questions, answers);

  const [low, high] = difficultyBand(result.advisedLevel);
  const tags = result.suggestedBranchIds.length
    ? await many(`
        SELECT tag, count(*)::int AS n
        FROM topics t, unnest(t.tags) AS tag
        WHERE t.branch_id = ANY($1) AND t.difficulty_level BETWEEN $2 AND $3
        GROUP BY tag
        ORDER BY count(*) DESC, tag
        LIMIT 12
      `, [result.suggestedBranchIds, low, high])
    : [];

  res.json({ result: { ...result, suggestedTags: tags.map((t) => t.tag) } });
}));

export default router;
