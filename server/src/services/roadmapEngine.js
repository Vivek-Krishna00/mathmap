import { buildPrereqMap, closure, topologicalOrder } from './graph.js';

/**
 * The MathMap recommendation engine.
 *
 * Deterministic, rule-based, and fully inside the Node/Express/Postgres stack:
 *   score topics -> keep a top slice -> close over prerequisites -> topologically
 *   order -> trim to the requested length without breaking prerequisites ->
 *   attach a type-diverse set of community resources to each topic.
 *
 * The same input always produces the same roadmap, which keeps the feature
 * testable and explainable to learners.
 */

export const LEVELS = ['beginner', 'intermediate', 'advanced'];
export const LENGTHS = ['short', 'medium', 'long'];

const LEVEL_TARGET = { beginner: 1.5, intermediate: 3, advanced: 4.5 };
const LENGTH_TARGET = { short: 8, medium: 15, long: 25 };
const MAX_RESOURCES_PER_TOPIC = 5;

// Diversity buckets: every roadmap should mix these where possible.
const DIVERSITY_BUCKETS = [
  { key: 'video', types: ['video'] },
  { key: 'article', types: ['article', 'book'] },
  { key: 'interactive', types: ['game', 'simulation'] },
  { key: 'practice', types: ['problem_set', 'application'] },
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'about', 'want',
  'learn', 'learning', 'understand', 'study', 'math', 'maths', 'mathematics',
  'would', 'like', 'need', 'help', 'some', 'more', 'able', 'good', 'know',
]);

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function tokenizeGoal(goal) {
  return normalizeText(goal)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

function clampLength(length) {
  return LENGTHS.includes(length) ? length : 'medium';
}

function normalizeInput(input = {}) {
  return {
    branchIds: Array.isArray(input.branchIds) ? input.branchIds.map(Number).filter(Number.isFinite) : [],
    level: LEVELS.includes(input.level) ? input.level : 'beginner',
    goal: String(input.goal || '').trim(),
    interestTags: Array.isArray(input.interestTags)
      ? input.interestTags.map((t) => normalizeText(t).trim()).filter(Boolean)
      : [],
    length: clampLength(input.length),
  };
}

/** Group resources by topic id, ranked by net votes (then title for stability). */
function indexResources(resources) {
  const byTopic = new Map();
  for (const r of resources || []) {
    const topicId = Number(r.topic_id);
    if (!Number.isFinite(topicId)) continue;
    if (!byTopic.has(topicId)) byTopic.set(topicId, []);
    byTopic.get(topicId).push({
      id: r.id,
      title: r.title,
      url: r.url,
      type: r.type,
      provider: r.provider || '',
      description: r.description || '',
      netVotes: Number(r.net_votes ?? r.netVotes ?? 0),
    });
  }
  for (const list of byTopic.values()) {
    list.sort((a, b) => b.netVotes - a.netVotes || String(a.title).localeCompare(String(b.title)));
  }
  return byTopic;
}

/** Choose a diverse set of resources for one topic. */
export function pickDiverseResources(list, max = MAX_RESOURCES_PER_TOPIC) {
  const pool = [...(list || [])];
  const chosen = [];
  const used = new Set();

  for (const bucket of DIVERSITY_BUCKETS) {
    const pick = pool.find((r) => bucket.types.includes(r.type) && !used.has(r.id));
    if (pick) {
      chosen.push(pick);
      used.add(pick.id);
    }
  }
  for (const r of pool) {
    if (chosen.length >= max) break;
    if (!used.has(r.id)) {
      chosen.push(r);
      used.add(r.id);
    }
  }
  return chosen;
}

function scoreTopic(topic, ctx) {
  const { branchIdSet, interestSet, goalTokens, targetLevel, maxTopicVotes } = ctx;

  const topicTags = (topic.tags || []).map(normalizeText);
  const matchedTags = topicTags.filter((t) => interestSet.has(t));
  const tagOverlap = matchedTags.length;

  const branchMatch = branchIdSet.size === 0 || branchIdSet.has(Number(topic.branch_id)) ? 1 : 0;

  const netVotes = Number(ctx.topicVotes.get(Number(topic.id)) || 0);
  const communitySignal = maxTopicVotes > 0 ? Math.max(0, netVotes) / maxTopicVotes : 0;

  const difficultyPenalty = Math.abs(Number(topic.difficulty_level) - targetLevel);

  const haystack = `${topic.title} ${topic.summary} ${topicTags.join(' ')}`.toLowerCase();
  const matchedGoal = goalTokens.filter((w) => haystack.includes(w));
  const goalBonus = matchedGoal.length;

  const score =
    3 * tagOverlap +
    2 * branchMatch +
    1.5 * communitySignal -
    2 * difficultyPenalty +
    1.5 * goalBonus;

  return { score, tagOverlap, branchMatch, communitySignal, difficultyPenalty, matchedTags, matchedGoal };
}

/**
 * Generate a roadmap.
 *
 * @param {object} input  { branchIds, level, goal, interestTags, length }
 * @param {object} data   { topics, prerequisites, resources, branches? }
 * @returns {object}      ordered roadmap with resources and metadata
 */
export function generateRoadmap(input, data) {
  const opts = normalizeInput(input);
  const topics = (data?.topics || []).map((t) => ({ ...t, tags: t.tags || [] }));
  const byId = new Map(topics.map((t) => [Number(t.id), t]));
  const prereqMap = buildPrereqMap(data?.prerequisites || []);
  const resourcesByTopic = indexResources(data?.resources || []);
  const branchNameById = new Map((data?.branches || []).map((b) => [Number(b.id), b.name]));

  const branchIdSet = new Set(opts.branchIds);
  const interestSet = new Set(opts.interestTags);
  const goalTokens = tokenizeGoal(opts.goal);
  const targetLevel = LEVEL_TARGET[opts.level];

  // Community signal per topic = sum of its approved resources' net votes.
  const topicVotes = new Map();
  let maxTopicVotes = 0;
  for (const [topicId, list] of resourcesByTopic) {
    const sum = list.reduce((acc, r) => acc + r.netVotes, 0);
    topicVotes.set(topicId, sum);
    maxTopicVotes = Math.max(maxTopicVotes, sum);
  }

  const candidates = topics.filter(
    (t) => branchIdSet.size === 0 || branchIdSet.has(Number(t.branch_id)),
  );

  if (candidates.length === 0) {
    return emptyRoadmap(opts, 'No topics matched your selected branches yet.');
  }

  const scored = candidates.map((topic) => ({
    topic,
    ...scoreTopic(topic, { branchIdSet, interestSet, goalTokens, targetLevel, maxTopicVotes, topicVotes }),
  }));

  const byScore = (a, b) =>
    b.score - a.score ||
    Number(a.topic.difficulty_level) - Number(b.topic.difficulty_level) ||
    String(a.topic.title).localeCompare(String(b.topic.title));
  scored.sort(byScore);

  const target = LENGTH_TARGET[opts.length];

  // 1. Seed selection: the best-scoring topics.
  const seedIds = scored.slice(0, target).map((s) => Number(s.topic.id));

  // 2. Close over prerequisites so the path is always learnable.
  const selected = closure(seedIds, prereqMap);
  const seedSet = new Set(seedIds);

  // 3. Trim back to `target` by removing the lowest-scoring leaves.
  //    A leaf has no dependents inside the set, so removing it never orphans
  //    a prerequisite.
  const scoreById = new Map();
  for (const s of scored) scoreById.set(Number(s.topic.id), s);
  const pickLowestLeaf = (set) => {
    let best = null;
    for (const id of set) {
      const hasDependentInSet = [...set].some(
        (other) => other !== id && (prereqMap.get(other) || new Set()).has(id),
      );
      if (hasDependentInSet) continue;
      if (!best) best = id;
      else {
        const a = scoreById.get(id)?.score ?? -Infinity;
        const b = scoreById.get(best)?.score ?? -Infinity;
        if (a < b || (a === b && String(byId.get(id)?.title) > String(byId.get(best)?.title))) best = id;
      }
    }
    return best;
  };
  while (selected.size > target) {
    const leaf = pickLowestLeaf(selected);
    if (leaf == null) break;
    selected.delete(leaf);
  }

  // 4. Order deterministically (best score first among ready nodes).
  const { order } = topologicalOrder(
    [...selected],
    prereqMap,
    (a, b) =>
      (scoreById.get(b)?.score ?? 0) - (scoreById.get(a)?.score ?? 0) ||
      Number(byId.get(a)?.difficulty_level ?? 0) - Number(byId.get(b)?.difficulty_level ?? 0) ||
      String(byId.get(a)?.title).localeCompare(String(byId.get(b)?.title)),
  );

  const items = order.map((id, index) => {
    const topic = byId.get(id);
    const info = scoreById.get(id);
    const resources = pickDiverseResources(resourcesByTopic.get(id) || []);
    const reasons = [];
    if (info?.matchedTags?.length) reasons.push(`Matches your interest: ${info.matchedTags.join(', ')}`);
    if (info?.matchedGoal?.length) reasons.push(`Relevant to your goal (${info.matchedGoal.join(', ')})`);
    if (!seedSet.has(id)) reasons.push('Foundational prerequisite');
    if (info?.communitySignal > 0) reasons.push('Community-recommended resources');
    return {
      order: index + 1,
      topic: {
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        summary: topic.summary,
        difficulty_level: topic.difficulty_level,
        tags: topic.tags,
        est_minutes: topic.est_minutes,
        branch_id: topic.branch_id,
        branch_name: branchNameById.get(Number(topic.branch_id)) || null,
      },
      resources,
      reasons,
    };
  });

  const branchBreakdown = {};
  const coverageByType = {};
  let difficultySum = 0;
  for (const item of items) {
    const bName = item.topic.branch_name || 'Other';
    branchBreakdown[bName] = (branchBreakdown[bName] || 0) + 1;
    difficultySum += Number(item.topic.difficulty_level);
    for (const r of item.resources) {
      coverageByType[r.type] = (coverageByType[r.type] || 0) + 1;
    }
  }

  return {
    title: buildTitle(opts, branchNameById),
    goal: opts.goal,
    level: opts.level,
    length: opts.length,
    branchIds: opts.branchIds,
    interestTags: opts.interestTags,
    items,
    meta: {
      candidateCount: candidates.length,
      selectedCount: items.length,
      requestedLength: target,
      averageDifficulty: items.length ? Number((difficultySum / items.length).toFixed(2)) : 0,
      branchBreakdown,
      coverageByType,
      resourceCount: items.reduce((acc, i) => acc + i.resources.length, 0),
      totalMinutes: items.reduce((acc, i) => acc + Number(i.topic.est_minutes || 0), 0),
    },
  };
}

function buildTitle(opts, branchNameById) {
  const names = opts.branchIds.map((id) => branchNameById.get(Number(id))).filter(Boolean);
  if (names.length === 0) return 'My Mathematics Roadmap';
  if (names.length === 1) return `${names[0]} Roadmap`;
  if (names.length === 2) return `${names[0]} + ${names[1]} Roadmap`;
  return `${names[0]} + ${names.length - 1} more Roadmap`;
}

function emptyRoadmap(opts, message) {
  return {
    title: buildTitle(opts, new Map()),
    goal: opts.goal,
    level: opts.level,
    length: opts.length,
    branchIds: opts.branchIds,
    interestTags: opts.interestTags,
    items: [],
    meta: {
      candidateCount: 0,
      selectedCount: 0,
      requestedLength: LENGTH_TARGET[opts.length],
      averageDifficulty: 0,
      branchBreakdown: {},
      coverageByType: {},
      resourceCount: 0,
      totalMinutes: 0,
      message,
    },
  };
}
