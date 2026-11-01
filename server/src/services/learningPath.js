import { buildPrereqMap } from './graph.js';

/**
 * Turns a learner's roadmap items into a description of the path they *actually*
 * took — completion order, prerequisite violations, review-due topics and a single
 * adherence figure. Pure and deterministic so it can be unit tested.
 */

export const REVIEW_INTERVALS = [3, 7, 16, 35];
const DAY_MS = 86_400_000;

export function reviewIntervalDays(reviewCount) {
  const index = Number(reviewCount) || 0;
  return REVIEW_INTERVALS[Math.min(index, REVIEW_INTERVALS.length - 1)];
}

function isReviewDue(topic, nowMs) {
  if (!topic.lastReviewedAt) return true;
  return nowMs - topic.lastReviewedAt.getTime() >= reviewIntervalDays(topic.reviewCount) * DAY_MS;
}

/**
 * @param {Array} items  roadmap_items rows: { topic_id, status, completed_at, last_reviewed_at, review_count }
 * @param {Array} edges  topic_prerequisites rows
 * @param {Date}  now    injectable for tests
 */
export function buildLearningPath(items, edges, now = new Date()) {
  const prereqMap = buildPrereqMap(edges || []);

  // Aggregate across every roadmap the learner owns: a topic counts as completed if
  // it is completed anywhere, and we keep the earliest completion date.
  const byTopic = new Map();
  for (const item of items || []) {
    const topicId = Number(item.topic_id);
    if (!Number.isFinite(topicId)) continue;

    const completedAt = item.status === 'completed' && item.completed_at
      ? new Date(item.completed_at)
      : null;
    const reviewedAt = item.last_reviewed_at ? new Date(item.last_reviewed_at) : null;
    const reviewCount = Number(item.review_count) || 0;

    const existing = byTopic.get(topicId);
    if (!existing) {
      byTopic.set(topicId, { topicId, status: item.status, completedAt, lastReviewedAt: reviewedAt, reviewCount });
      continue;
    }
    if (completedAt && (!existing.completedAt || completedAt < existing.completedAt)) {
      existing.completedAt = completedAt;
      existing.status = 'completed';
    } else if (!existing.completedAt && item.status === 'in_progress') {
      existing.status = 'in_progress';
    }
    if (reviewedAt && (!existing.lastReviewedAt || reviewedAt > existing.lastReviewedAt)) {
      existing.lastReviewedAt = reviewedAt;
    }
    existing.reviewCount = Math.max(existing.reviewCount, reviewCount);
  }

  const completed = [...byTopic.values()]
    .filter((t) => t.completedAt)
    .sort((a, b) => a.completedAt - b.completedAt || a.topicId - b.topicId);

  const order = completed.map((t) => t.topicId);
  const completedAtById = new Map(completed.map((t) => [t.topicId, t.completedAt]));

  // A violation is a completed topic that was finished before one of its prerequisites.
  const violations = [];
  for (const topic of completed) {
    const missing = [];
    for (const prereq of prereqMap.get(topic.topicId) || []) {
      const prereqAt = completedAtById.get(prereq);
      if (!prereqAt || prereqAt > topic.completedAt) missing.push(prereq);
    }
    if (missing.length) violations.push({ topicId: topic.topicId, missing });
  }

  const violatingTopics = new Set(violations.map((v) => v.topicId));
  const adherencePercent = completed.length
    ? Math.round(((completed.length - violatingTopics.size) / completed.length) * 100)
    : null;

  const nowMs = now.getTime();
  const dueTopics = completed.filter((t) => isReviewDue(t, nowMs)).map((t) => t.topicId);

  const stateByTopic = {};
  for (const topic of byTopic.values()) {
    stateByTopic[topic.topicId] = topic.completedAt
      ? 'completed'
      : topic.status === 'in_progress'
        ? 'in_progress'
        : 'not_started';
  }

  const orderIndex = {};
  order.forEach((id, index) => { orderIndex[id] = index + 1; });

  return {
    order,
    orderIndex,
    stateByTopic,
    violations,
    violationEdges: violations.flatMap((v) => v.missing.map((prereq) => [prereq, v.topicId])),
    dueTopics,
    adherencePercent,
    summary: {
      tracked: byTopic.size,
      completed: completed.length,
      inProgress: [...byTopic.values()].filter((t) => !t.completedAt && t.status === 'in_progress').length,
      due: dueTopics.length,
      violating: violatingTopics.size,
    },
  };
}
