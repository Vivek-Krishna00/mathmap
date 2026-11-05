import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningPath, reviewIntervalDays } from '../services/learningPath.js';

// 2 requires 1; 3 requires 2
const EDGES = [
  { topic_id: 2, prerequisite_topic_id: 1 },
  { topic_id: 3, prerequisite_topic_id: 2 },
];

const item = (topic_id, status, completed_at = null, extra = {}) => ({
  topic_id, status, completed_at, last_reviewed_at: null, review_count: 0, ...extra,
});

test('review intervals widen and then hold at 35 days', () => {
  assert.equal(reviewIntervalDays(0), 3);
  assert.equal(reviewIntervalDays(1), 7);
  assert.equal(reviewIntervalDays(2), 16);
  assert.equal(reviewIntervalDays(3), 35);
  assert.equal(reviewIntervalDays(99), 35);
});

test('a correctly ordered path has no violations and full adherence', () => {
  const path = buildLearningPath([
    item(1, 'completed', '2026-01-01T10:00:00Z'),
    item(2, 'completed', '2026-01-02T10:00:00Z'),
    item(3, 'completed', '2026-01-03T10:00:00Z'),
  ], EDGES);

  assert.deepEqual(path.order, [1, 2, 3]);
  assert.deepEqual(path.orderIndex, { 1: 1, 2: 2, 3: 3 });
  assert.deepEqual(path.violations, []);
  assert.equal(path.adherencePercent, 100);
});

test('completing a topic before its prerequisite is flagged', () => {
  // 2 completed before 1, and 3 before 2
  const path = buildLearningPath([
    item(2, 'completed', '2026-01-01T10:00:00Z'),
    item(1, 'completed', '2026-01-02T10:00:00Z'),
    item(3, 'completed', '2026-01-03T10:00:00Z'),
  ], EDGES);

  assert.deepEqual(path.order, [2, 1, 3]);
  const flagged = path.violations.map((v) => v.topicId).sort();
  assert.deepEqual(flagged, [2]);
  assert.deepEqual(path.violations[0].missing, [1]);
  assert.deepEqual(path.violationEdges, [[1, 2]]);
  // one of three topics is out of order
  assert.equal(path.adherencePercent, 67);
});

test('a prerequisite that was never completed also counts as a violation', () => {
  const path = buildLearningPath([item(2, 'completed', '2026-01-01T10:00:00Z')], EDGES);
  assert.deepEqual(path.violations, [{ topicId: 2, missing: [1] }]);
  assert.equal(path.adherencePercent, 0);
});

test('in-progress topics are tracked but not ordered', () => {
  const path = buildLearningPath([
    item(1, 'completed', '2026-01-01T10:00:00Z'),
    item(2, 'in_progress'),
  ], EDGES);

  assert.deepEqual(path.order, [1]);
  assert.equal(path.stateByTopic[2], 'in_progress');
  assert.equal(path.summary.completed, 1);
  assert.equal(path.summary.inProgress, 1);
});

test('completion is aggregated across roadmaps, keeping the earliest date', () => {
  const path = buildLearningPath([
    item(1, 'completed', '2026-03-01T10:00:00Z'),
    item(1, 'completed', '2026-01-01T10:00:00Z'), // same topic, earlier, other roadmap
  ], EDGES);
  assert.deepEqual(path.order, [1]);
  assert.equal(path.summary.tracked, 1);
});

test('completed topics with no review are due, and reviewed ones are not', () => {
  const now = new Date('2026-01-10T00:00:00Z');
  const path = buildLearningPath([
    item(1, 'completed', '2026-01-09T10:00:00Z'),                        // never reviewed -> due
    item(2, 'completed', '2026-01-09T10:00:00Z', {
      last_reviewed_at: '2026-01-09T20:00:00Z', review_count: 1,        // reviewed yesterday -> not due (7d)
    }),
  ], EDGES, now);

  assert.deepEqual(path.dueTopics, [1]);
  assert.equal(path.summary.due, 1);
});

test('an empty history yields null adherence rather than a divide-by-zero', () => {
  const path = buildLearningPath([], EDGES);
  assert.equal(path.adherencePercent, null);
  assert.deepEqual(path.order, []);
  assert.deepEqual(path.summary, { tracked: 0, completed: 0, inProgress: 0, due: 0, violating: 0 });
});
