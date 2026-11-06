import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalGraph } from '../services/goals.js';

const BRANCHES = [
  { id: 1, slug: 'la', name: 'Linear Algebra', color: '#111111' },
  { id: 2, slug: 'st', name: 'Statistics', color: '#222222' },
  { id: 3, slug: 'pr', name: 'Probability', color: '#333333' },
];

// la1 (root) -> la2 ; st1 (root) -> st2 ; st2 requires la2 ; pr1 (root)
const TOPICS = [
  { id: 10, slug: 'la1', title: 'Vectors', branch_id: 1 },
  { id: 11, slug: 'la2', title: 'Matrices', branch_id: 1 },
  { id: 20, slug: 'st1', title: 'Descriptive', branch_id: 2 },
  { id: 21, slug: 'st2', title: 'Regression', branch_id: 2 },
  { id: 30, slug: 'pr1', title: 'Counting', branch_id: 3 },
];
const EDGES = [
  { topic_id: 11, prerequisite_topic_id: 10 },
  { topic_id: 21, prerequisite_topic_id: 20 },
  { topic_id: 21, prerequisite_topic_id: 11 }, // cross-branch: statistics needs matrices
];

test('roots are the topics with no prerequisites', () => {
  const graph = computeGoalGraph({ branches: BRANCHES, topics: TOPICS, edges: EDGES });
  const bySlug = Object.fromEntries(graph.goals.map((g) => [g.slug, g.roots.map((r) => r.slug)]));
  assert.deepEqual(bySlug, { la: ['la1'], st: ['st1'], pr: ['pr1'] });
});

test('a concept required by another goal is reported as a bridge', () => {
  const graph = computeGoalGraph({ branches: BRANCHES, topics: TOPICS, edges: EDGES });
  const bridge = graph.bridges.find((b) => b.slug === 'la2');
  assert.ok(bridge, 'la2 should be a bridge');
  assert.deepEqual(bridge.goals, ['la', 'st']);
  assert.equal(bridge.branch_slug, 'la');
  assert.equal(bridge.unlocks, 1); // regression, beyond itself
});

test('shared concepts include transitive prerequisites, not just the direct one', () => {
  const graph = computeGoalGraph({ branches: BRANCHES, topics: TOPICS, edges: EDGES });
  const slugs = graph.bridges.map((b) => b.slug);
  // la2 feeds statistics directly; la1 is la2's prerequisite, so it is shared too.
  assert.deepEqual(slugs, ['la1', 'la2']);
  // probability is disconnected from the other two goals
  assert.ok(!slugs.includes('pr1'));
});

test('selecting one goal yields no bridges, and only that goal', () => {
  const graph = computeGoalGraph({ branches: BRANCHES, topics: TOPICS, edges: EDGES, selectedSlugs: ['st'] });
  assert.deepEqual(graph.goals.map((g) => g.slug), ['st']);
  assert.equal(graph.bridgeCount, 0);
});

test('a bridge disappears when its dependent goal is not selected', () => {
  const graph = computeGoalGraph({ branches: BRANCHES, topics: TOPICS, edges: EDGES, selectedSlugs: ['la', 'pr'] });
  assert.equal(graph.bridgeCount, 0);
});

test('bridges are ordered by how much they unlock', () => {
  const extraTopics = [
    ...TOPICS,
    { id: 40, slug: 'st3', title: 'ANOVA', branch_id: 2 },
  ];
  const extraEdges = [...EDGES, { topic_id: 40, prerequisite_topic_id: 11 }];
  const graph = computeGoalGraph({ branches: BRANCHES, topics: extraTopics, edges: extraEdges });
  // la1 unlocks la2, st2 and st3; la2 unlocks st2 and st3.
  assert.equal(graph.bridges[0].slug, 'la1');
  assert.equal(graph.bridges[0].unlocks, 3);
  assert.equal(graph.bridges[1].slug, 'la2');
  assert.equal(graph.bridges[1].unlocks, 2);
});
