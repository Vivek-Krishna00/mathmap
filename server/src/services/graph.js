/**
 * Graph helpers for the mathematics concept DAG.
 *
 * Edges are stored as `topic -> prerequisite` (a topic requires its prerequisite),
 * so a valid learning order is a topological sort with prerequisites first.
 */

/** Build a Map<topicId, Set<prerequisiteId>> from edge rows. */
export function buildPrereqMap(edges) {
  const map = new Map();
  for (const e of edges) {
    const topic = Number(e.topic_id ?? e.topicId);
    const prereq = Number(e.prerequisite_topic_id ?? e.prerequisiteId);
    if (!Number.isFinite(topic) || !Number.isFinite(prereq) || topic === prereq) continue;
    if (!map.has(topic)) map.set(topic, new Set());
    map.get(topic).add(prereq);
  }
  return map;
}

export function prereqsOf(prereqMap, id) {
  return [...(prereqMap.get(Number(id)) || [])];
}

/** All transitive prerequisites of `seedIds`, including the seeds themselves. */
export function closure(seedIds, prereqMap) {
  const result = new Set();
  const stack = [...seedIds].map(Number);
  while (stack.length) {
    const id = stack.pop();
    if (result.has(id)) continue;
    result.add(id);
    for (const p of prereqMap.get(id) || []) {
      if (!result.has(p)) stack.push(p);
    }
  }
  return result;
}

/** Reverse closure: a node and everything that (transitively) depends on it. */
export function dependentsClosure(seedIds, prereqMap) {
  const dependents = new Map();
  for (const [topic, prereqs] of prereqMap) {
    for (const p of prereqs) {
      if (!dependents.has(p)) dependents.set(p, new Set());
      dependents.get(p).add(topic);
    }
  }
  const result = new Set();
  const stack = [...seedIds].map(Number);
  while (stack.length) {
    const id = stack.pop();
    if (result.has(id)) continue;
    result.add(id);
    for (const d of dependents.get(id) || []) {
      if (!result.has(d)) stack.push(d);
    }
  }
  return result;
}

/** Detect a cycle within the subgraph induced by `nodeIds`. Returns the cycle or null. */
export function detectCycle(nodeIds, prereqMap) {
  const set = new Set(nodeIds.map(Number));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...set].map((id) => [id, WHITE]));
  const stack = [];
  let cycle = null;

  const visit = (id) => {
    color.set(id, GRAY);
    stack.push(id);
    for (const p of prereqMap.get(id) || []) {
      if (!set.has(p)) continue;
      const c = color.get(p);
      if (c === GRAY) {
        cycle = stack.slice(stack.indexOf(p)).concat(p);
        return true;
      }
      if (c === WHITE && visit(p)) return true;
    }
    stack.pop();
    color.set(id, BLACK);
    return false;
  };

  for (const id of set) {
    if (color.get(id) === WHITE && visit(id)) return cycle;
  }
  return cycle;
}

function insertSorted(arr, value, compare) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compare(arr[mid], value) < 0) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, value);
}

/**
 * Kahn topological sort restricted to `nodeIds`.
 * `compare(idA, idB)` decides tie-breaks; must be deterministic.
 */
export function topologicalOrder(nodeIds, prereqMap, compare = (a, b) => a - b) {
  const set = new Set(nodeIds.map(Number));
  const indegree = new Map();
  const dependents = new Map();
  for (const id of set) {
    indegree.set(id, 0);
    dependents.set(id, []);
  }
  for (const id of set) {
    for (const p of prereqMap.get(id) || []) {
      if (!set.has(p)) continue;
      indegree.set(id, indegree.get(id) + 1);
      dependents.get(p).push(id);
    }
  }

  const ready = [...set].filter((id) => indegree.get(id) === 0).sort(compare);
  const order = [];
  while (ready.length) {
    const id = ready.shift();
    order.push(id);
    for (const dep of dependents.get(id)) {
      indegree.set(dep, indegree.get(dep) - 1);
      if (indegree.get(dep) === 0) insertSorted(ready, dep, compare);
    }
  }

  const placed = new Set(order);
  return {
    order,
    hasCycle: order.length !== set.size,
    unresolved: [...set].filter((id) => !placed.has(id)),
  };
}

/** Assign each node a layer = longest path from a source, for layered graph drawing. */
export function layeredLayout(nodeIds, prereqMap, compare = (a, b) => a - b) {
  const set = new Set(nodeIds.map(Number));
  const { order, hasCycle } = topologicalOrder([...set], prereqMap, compare);
  const depth = new Map();
  for (const id of order) {
    let d = 0;
    for (const p of prereqMap.get(id) || []) {
      if (!set.has(p)) continue;
      d = Math.max(d, (depth.get(p) ?? 0) + 1);
    }
    depth.set(id, d);
  }
  const maxDepth = order.length ? Math.max(...[...depth.values()]) : 0;
  const layers = Array.from({ length: maxDepth + 1 }, () => []);
  for (const id of order) layers[depth.get(id)].push(id);
  return { depth, layers, maxDepth, hasCycle, order };
}
