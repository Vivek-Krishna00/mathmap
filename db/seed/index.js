import { pool } from '../../server/src/db/pool.js';
import { config } from '../../server/src/config.js';
import { hashPassword } from '../../server/src/lib/password.js';
import { buildPrereqMap, detectCycle } from '../../server/src/services/graph.js';
import { generateRoadmap } from '../../server/src/services/roadmapEngine.js';
import { loadEngineData } from '../../server/src/services/contentService.js';

import branches from './branches.js';
import topics from './topics.js';
import resources from './resources.js';
import problems from './problems.js';
import placement from './placement.js';
import users from './users.js';

const SEED_PASSWORD = 'mathmap123';

// Community submissions left in the moderation queue on first run.
const PENDING_RESOURCES = [
  { title: 'Eigenvalues for everyone', url: 'https://www.youtube.com/watch?v=PFDu9oVAE-g', type: 'video', provider: '3Blue1Brown', description: 'A gentle visual route into eigenvectors.', topics: ['la-eigenvalues'], by: 'contributor@mathmap.dev' },
  { title: 'Bayes theorem with Lego', url: 'https://www.youtube.com/watch?v=D8VZqxcu0I0', type: 'video', provider: '3Blue1Brown', description: 'Bayes\u2019 theorem explained with Lego bricks.', topics: ['pr-bayes'], by: 'aman@mathmap.dev' },
  { title: 'Project Euler problem 1 walkthrough', url: 'https://projecteuler.net/problem=1', type: 'problem_set', provider: 'Project Euler', description: 'Sum of multiples of 3 or 5 below 1000.', topics: ['nt-divisibility', 'dm-induction'], by: 'vivek@mathmap.dev' },
  { title: 'Desmos regression playground', url: 'https://www.desmos.com/calculator', type: 'simulation', provider: 'Desmos', description: 'Drag data points and watch the regression line move.', topics: ['st-regression'], by: 'sara@mathmap.dev' },
];

const PENDING_PROBLEMS = [
  { topic: 'la-eigenvalues', title: 'Trace equals sum of eigenvalues', difficulty: 4, statement: 'Prove that the trace of a 2x2 matrix equals the sum of its eigenvalues.', hint: 'Write the characteristic polynomial in terms of trace and determinant.', solution: 'For A = [[a,b],[c,d]], det(A - \u03bbI) = \u03bb\u00b2 - (a+d)\u03bb + (ad - bc). The sum of roots is a + d, the trace.', by: 'contributor@mathmap.dev' },
  { topic: 'pr-bayes', title: 'Spam filter with Bayes', difficulty: 4, statement: 'Given P(spam) = 0.3, P(word|spam) = 0.4 and P(word|ham) = 0.05, find P(spam|word).', hint: 'Bayes\u2019 theorem with the total probability of seeing the word.', solution: 'P(spam|word) = (0.4\u00b70.3) / (0.4\u00b70.3 + 0.05\u00b70.7) = 0.12/0.155 \u2248 0.774.', by: 'aman@mathmap.dev' },
  { topic: 'dm-combinatorics', title: 'Stars and bars', difficulty: 3, statement: 'How many non-negative integer solutions does x\u2081 + x\u2082 + x\u2083 = 10 have?', hint: 'Use the stars-and-bars formula C(n+k-1, k-1).', solution: 'C(10+3-1, 3-1) = C(12,2) = 66.', by: 'vivek@mathmap.dev' },
];

const SAMPLE_ROADMAPS = [
  {
    email: 'priya@mathmap.dev',
    title: 'Foundations for Machine Learning',
    branchSlugs: ['linear-algebra', 'statistics'],
    input: {
      level: 'beginner',
      goal: 'understand matrices, eigenvalues and regression to prepare for machine learning',
      interestTags: ['matrices', 'eigenvalues', 'regression', 'distributions', 'linear-systems'],
      length: 'medium',
    },
  },
  {
    email: 'rohan@mathmap.dev',
    title: 'Olympiad Number Theory & Combinatorics',
    branchSlugs: ['number-theory', 'discrete-mathematics'],
    input: {
      level: 'intermediate',
      goal: 'master modular arithmetic, primes and counting for maths competitions',
      interestTags: ['modular-arithmetic', 'primes', 'combinatorics', 'counting', 'congruences'],
      length: 'medium',
    },
  },
  {
    email: 'priya@mathmap.dev',
    title: 'Calculus for Physics',
    branchSlugs: ['calculus'],
    input: {
      level: 'advanced',
      goal: 'multivariable calculus and differential equations for physics',
      interestTags: ['derivatives', 'integrals', 'multivariable', 'differential-equations'],
      length: 'short',
    },
  },
];

async function truncateAll(client) {
  await client.query(`
    TRUNCATE moderation_log, roadmap_items, roadmaps, problems, placement_questions,
             resource_votes, resource_topics, resources, topic_prerequisites, topics,
             branches, users
    RESTART IDENTITY CASCADE
  `);
}

async function insertBranches(client) {
  const map = new Map();
  for (const b of branches) {
    const { rows } = await client.query(
      `INSERT INTO branches (slug, name, tagline, description, color, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [b.slug, b.name, b.tagline, b.description, b.color, b.icon, b.sort_order],
    );
    map.set(b.slug, rows[0].id);
  }
  return map;
}

async function insertUsers(client) {
  const map = new Map();
  const hash = hashPassword(SEED_PASSWORD);
  for (const u of users) {
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role, bio)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [u.name, u.email, hash, u.role, u.bio],
    );
    map.set(u.email, rows[0].id);
  }
  return map;
}

async function insertTopics(client, branchMap) {
  const map = new Map();
  for (const t of topics) {
    const branchId = branchMap.get(t.branch);
    if (!branchId) throw new Error(`Unknown branch "${t.branch}" for topic "${t.slug}"`);
    const { rows } = await client.query(
      `INSERT INTO topics (branch_id, slug, title, summary, difficulty_level, tags, est_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [branchId, t.slug, t.title, t.summary, t.difficulty, t.tags, t.minutes],
    );
    map.set(t.slug, rows[0].id);
  }

  // Prerequisite edges
  const missing = [];
  for (const t of topics) {
    for (const p of t.prereqs || []) {
      if (!map.has(p)) {
        missing.push(`${t.slug} -> ${p}`);
        continue;
      }
      await client.query(
        'INSERT INTO topic_prerequisites (topic_id, prerequisite_topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [map.get(t.slug), map.get(p)],
      );
    }
  }
  if (missing.length) {
    throw new Error(`Unknown prerequisite slugs:\n  ${missing.join('\n  ')}`);
  }

  // Guard: the concept graph must be acyclic.
  const edges = topics.flatMap((t) =>
    (t.prereqs || []).map((p) => ({ topic_id: t.slug, prerequisite_topic_id: p })),
  );
  const slugMap = new Map([...map.entries()].map(([slug, id]) => [slug, id]));
  const numericEdges = edges.map((e) => ({
    topic_id: slugMap.get(e.topic_id),
    prerequisite_topic_id: slugMap.get(e.prerequisite_topic_id),
  }));
  const cycle = detectCycle([...map.values()], buildPrereqMap(numericEdges));
  if (cycle) throw new Error(`Prerequisite cycle detected: ${cycle.join(' -> ')}`);

  return map;
}

async function insertPlacementQuestions(client, branchMap) {
  for (const [index, q] of placement.entries()) {
    const branchId = branchMap.get(q.branch);
    if (!branchId) throw new Error(`Placement question references unknown branch "${q.branch}"`);
    await client.query(
      `INSERT INTO placement_questions
         (branch_id, prompt, options, correct_index, difficulty_level, explanation, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [branchId, q.prompt, q.options, q.correctIndex, q.difficulty, q.explanation, index],
    );
  }
}

async function insertResource(client, r, topicMap, userMap) {
  const submitter = r.by ? userMap.get(r.by) ?? null : null;
  const { rows } = await client.query(
    `INSERT INTO resources (title, url, type, description, provider, submitted_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [r.title, r.url, r.type, r.description, r.provider, submitter, r.status || 'approved'],
  );
  const id = rows[0].id;
  for (const slug of r.topics || []) {
    const topicId = topicMap.get(slug);
    if (!topicId) throw new Error(`Resource "${r.title}" references unknown topic "${slug}"`);
    await client.query('INSERT INTO resource_topics (resource_id, topic_id) VALUES ($1, $2)', [id, topicId]);
  }
  return id;
}

async function insertVotes(client, resourceId, popularity, submitterId, voterIds) {
  if (!popularity) return;
  const pool = voterIds.filter((id) => id !== submitterId);
  const count = Math.min(Math.abs(popularity), pool.length);
  const value = popularity > 0 ? 1 : -1;
  for (let i = 0; i < count; i += 1) {
    await client.query(
      `INSERT INTO resource_votes (user_id, resource_id, value) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, resource_id) DO NOTHING`,
      [pool[i], resourceId, value],
    );
  }
}

/**
 * The demo dataset creates 12 accounts that all share a published password, one of
 * them an admin. That is fine on a laptop and catastrophic on a real deployment, so
 * refuse to load it into anything that is not a local database.
 *
 * Keyed off the database host rather than NODE_ENV: a stray NODE_ENV=production in a
 * developer shell should not block local seeding, and pointing DATABASE_URL at a
 * hosted instance is the case that actually needs the guard.
 */
function assertSafeSeedTarget() {
  if (process.env.ALLOW_DEMO_SEED === 'true') return;
  let hostname;
  try {
    ({ hostname } = new URL(config.databaseUrl));
  } catch {
    hostname = '';
  }
  const local = ['localhost', '127.0.0.1', '::1', ''].includes(hostname);
  if (!local) {
    throw new Error(
      `Refusing to seed demo accounts into a non-local database ("${hostname}"). `
      + 'It creates shared-password demo accounts, one of them an admin. '
      + 'Set ALLOW_DEMO_SEED=true to override deliberately.',
    );
  }
}

async function main() {
  assertSafeSeedTarget();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[seed] clearing existing data');
    await truncateAll(client);

    console.log('[seed] inserting branches, users, topics');
    const branchMap = await insertBranches(client);
    const userMap = await insertUsers(client);
    const topicMap = await insertTopics(client, branchMap);

    console.log(`[seed] inserting ${placement.length} placement questions`);
    await insertPlacementQuestions(client, branchMap);

    console.log(`[seed] inserting ${resources.length} resources`);
    const contributors = ['contributor@mathmap.dev', 'aman@mathmap.dev', 'vivek@mathmap.dev'].map((e) => userMap.get(e));
    const voterIds = [...userMap.values()];
    let ci = 0;
    for (const r of resources) {
      const submitter = contributors[ci % contributors.length];
      ci += 1;
      const id = await insertResource(client, { ...r, by: r.by || null }, topicMap, userMap);
      await insertVotes(client, id, r.popularity || 0, submitter, voterIds);
      // Attribute the resource to a rotating contributor for community realism.
      await client.query('UPDATE resources SET submitted_by = $1 WHERE id = $2', [submitter, id]);
    }

    console.log(`[seed] inserting ${PENDING_RESOURCES.length} pending resources`);
    for (const r of PENDING_RESOURCES) {
      await insertResource(client, { ...r, status: 'pending' }, topicMap, userMap);
    }

    console.log(`[seed] inserting ${problems.length} problems`);
    for (const p of problems) {
      const topicId = topicMap.get(p.topic);
      if (!topicId) throw new Error(`Problem "${p.title}" references unknown topic "${p.topic}"`);
      await client.query(
        `INSERT INTO problems (topic_id, title, statement, hint, solution, difficulty_level, source_url, submitted_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')`,
        [topicId, p.title, p.statement, p.hint, p.solution, p.difficulty, p.source_url || '', contributors[0]],
      );
    }

    console.log(`[seed] inserting ${PENDING_PROBLEMS.length} pending problems`);
    for (const p of PENDING_PROBLEMS) {
      const topicId = topicMap.get(p.topic);
      await client.query(
        `INSERT INTO problems (topic_id, title, statement, hint, solution, difficulty_level, submitted_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [topicId, p.title, p.statement, p.hint, p.solution, p.difficulty, userMap.get(p.by) ?? null],
      );
    }

    await client.query('COMMIT');
    console.log('[seed] data committed');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Roadmaps are generated through the real engine, outside the seed transaction.
  console.log('[seed] generating sample roadmaps');
  const data = await loadEngineData();
  for (const sample of SAMPLE_ROADMAPS) {
    const userId = (await pool.query('SELECT id FROM users WHERE email = $1', [sample.email])).rows[0]?.id;
    if (!userId) continue;
    const branchIds = sample.branchSlugs
      .map((s) => data.branches.find((b) => b.slug === s)?.id)
      .filter(Boolean);
    const roadmap = generateRoadmap({ ...sample.input, branchIds }, data);
    if (!roadmap.items.length) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO roadmaps (user_id, title, goal, level, branch_ids, interest_tags, length, is_saved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
        [userId, sample.title, roadmap.goal, roadmap.level, roadmap.branchIds, roadmap.interestTags, roadmap.length],
      );
      const roadmapId = rows[0].id;
      for (const item of roadmap.items) {
        await client.query(
          'INSERT INTO roadmap_items (roadmap_id, topic_id, order_index) VALUES ($1, $2, $3)',
          [roadmapId, item.topic.id, item.order],
        );
      }
      // Mark the first few items of the first roadmap complete so progress bars look alive.
      if (sample.email === 'priya@mathmap.dev' && sample.title.includes('Machine Learning')) {
        await client.query(
          `UPDATE roadmap_items SET status = 'completed'
           WHERE roadmap_id = $1 AND order_index <= 3`,
          [roadmapId],
        );
      }
      await client.query('COMMIT');
      console.log(`[seed]   ${sample.title} (${roadmap.items.length} topics)`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

main()
  .then(async () => {
    const stats = await pool.query('SELECT * FROM v_community_stats');
    console.log('\n[seed] done. Community stats:');
    console.table(stats.rows[0]);
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n[seed] FAILED:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
