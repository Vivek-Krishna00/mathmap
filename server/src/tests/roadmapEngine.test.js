import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRoadmap, pickDiverseResources } from '../services/roadmapEngine.js';

function resourceSetFor(topicId, votes = 1) {
  return [
    { id: topicId * 100 + 1, topic_id: topicId, title: `video-${topicId}`, url: 'https://e/v', type: 'video', net_votes: votes },
    { id: topicId * 100 + 2, topic_id: topicId, title: `article-${topicId}`, url: 'https://e/a', type: 'article', net_votes: votes },
    { id: topicId * 100 + 3, topic_id: topicId, title: `game-${topicId}`, url: 'https://e/g', type: 'game', net_votes: votes },
    { id: topicId * 100 + 4, topic_id: topicId, title: `problems-${topicId}`, url: 'https://e/p', type: 'problem_set', net_votes: votes },
  ];
}

// A 5-topic chain across two branches: 1 -> 2 -> 3 -> 4 -> 5
const CHAIN = {
  topics: [
    { id: 1, branch_id: 1, slug: 'a', title: 'A', summary: 'alpha basics', difficulty_level: 1, tags: ['x'], est_minutes: 10 },
    { id: 2, branch_id: 1, slug: 'b', title: 'B', summary: 'beta gamma', difficulty_level: 2, tags: ['x', 'y'], est_minutes: 10 },
    { id: 3, branch_id: 1, slug: 'c', title: 'C', summary: 'gamma', difficulty_level: 3, tags: ['y'], est_minutes: 10 },
    { id: 4, branch_id: 2, slug: 'd', title: 'D', summary: 'delta', difficulty_level: 4, tags: ['z'], est_minutes: 10 },
    { id: 5, branch_id: 2, slug: 'e', title: 'E', summary: 'epsilon', difficulty_level: 5, tags: ['z'], est_minutes: 10 },
  ],
  prerequisites: [
    { topic_id: 2, prerequisite_topic_id: 1 },
    { topic_id: 3, prerequisite_topic_id: 2 },
    { topic_id: 4, prerequisite_topic_id: 3 },
    { topic_id: 5, prerequisite_topic_id: 4 },
  ],
  resources: [1, 2, 3, 4, 5].flatMap((id) => resourceSetFor(id, 6 - id)),
  branches: [
    { id: 1, slug: 'one', name: 'One' },
    { id: 2, slug: 'two', name: 'Two' },
  ],
};

test('pickDiverseResources guarantees one per bucket', () => {
  const picked = pickDiverseResources(resourceSetFor(9, 3));
  const types = picked.map((r) => r.type);
  assert.ok(types.includes('video'));
  assert.ok(types.includes('article'));
  assert.ok(types.includes('game') || types.includes('simulation'));
  assert.ok(types.includes('problem_set') || types.includes('application'));
  assert.equal(new Set(picked.map((r) => r.id)).size, picked.length, 'no duplicate resources');
});

test('generated roadmap respects prerequisite order', () => {
  const rm = generateRoadmap(
    { branchIds: [1, 2], level: 'beginner', interestTags: ['y'], length: 'long' },
    CHAIN,
  );
  const ids = rm.items.map((i) => i.topic.id);
  assert.deepEqual(ids, [1, 2, 3, 4, 5]);
});

test('generated roadmap assigns a diverse resource set per topic', () => {
  const rm = generateRoadmap({ branchIds: [1], level: 'intermediate', interestTags: [], length: 'long' }, CHAIN);
  for (const item of rm.items) {
    const types = item.resources.map((r) => r.type);
    assert.ok(types.length >= 3, `topic ${item.topic.slug} should have several resources`);
    assert.equal(new Set(item.resources.map((r) => r.id)).size, item.resources.length);
  }
  assert.ok(rm.meta.coverageByType.video >= 1);
});

test('generation is deterministic for identical input', () => {
  const input = { branchIds: [1, 2], level: 'advanced', interestTags: ['z'], length: 'medium' };
  const a = generateRoadmap(input, CHAIN);
  const b = generateRoadmap(input, CHAIN);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('length control trims to the requested size without dropping roots', () => {
  // 12-topic chain, ask for a short roadmap (8).
  const topics = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    branch_id: 1,
    slug: `t${i + 1}`,
    title: `Topic ${i + 1}`,
    summary: '',
    difficulty_level: Math.min(5, 1 + Math.floor(i / 3)),
    tags: [],
    est_minutes: 10,
  }));
  const prerequisites = topics.slice(1).map((t, i) => ({
    topic_id: t.id,
    prerequisite_topic_id: topics[i].id,
  }));
  const rm = generateRoadmap(
    { branchIds: [1], level: 'beginner', interestTags: [], length: 'short' },
    { topics, prerequisites, resources: [], branches: [{ id: 1, slug: 'one', name: 'One' }] },
  );
  assert.equal(rm.items.length, 8);
  // The root prerequisite must survive trimming.
  assert.equal(rm.items[0].topic.id, 1);
});

test('empty candidate set returns an empty roadmap with a message', () => {
  const rm = generateRoadmap({ branchIds: [999], level: 'beginner', interestTags: [], length: 'short' }, CHAIN);
  assert.equal(rm.items.length, 0);
  assert.ok(typeof rm.meta.message === 'string');
});
