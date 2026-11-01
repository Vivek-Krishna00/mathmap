import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import { EmptyState, cx } from './ui.jsx';

const NODE_W = 208;
const NODE_H = 50;
const PITCH_X = 280;
const PITCH_Y = 68;
const PAD = 32;

function buildLayout(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  const prereqs = new Map(nodes.map((n) => [n.id, []]));
  const dependents = new Map(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    if (!ids.has(e.topic_id) || !ids.has(e.prerequisite_topic_id)) continue;
    prereqs.get(e.topic_id).push(e.prerequisite_topic_id);
    dependents.get(e.prerequisite_topic_id).push(e.topic_id);
  }

  const indegree = new Map(nodes.map((n) => [n.id, prereqs.get(n.id).length]));
  const depth = new Map();
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  queue.forEach((id) => depth.set(id, 0));

  const ready = [...queue];
  while (ready.length) {
    const id = ready.shift();
    for (const dep of dependents.get(id)) {
      depth.set(dep, Math.max(depth.get(dep) ?? 0, (depth.get(id) ?? 0) + 1));
      indegree.set(dep, indegree.get(dep) - 1);
      if (indegree.get(dep) === 0) ready.push(dep);
    }
  }
  for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, n.difficulty_level ? 0 : 0);

  const layers = new Map();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d).push(n);
  }

  const positions = new Map();
  let maxRows = 1;
  for (const [d, list] of layers) {
    maxRows = Math.max(maxRows, list.length);
    list.forEach((n, i) => {
      positions.set(n.id, { x: PAD + d * PITCH_X, y: PAD + i * PITCH_Y, layer: d });
    });
  }

  const cols = layers.size ? Math.max(...layers.keys()) + 1 : 1;
  const width = PAD * 2 + (cols - 1) * PITCH_X + NODE_W;
  const height = PAD * 2 + (maxRows - 1) * PITCH_Y + NODE_H;

  const drawnEdges = [];
  for (const e of edges) {
    if (!ids.has(e.topic_id) || !ids.has(e.prerequisite_topic_id)) continue;
    const from = positions.get(e.prerequisite_topic_id);
    const to = positions.get(e.topic_id);
    if (from && to) {
      drawnEdges.push({
        from,
        to,
        sourceId: e.prerequisite_topic_id,
        targetId: e.topic_id,
        key: `${e.prerequisite_topic_id}-${e.topic_id}`,
      });
    }
  }

  return { positions, drawnEdges, width, height, layers };
}

const STATE_FILL = {
  completed: 'rgba(23, 127, 115, 0.13)',
  in_progress: 'rgba(180, 118, 26, 0.13)',
  not_started: 'rgb(var(--c-surface))',
};

const STATE_LABEL = {
  completed: 'completed',
  in_progress: 'in progress',
  not_started: 'not started',
};

export default function ConceptGraph({ nodes = [], edges = [], onSelect, progress = null, trace = null }) {
  const [hovered, setHovered] = useState(null);
  const [zoom, setZoom] = useState(1);

  const { positions, drawnEdges, width, height } = useMemo(() => buildLayout(nodes, edges), [nodes, edges]);

  const stateByTopic = progress?.stateByTopic || null;
  const orderIndex = progress?.orderIndex || null;
  const violationEdges = useMemo(
    () => new Set((progress?.violationEdges || []).map(([prereq, topic]) => `${prereq}-${topic}`)),
    [progress],
  );
  const dueTopics = useMemo(() => new Set(progress?.dueTopics || []), [progress]);

  // When a trace is active, only that prerequisite chain stays lit.
  const traceChain = trace?.chain || null;
  const traceCenterId = trace?.centerId ?? null;

  const neighbours = useMemo(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    for (const e of edges) {
      if (e.topic_id === hovered) set.add(e.prerequisite_topic_id);
      if (e.prerequisite_topic_id === hovered) set.add(e.topic_id);
    }
    return set;
  }, [hovered, edges]);

  if (!nodes.length) {
    return <EmptyState icon="nodes" title="No concepts to show" message="Try selecting a different branch filter." />;
  }

  return (
    <div className="relative rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 card p-1">
        <button type="button" className="p-1.5 rounded-lg hover:bg-sunken text-muted" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}>
          <Icon name="minus" size={16} />
        </button>
        <span className="text-xs tabular-nums w-10 text-center text-muted">{Math.round(zoom * 100)}%</span>
        <button type="button" className="p-1.5 rounded-lg hover:bg-sunken text-muted" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      {/* tabIndex makes the scrollable canvas reachable by keyboard (WCAG 2.1.1) */}
      <div
        className="overflow-auto max-h-[70vh] p-2"
        tabIndex={0}
        role="group"
        aria-label="Concept map. Scrollable graph of topics and their prerequisites."
      >
        <svg
          width={width * zoom}
          height={height * zoom}
          viewBox={`0 0 ${width} ${height}`}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <marker id="mm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--c-muted))" opacity="0.55" />
            </marker>
          </defs>

          {drawnEdges.map((e) => {
            const x1 = e.from.x + NODE_W;
            const y1 = e.from.y + NODE_H / 2;
            const x2 = e.to.x;
            const y2 = e.to.y + NODE_H / 2;
            const mid = (x1 + x2) / 2;
            const active = neighbours ? neighbours.has(e.sourceId) && neighbours.has(e.targetId) : false;
            const isViolation = violationEdges.has(`${e.sourceId}-${e.targetId}`);
            // The path actually walked: both ends done, in the recommended direction.
            const travelled = Boolean(stateByTopic && orderIndex)
              && !isViolation
              && stateByTopic[e.sourceId] === 'completed'
              && stateByTopic[e.targetId] === 'completed'
              && orderIndex[e.sourceId] < orderIndex[e.targetId];

            let stroke = 'rgb(var(--c-muted))';
            let strokeWidth = active ? 2.4 : 1.3;
            let strokeOpacity = neighbours && !active ? 0.15 : active ? 0.85 : 0.4;

            if (traceChain) {
              const onChain = traceChain.has(e.sourceId) && traceChain.has(e.targetId);
              stroke = onChain ? '#1B4F8F' : 'rgb(var(--c-muted))';
              strokeWidth = onChain ? 2.2 : 1.1;
              strokeOpacity = onChain ? 0.9 : 0.08;
            } else if (isViolation) {
              stroke = '#B5495B';
              strokeWidth = 2.4;
              strokeOpacity = 0.9;
            } else if (travelled) {
              stroke = '#177F73';
              strokeWidth = 2;
              strokeOpacity = 0.9;
            }

            return (
              <path
                key={e.key}
                className="mm-edge"
                style={{ '--d': `${120 + (e.from.layer ?? 0) * 110}ms` }}
                pathLength={1}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={strokeOpacity}
                markerEnd="url(#mm-arrow)"
              />
            );
          })}

          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const dim = traceChain
              ? !traceChain.has(node.id)
              : Boolean(neighbours && !neighbours.has(node.id));
            const isHovered = hovered === node.id;
            const isTraceCenter = traceCenterId === node.id;
            const state = stateByTopic?.[node.id] || 'not_started';
            const step = orderIndex?.[node.id];
            const isDue = dueTopics.has(node.id);
            const showState = Boolean(stateByTopic);
            return (
              /* outer group runs the fade-in so the hover dim on the inner group still works */
              <g key={node.id} className="mm-node" style={{ '--d': `${(pos.layer ?? 0) * 90}ms` }}>
                <g
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="mm-node-hit cursor-pointer"
                  opacity={dim ? 0.28 : 1}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.title}. ${node.branch_name}, difficulty ${node.difficulty_level} of 5.${
                    showState
                      ? ` ${STATE_LABEL[state]}${step ? `, step ${step} of your path` : ''}${isDue ? ', due for review' : ''}.`
                      : ''
                  } Open topic.`}
                  onMouseEnter={() => setHovered(node.id)}
                  onFocus={() => setHovered(node.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect?.(node.slug)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect?.(node.slug);
                    }
                  }}
                >
                  <rect
                    className="mm-card"
                    width={NODE_W}
                    height={NODE_H}
                    rx={11}
                    fill={showState ? STATE_FILL[state] : 'rgb(var(--c-surface))'}
                    stroke={isTraceCenter ? '#1B4F8F' : isHovered ? node.branch_color : isDue ? '#B4761A' : 'rgb(var(--c-line))'}
                    strokeWidth={isTraceCenter ? 3 : isHovered || isDue ? 2.2 : 1}
                  />
                  <rect width={5} height={NODE_H} rx={2.5} fill={node.branch_color} />
                  <text x={14} y={21} fontSize="11.5" fontWeight="600" fill="rgb(var(--c-ink))">
                    {truncate(node.title, showState ? 22 : 27)}
                  </text>
                  <text x={14} y={37} fontSize="9.5" fill="rgb(var(--c-muted))">
                    {node.branch_name} · L{node.difficulty_level}
                  </text>
                  {showState && (state === 'completed' || state === 'in_progress') && (
                    <text
                      x={NODE_W - 12}
                      y={21}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="700"
                      fill={state === 'completed' ? '#177F73' : '#B4761A'}
                      style={state === 'completed' ? undefined : { opacity: 0.85 }}
                    >
                      {state === 'completed' ? `✓${step}` : '•'}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(text, n) {
  if (!text) return '';
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}
