import { Link } from 'react-router-dom';
import { DifficultyPill } from './ui.jsx';

/**
 * The accessible equivalent of the concept map: the same nodes and prerequisite
 * edges rendered as a table, so the information is available without a pointer
 * or a spatial layout (see WCAG 1.3.1 and 1.1.1).
 */
export default function GraphList({ nodes = [], edges = [], progress = null }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const prereqs = new Map();
  for (const edge of edges) {
    if (!byId.has(edge.topic_id) || !byId.has(edge.prerequisite_topic_id)) continue;
    if (!prereqs.has(edge.topic_id)) prereqs.set(edge.topic_id, []);
    prereqs.get(edge.topic_id).push(edge.prerequisite_topic_id);
  }

  const stateByTopic = progress?.stateByTopic || null;
  const orderIndex = progress?.orderIndex || null;
  const dueTopics = new Set(progress?.dueTopics || []);
  const violating = new Set((progress?.violations || []).map((v) => v.topicId));

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Every concept, with its branch, difficulty level and the concepts it requires.
          </caption>
          <thead className="bg-sunken text-muted">
            <tr>
              <th scope="col" className="text-left font-medium px-4 py-3">Concept</th>
              <th scope="col" className="text-left font-medium px-4 py-3">Branch</th>
              <th scope="col" className="text-left font-medium px-4 py-3">Level</th>
              <th scope="col" className="text-left font-medium px-4 py-3">Requires</th>
              {stateByTopic && <th scope="col" className="text-left font-medium px-4 py-3">Your progress</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {nodes.map((node) => {
              const requires = (prereqs.get(node.id) || [])
                .map((id) => byId.get(id)?.title)
                .filter(Boolean);
              return (
                <tr key={node.id} className="hover:bg-sunken/50">
                  <td className="px-4 py-2.5">
                    <Link to={`/topics/${node.slug}`} className="font-medium hover:text-brand-600 dark:hover:text-brand-300">
                      {node.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: node.branch_color }} aria-hidden="true" />
                      {node.branch_name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><DifficultyPill level={node.difficulty_level} /></td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {requires.length ? requires.join(', ') : <span aria-label="No prerequisites">none</span>}
                  </td>
                  {stateByTopic && (
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                      {stateByTopic[node.id] === 'completed' ? (
                        <span className="text-teal-700 dark:text-teal-300">
                          ✓ step {orderIndex?.[node.id]}
                          {dueTopics.has(node.id) && <span className="text-accent-700 dark:text-accent-300"> · due</span>}
                          {violating.has(node.id) && <span className="text-rose-700 dark:text-rose-300"> · out of order</span>}
                        </span>
                      ) : stateByTopic[node.id] === 'in_progress' ? (
                        <span className="text-accent-700 dark:text-accent-300">In progress</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
