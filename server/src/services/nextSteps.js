import { buildPrereqMap, dependentsClosure } from './graph.js';

/**
 * Which topics the learner is ready to start next.
 *
 * A topic qualifies when every one of its prerequisites is already completed. The
 * candidate pool is narrowed with a forward closure from what they know, so we only
 * look at concepts their existing knowledge actually unlocks. Someone with nothing
 * completed gets the root concepts (no prerequisites).
 */
export function unlockedTopics({ completedIds, prereqEdges, allTopicIds }) {
  const completed = new Set(completedIds.map(Number));
  const prereqMap = buildPrereqMap(prereqEdges || []);
  const ids = (allTopicIds || []).map(Number);

  const reachable = completed.size ? dependentsClosure([...completed], prereqMap) : null;
  const pool = reachable ? ids.filter((id) => reachable.has(id)) : ids;

  return pool.filter((id) => {
    if (completed.has(id)) return false;
    for (const prereq of prereqMap.get(id) || []) {
      if (!completed.has(prereq)) return false;
    }
    return true;
  });
}
