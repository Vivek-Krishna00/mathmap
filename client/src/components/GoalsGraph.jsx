import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { EmptyState, cx } from './ui.jsx';

/**
 * Radial goals graph: one hub per goal, its entry points around it, and the concepts
 * that serve more than one goal placed *between* the goals they connect.
 *
 * Deterministic layout (no force simulation), keyboard reachable, with a table of
 * shared foundations underneath as the non-visual equivalent.
 */

const SIZE = 760;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_GOAL = 170;
const R_ROOT = 320;
const GOAL_R = 26;
const ROOT_R = 9;
const BRIDGE_R = 14;

function buildLayout(goals, bridges) {
  const n = Math.max(goals.length, 1);

  const goalNodes = goals.map((goal, index) => {
    const angle = ((-90 + (360 / n) * index) * Math.PI) / 180;
    return { ...goal, angle, x: CX + R_GOAL * Math.cos(angle), y: CY + R_GOAL * Math.sin(angle) };
  });

  const rootNodes = [];
  for (const goal of goalNodes) {
    const roots = goal.roots || [];
    const spread = ((Math.PI * 2) / n) * 0.55;
    roots.forEach((root, index) => {
      const offset = roots.length === 1 ? 0 : index / (roots.length - 1) - 0.5;
      const angle = goal.angle + offset * spread;
      rootNodes.push({
        ...root,
        goalSlug: goal.slug,
        color: goal.color,
        x: CX + R_ROOT * Math.cos(angle),
        y: CY + R_ROOT * Math.sin(angle),
      });
    });
  }

  // Bridges are grouped by the exact set of goals they serve, then placed at the
  // centroid of those goals pulled toward the centre — so a shared concept sits
  // between the goals it connects.
  const groups = new Map();
  for (const bridge of bridges) {
    const key = [...bridge.goals].sort().join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(bridge);
  }

  const bridgeNodes = [];
  for (const [key, list] of groups) {
    const served = key.split('|');
    const pts = served.map((slug) => goalNodes.find((g) => g.slug === slug)).filter(Boolean);
    if (!pts.length) continue;
    const ax = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const ay = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
    const anchorX = CX + (ax - CX) * 0.6;
    const anchorY = CY + (ay - CY) * 0.6;

    list.forEach((bridge, index) => {
      const angle = ((Math.PI * 2) / list.length) * index - Math.PI / 2;
      const spread = list.length > 1 ? 38 : 0;
      bridgeNodes.push({
        ...bridge,
        served,
        x: anchorX + Math.cos(angle) * spread,
        y: anchorY + Math.sin(angle) * spread,
      });
    });
  }

  const goalEdges = [];
  for (const goal of goalNodes) {
    for (const root of goal.roots || []) {
      const node = rootNodes.find((r) => r.id === root.id);
      if (node) {
        goalEdges.push({ key: `g${goal.id}-r${root.id}`, from: goal, to: node, color: goal.color });
      }
    }
  }

  const bridgeEdges = [];
  for (const bridge of bridgeNodes) {
    for (const slug of bridge.served) {
      const goal = goalNodes.find((g) => g.slug === slug);
      if (goal) {
        bridgeEdges.push({ key: `b${bridge.id}-${slug}`, from: bridge, to: goal, color: bridge.branch_color, bridgeId: bridge.id });
      }
    }
  }

  return { goalNodes, rootNodes, bridgeNodes, goalEdges, bridgeEdges };
}

export default function GoalsGraph({ goals = [], bridges = [] }) {
  const navigate = useNavigate();
  const [hoveredBridge, setHoveredBridge] = useState(null);
  const [hoveredGoal, setHoveredGoal] = useState(null);

  if (!goals.length) {
    return <EmptyState icon="target" title="No goals to show" message="Pick at least one branch above." />;
  }

  const { goalNodes, rootNodes, bridgeNodes, goalEdges, bridgeEdges } = buildLayout(goals, bridges);
  const bridgeNumber = new Map(bridgeNodes.map((b, i) => [b.id, i + 1]));

  const activate = (node) => {
    if (node.kind === 'goal') navigate(`/branches/${node.slug}`);
    else navigate(`/topics/${node.slug}`);
  };

  return (
    <div>
      <div className="rounded-2xl border border-line bg-surface overflow-auto max-h-[75vh]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-auto"
          role="group"
          aria-label="Goals graph: branches, their entry concepts, and the concepts shared between them."
        >
          {/* goal -> entry concept */}
          {goalEdges.map((edge) => (
            <line
              key={edge.key}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={edge.color}
              strokeWidth={1.2}
              opacity={hoveredGoal && hoveredGoal !== edge.from.slug ? 0.08 : 0.3}
            />
          ))}

          {/* shared concept -> each goal it serves */}
          {bridgeEdges.map((edge) => (
            <line
              key={edge.key}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={edge.color}
              strokeWidth={hoveredBridge === edge.bridgeId ? 2.8 : 1.8}
              opacity={hoveredBridge && hoveredBridge !== edge.bridgeId ? 0.12 : 0.5}
            />
          ))}

          {rootNodes.map((root) => (
            <g
              key={`root-${root.id}`}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${root.title}. Entry point to ${root.goalSlug.replace(/-/g, ' ')}. Open topic.`}
              onClick={() => activate({ kind: 'concept', slug: root.slug })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate({ kind: 'concept', slug: root.slug }); }
              }}
            >
              <title>{root.title}</title>
              <circle cx={root.x} cy={root.y} r={ROOT_R} fill={root.color} opacity={0.85} />
            </g>
          ))}

          {goalNodes.map((goal) => (
            <g
              key={`goal-${goal.id}`}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${goal.name}. ${goal.roots.length} entry concept. Open branch.`}
              onMouseEnter={() => setHoveredGoal(goal.slug)}
              onMouseLeave={() => setHoveredGoal(null)}
              onFocus={() => setHoveredGoal(goal.slug)}
              onBlur={() => setHoveredGoal(null)}
              onClick={() => activate({ kind: 'goal', slug: goal.slug })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate({ kind: 'goal', slug: goal.slug }); }
              }}
            >
              <title>{goal.name}</title>
              <circle cx={goal.x} cy={goal.y} r={GOAL_R} fill={goal.color} />
              <text
                x={goal.x}
                y={goal.y + GOAL_R + 16}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="rgb(var(--c-ink))"
              >
                {goal.name}
              </text>
            </g>
          ))}

          {bridgeNodes.map((bridge) => (
            <g
              key={`bridge-${bridge.id}`}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Shared concept: ${bridge.title}. Serves ${bridge.served.join(' and ')}. Open topic.`}
              onMouseEnter={() => setHoveredBridge(bridge.id)}
              onMouseLeave={() => setHoveredBridge(null)}
              onFocus={() => setHoveredBridge(bridge.id)}
              onBlur={() => setHoveredBridge(null)}
              onClick={() => activate({ kind: 'concept', slug: bridge.slug })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate({ kind: 'concept', slug: bridge.slug }); }
              }}
            >
              <title>{bridge.title}</title>
              <circle
                cx={bridge.x}
                cy={bridge.y}
                r={BRIDGE_R}
                fill="rgb(var(--c-surface))"
                stroke={bridge.branch_color}
                strokeWidth={hoveredBridge === bridge.id ? 3 : 2.2}
              />
              <text x={bridge.x} y={bridge.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgb(var(--c-ink))">
                {bridgeNumber.get(bridge.id)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-600" aria-hidden="true" /> Goal
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" aria-hidden="true" /> Entry concept
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-brand-600" aria-hidden="true" /> Shared concept (numbered below)
        </span>
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon name="nodes" size={17} className="text-brand-600 dark:text-brand-300" /> Shared foundations
        </h2>
        {bridges.length === 0 ? (
          <p className="text-sm text-muted mt-2">
            These goals do not share any concepts. Select two or more branches that build on each other —
            for example Linear Algebra and Statistics — to see what they have in common.
          </p>
        ) : (
          <div className="card overflow-hidden mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Concepts shared between the selected goals</caption>
                <thead className="bg-sunken text-muted">
                  <tr>
                    <th scope="col" className="text-left font-medium px-4 py-2.5">#</th>
                    <th scope="col" className="text-left font-medium px-4 py-2.5">Concept</th>
                    <th scope="col" className="text-left font-medium px-4 py-2.5">Serves</th>
                    <th scope="col" className="text-right font-medium px-4 py-2.5">Unlocks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bridgeNodes.map((bridge) => (
                    <tr key={bridge.id} className={cx('hover:bg-sunken/50', hoveredBridge === bridge.id && 'bg-sunken/50')}>
                      <td className="px-4 py-2.5 text-muted tabular-nums">{bridgeNumber.get(bridge.id)}</td>
                      <td className="px-4 py-2.5">
                        <Link to={`/topics/${bridge.slug}`} className="font-medium hover:text-brand-600 dark:hover:text-brand-300">
                          {bridge.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {bridge.served.map((s) => s.replace(/-/g, ' ')).join(' · ')}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">{bridge.unlocks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
