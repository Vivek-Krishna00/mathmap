import { many, one } from '../db/pool.js';

/** Shared read queries for the catalog, resources, problems and graph. */

function optionalFilters(defs) {
  const params = [];
  const clauses = [];
  for (const [column, op, value] of defs) {
    if (value === undefined || value === null || value === '') continue;
    params.push(value);
    clauses.push(`${column} ${op} $${params.length}`);
  }
  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/** Clamp pagination to safe values so a negative LIMIT/OFFSET can't reach Postgres. */
function pageParams(limit, offset, maxLimit = 200) {
  const rawLimit = Number(limit);
  const rawOffset = Number(offset);
  const safeLimit = Number.isFinite(rawLimit) ? Math.min(maxLimit, Math.max(1, Math.trunc(rawLimit))) : maxLimit;
  const safeOffset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
  return [safeLimit, safeOffset];
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------
export function listBranches() {
  return many(`
    SELECT b.*,
           (SELECT count(*) FROM topics t WHERE t.branch_id = b.id)::int AS topic_count,
           (SELECT count(*) FROM resource_topics rt
              JOIN topics t2 ON t2.id = rt.topic_id
              JOIN resources r ON r.id = rt.resource_id
             WHERE t2.branch_id = b.id AND r.status = 'approved')::int AS resource_count
    FROM branches b
    ORDER BY b.sort_order, b.name
  `);
}

export async function getBranchBySlug(slug) {
  const branch = await one(
    `SELECT b.*,
            (SELECT count(*) FROM topics t WHERE t.branch_id = b.id)::int AS topic_count
     FROM branches b WHERE b.slug = $1`,
    [slug],
  );
  if (!branch) return null;
  branch.topics = await many(
    `SELECT t.id, t.slug, t.title, t.summary, t.difficulty_level, t.tags, t.est_minutes,
            c.resource_count, c.problem_count
     FROM topics t
     JOIN v_topic_resource_counts c ON c.topic_id = t.id
     WHERE t.branch_id = $1
     ORDER BY t.difficulty_level, t.title`,
    [branch.id],
  );
  return branch;
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
export async function listTopics({ branch, search, tag, difficulty, limit = 100, offset = 0 } = {}) {
  const built = optionalFilters([
    ['b.slug', '=', branch],
    ["(t.title || ' ' || t.summary)", 'ILIKE', search ? `%${search}%` : null],
    ['t.difficulty_level', '=', difficulty ? Number(difficulty) : null],
  ]);
  let whereClause = built.clause;
  const params = [...built.params];
  if (tag) {
    params.push(tag);
    whereClause += `${whereClause ? ' AND ' : 'WHERE '} $${params.length} = ANY(t.tags)`;
  }
  params.push(...pageParams(limit, offset));

  return many(`
    SELECT t.id, t.slug, t.title, t.summary, t.difficulty_level, t.tags, t.est_minutes,
           b.slug AS branch_slug, b.name AS branch_name, b.color AS branch_color,
           c.resource_count, c.problem_count
    FROM topics t
    JOIN branches b ON b.id = t.branch_id
    JOIN v_topic_resource_counts c ON c.topic_id = t.id
    ${whereClause}
    ORDER BY b.sort_order, t.difficulty_level, t.title
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
}

export async function countTopics(filters = {}) {
  const built = optionalFilters([
    ['b.slug', '=', filters.branch],
    ["(t.title || ' ' || t.summary)", 'ILIKE', filters.search ? `%${filters.search}%` : null],
    ['t.difficulty_level', '=', filters.difficulty ? Number(filters.difficulty) : null],
  ]);
  let whereClause = built.clause;
  const params = [...built.params];
  if (filters.tag) {
    params.push(filters.tag);
    whereClause += `${whereClause ? ' AND ' : 'WHERE '} $${params.length} = ANY(t.tags)`;
  }
  const row = await one(
    `SELECT count(*)::int AS total FROM topics t JOIN branches b ON b.id = t.branch_id ${whereClause}`,
    params,
  );
  return row?.total ?? 0;
}

export async function getTopicDetail(slug, viewerId) {
  const topic = await one(`
    SELECT t.*, b.slug AS branch_slug, b.name AS branch_name, b.color AS branch_color
    FROM topics t JOIN branches b ON b.id = t.branch_id
    WHERE t.slug = $1
  `, [slug]);
  if (!topic) return null;

  topic.prerequisites = await many(`
    SELECT t.id, t.slug, t.title, t.difficulty_level, b.name AS branch_name
    FROM topic_prerequisites p
    JOIN topics t ON t.id = p.prerequisite_topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE p.topic_id = $1
    ORDER BY t.difficulty_level
  `, [topic.id]);

  topic.dependents = await many(`
    SELECT t.id, t.slug, t.title, t.difficulty_level, b.name AS branch_name
    FROM topic_prerequisites p
    JOIN topics t ON t.id = p.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE p.prerequisite_topic_id = $1
    ORDER BY t.difficulty_level
  `, [topic.id]);

  topic.resources = await listResources({ topicId: topic.id, status: 'approved', viewerId });

  topic.problems = await many(`
    SELECT id, title, statement, hint, difficulty_level, source_url
    FROM problems
    WHERE topic_id = $1 AND status = 'approved'
    ORDER BY difficulty_level, title
  `, [topic.id]);

  return topic;
}

export async function getTopicIdBySlug(slug) {
  const row = await one('SELECT id FROM topics WHERE slug = $1', [slug]);
  return row?.id ?? null;
}

export async function listAllTopicTags(limit = 60) {
  return many(`
    SELECT tag, count(*)::int AS count
    FROM topics, unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, tag
    LIMIT $1
  `, [limit]);
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------
export async function getFullGraph({ branchIds } = {}) {
  const defs = [];
  let whereClause = '';
  const params = [];
  if (Array.isArray(branchIds) && branchIds.length) {
    params.push(branchIds.map(Number));
    whereClause = `WHERE t.branch_id = ANY($${params.length})`;
  }
  const nodes = await many(`
    SELECT t.id, t.slug, t.title, t.difficulty_level, t.tags,
           b.slug AS branch_slug, b.name AS branch_name, b.color AS branch_color,
           c.resource_count, c.problem_count
    FROM topics t
    JOIN branches b ON b.id = t.branch_id
    JOIN v_topic_resource_counts c ON c.topic_id = t.id
    ${whereClause}
    ORDER BY b.sort_order, t.difficulty_level, t.title
  `, params);

  const ids = nodes.map((n) => n.id);
  const edges = ids.length
    ? await many(`
        SELECT p.topic_id, p.prerequisite_topic_id
        FROM topic_prerequisites p
        WHERE p.topic_id = ANY($1) AND p.prerequisite_topic_id = ANY($1)
      `, [ids])
    : [];

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
export async function listResources({ topicId, topic, type, status = 'approved', submittedBy, viewerId, limit = 200, offset = 0 } = {}) {
  const params = [];
  const clauses = [];
  if (status) {
    params.push(status);
    clauses.push(`r.status = $${params.length}`);
  }
  if (type) {
    params.push(type);
    clauses.push(`r.type = $${params.length}`);
  }
  if (submittedBy) {
    params.push(submittedBy);
    clauses.push(`r.submitted_by = $${params.length}`);
  }
  if (topicId) {
    params.push(topicId);
    clauses.push(`EXISTS (SELECT 1 FROM resource_topics rt WHERE rt.resource_id = r.id AND rt.topic_id = $${params.length})`);
  } else if (topic) {
    params.push(topic);
    clauses.push(`EXISTS (SELECT 1 FROM resource_topics rt JOIN topics t ON t.id = rt.topic_id
                             WHERE rt.resource_id = r.id AND t.slug = $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  // The signed-in viewer's own vote, so up/down buttons render in the right state.
  let viewerParam = 'NULL';
  if (viewerId != null) {
    params.push(Number(viewerId));
    viewerParam = `$${params.length}`;
  }
  params.push(...pageParams(limit, offset));

  return many(`
    SELECT r.id, r.title, r.url, r.type, r.description, r.provider,
           r.status, r.submitted_by, r.created_at,
           s.net_votes, s.vote_count,
           COALESCE((SELECT v.value FROM resource_votes v
                      WHERE v.resource_id = r.id AND v.user_id = ${viewerParam}), 0)::int AS my_vote,
           COALESCE(array_agg(DISTINCT t.slug) FILTER (WHERE t.slug IS NOT NULL), '{}') AS topic_slugs,
           u.name AS submitted_by_name
    FROM resources r
    LEFT JOIN resource_topics rt ON rt.resource_id = r.id
    LEFT JOIN topics t ON t.id = rt.topic_id
    LEFT JOIN users u ON u.id = r.submitted_by
    JOIN v_resource_scores s ON s.resource_id = r.id
    ${where}
    GROUP BY r.id, s.net_votes, s.vote_count, u.name
    ORDER BY s.net_votes DESC, r.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
}

export async function getResourceById(id) {
  return one(`
    SELECT r.*, s.net_votes, s.vote_count
    FROM resources r JOIN v_resource_scores s ON s.resource_id = r.id
    WHERE r.id = $1
  `, [id]);
}

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------
export async function listProblems({ topic, difficulty, status = 'approved', limit = 200, offset = 0 } = {}) {
  const params = [];
  const clauses = [`p.status = $1`];
  params.push(status);
  if (difficulty) {
    params.push(Number(difficulty));
    clauses.push(`p.difficulty_level = $${params.length}`);
  }
  if (topic) {
    params.push(topic);
    clauses.push(`t.slug = $${params.length}`);
  }
  params.push(...pageParams(limit, offset));
  return many(`
    SELECT p.id, p.title, p.statement, p.hint, p.difficulty_level, p.source_url,
           p.status, p.created_at, t.slug AS topic_slug, t.title AS topic_title,
           b.name AS branch_name
    FROM problems p
    JOIN topics t ON t.id = p.topic_id
    JOIN branches b ON b.id = t.branch_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY p.difficulty_level, p.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
}

// ---------------------------------------------------------------------------
// Stats & engine data
// ---------------------------------------------------------------------------
export async function getCommunityStats() {
  const stats = await one('SELECT * FROM v_community_stats');
  const topResources = await many(`
    SELECT r.id, r.title, r.url, r.type, r.provider, s.net_votes,
           COALESCE(array_agg(DISTINCT t.slug) FILTER (WHERE t.slug IS NOT NULL), '{}') AS topic_slugs
    FROM resources r
    JOIN v_resource_scores s ON s.resource_id = r.id
    LEFT JOIN resource_topics rt ON rt.resource_id = r.id
    LEFT JOIN topics t ON t.id = rt.topic_id
    WHERE r.status = 'approved'
    GROUP BY r.id, s.net_votes
    ORDER BY s.net_votes DESC, r.created_at DESC
    LIMIT 6
  `);
  return { ...stats, topResources };
}

/** Everything the roadmap engine needs, in one round trip each. */
export async function loadEngineData() {
  const [topics, prerequisites, resources, branches] = await Promise.all([
    many(`SELECT id, branch_id, slug, title, summary, difficulty_level, tags, est_minutes FROM topics`),
    many(`SELECT topic_id, prerequisite_topic_id FROM topic_prerequisites`),
    many(`
      SELECT r.id, r.title, r.url, r.type, r.provider, r.description, rt.topic_id, s.net_votes
      FROM resources r
      JOIN resource_topics rt ON rt.resource_id = r.id
      JOIN v_resource_scores s ON s.resource_id = r.id
      WHERE r.status = 'approved'
    `),
    many(`SELECT id, slug, name, color FROM branches`),
  ]);
  return { topics, prerequisites, resources, branches };
}
