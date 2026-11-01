import { Fragment } from 'react';
import { cx } from './ui.jsx';

/**
 * Renders `[[1,2],[3,4]]` as a proper bracketed matrix instead of literal brackets.
 *
 * Deliberately dependency-free: the project's stack constraint excludes a maths
 * typesetting library, and the content is already unicode-clean (integral signs,
 * superscripts, congruences), so matrices are the only thing that looked like code.
 */

// Outer bracket containing two or more [row] groups.
const MATRIX = /\[(\[[^\]]*](?:\s*,\s*\[[^\]]*])+)]/g;
const ROW = /\[([^\]]*)]/g;

function parseMatrix(inner) {
  const rows = [];
  for (const match of inner.matchAll(ROW)) {
    rows.push(match[1].split(',').map((cell) => cell.trim()));
  }
  return rows.length >= 2 ? rows : null;
}

function Matrix({ rows }) {
  const cols = Math.max(...rows.map((row) => row.length));
  const label = rows.map((row) => row.join(', ')).join('; ');
  return (
    <span
      className="inline-flex items-stretch gap-1 align-middle mx-1"
      role="img"
      aria-label={`matrix: ${label}`}
    >
      <span className="w-1.5 self-stretch border-l-2 border-y-2 border-current rounded-l-sm" aria-hidden="true" />
      <span
        className="grid gap-x-2 gap-y-0.5 py-0.5 text-[0.95em] leading-tight"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(1ch, auto))` }}
        aria-hidden="true"
      >
        {rows.flatMap((row, r) =>
          row.map((cell, c) => (
            <span key={`${r}-${c}`} className="text-center tabular-nums">
              {cell}
            </span>
          )),
        )}
      </span>
      <span className="w-1.5 self-stretch border-r-2 border-y-2 border-current rounded-r-sm" aria-hidden="true" />
    </span>
  );
}

export default function MathText({ children, className }) {
  const text = String(children ?? '');
  if (!text.includes('[[')) return <span className={className}>{text}</span>;

  const parts = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(MATRIX)) {
    const rows = parseMatrix(match[1]);
    if (!rows) continue;
    if (match.index > lastIndex) {
      parts.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    parts.push(<Matrix key={`m-${key++}`} rows={rows} />);
    lastIndex = match.index + match[0].length;
  }

  if (!parts.length) return <span className={className}>{text}</span>;
  if (lastIndex < text.length) parts.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex)}</Fragment>);

  return <span className={cx('whitespace-pre-line', className)}>{parts}</span>;
}
