import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrereqMap,
  closure,
  dependentsClosure,
  detectCycle,
  topologicalOrder,
  layeredLayout,
} from '../services/graph.js';

// a <- b <- c  (c requires b requires a) ; plus an independent d
const EDGES = [
  { topic_id: 2, prerequisite_topic_id: 1 },
  { topic_id: 3, prerequisite_topic_id: 2 },
];
const MAP = buildPrereqMap(EDGES);

test('buildPrereqMap builds adjacency', () => {
  assert.deepEqual([...MAP.get(3)], [2]);
  assert.deepEqual([...MAP.get(2)], [1]);
  assert.equal(MAP.get(1), undefined);
});

test('closure pulls in all transitive prerequisites', () => {
  const set = closure([3], MAP);
  assert.deepEqual([...set].sort(), [1, 2, 3]);
});

test('dependentsClosure walks forward', () => {
  const set = dependentsClosure([1], MAP);
  assert.deepEqual([...set].sort(), [1, 2, 3]);
});

test('topologicalOrder places prerequisites first', () => {
  const { order, hasCycle } = topologicalOrder([1, 2, 3, 4], MAP);
  assert.equal(hasCycle, false);
  assert.ok(order.indexOf(1) < order.indexOf(2));
  assert.ok(order.indexOf(2) < order.indexOf(3));
  assert.equal(order.length, 4);
});

test('detectCycle returns null for a DAG', () => {
  assert.equal(detectCycle([1, 2, 3, 4], MAP), null);
});

test('detectCycle finds a cycle', () => {
  const cyclic = buildPrereqMap([
    { topic_id: 1, prerequisite_topic_id: 2 },
    { topic_id: 2, prerequisite_topic_id: 1 },
  ]);
  const cycle = detectCycle([1, 2], cyclic);
  assert.ok(Array.isArray(cycle));
  assert.ok(cycle.length >= 2);
});

test('layeredLayout assigns increasing depth along a chain', () => {
  const { depth, maxDepth } = layeredLayout([1, 2, 3], MAP);
  assert.equal(depth.get(1), 0);
  assert.equal(depth.get(2), 1);
  assert.equal(depth.get(3), 2);
  assert.equal(maxDepth, 2);
});
