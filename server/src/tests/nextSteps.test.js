import test from 'node:test';
import assert from 'node:assert/strict';
import { unlockedTopics } from '../services/nextSteps.js';

// 1 -> 2 -> 3 -> 5
//        \-> 4 -/
const EDGES = [
  { topic_id: 2, prerequisite_topic_id: 1 },
  { topic_id: 3, prerequisite_topic_id: 2 },
  { topic_id: 4, prerequisite_topic_id: 2 },
  { topic_id: 5, prerequisite_topic_id: 3 },
  { topic_id: 5, prerequisite_topic_id: 4 },
];
const IDS = [1, 2, 3, 4, 5];

const unlocked = (completedIds) => unlockedTopics({ completedIds, prereqEdges: EDGES, allTopicIds: IDS }).sort();

test('with nothing completed, only root concepts are unlocked', () => {
  assert.deepEqual(unlocked([]), [1]);
});

test('completing a prerequisite unlocks its direct dependents', () => {
  assert.deepEqual(unlocked([1]), [2]);
  assert.deepEqual(unlocked([1, 2]), [3, 4]);
});

test('a topic with several prerequisites waits for all of them', () => {
  // 5 needs both 3 and 4; 3 is done, 4 is not.
  assert.ok(!unlocked([1, 2, 3]).includes(5));
  assert.deepEqual(unlocked([1, 2, 3, 4]), [5]);
});

test('completed topics are never suggested again', () => {
  for (const id of unlocked([1, 2])) {
    assert.ok(![1, 2].includes(id));
  }
});

test('handles empty input safely', () => {
  assert.deepEqual(unlockedTopics({ completedIds: [], prereqEdges: [], allTopicIds: [] }), []);
});
