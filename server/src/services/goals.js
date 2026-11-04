import { buildPrereqMap, dependentsClosure } from './graph.js';

/**
 * Builds the "goals" graph: one hub per branch the learner cares about, the entry
 * point of each, and — the point of the view — the concepts that are a transitive
 * prerequisite of more than one goal. Those shared concepts are what connect
 * otherwise separate goals to each other.
 */
export function computeGoalGraph({ branches = [], topics = [], edges = [], selectedSlugs = null }) {
  const selected = selectedSlugs && selectedSlugs.length
    ? branches.filter((b) => selectedSlugs.includes(b.slug))
    : branches;

  const selectedIds = new Set(selected.map((b) => b.id));
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const prereqMap = buildPrereqMap(edges);

  // Entry points: topics in a selected branch with no prerequisites at all.
  const rootsByBranch = new Map();
  for (const topic of topics) {
    if (!selectedIds.has(topic.branch_id)) continue;
    if ((prereqMap.get(topic.id)?.size ?? 0) > 0) continue;
    if (!rootsByBranch.has(topic.branch_id)) rootsByBranch.set(topic.branch_id, []);
    rootsByBranch.get(topic.branch_id).push({ id: topic.id, slug: topic.slug, title: topic.title });
  }

  const bridges = [];
  for (const topic of topics) {
    const reachable = dependentsClosure([topic.id], prereqMap);

    const goals = new Set();
    if (selectedIds.has(topic.branch_id)) goals.add(branchById.get(topic.branch_id).slug);
    for (const id of reachable) {
      const dependent = topicById.get(id);
      if (dependent && selectedIds.has(dependent.branch_id)) {
        goals.add(branchById.get(dependent.branch_id).slug);
      }
    }

    if (goals.size >= 2) {
      const branch = branchById.get(topic.branch_id);
      bridges.push({
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        branch_slug: branch.slug,
        branch_color: branch.color,
        goals: [...goals].sort(),
        unlocks: reachable.size - 1,
      });
    }
  }

  bridges.sort((a, b) => b.unlocks - a.unlocks || a.title.localeCompare(b.title));

  return {
    goals: selected.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      color: b.color,
      roots: (rootsByBranch.get(b.id) || []).sort((x, y) => x.title.localeCompare(y.title)),
    })),
    bridges,
    bridgeCount: bridges.length,
  };
}
