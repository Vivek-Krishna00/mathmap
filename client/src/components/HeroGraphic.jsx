import { cx } from './ui.jsx';

/**
 * Decorative hero illustration: maths symbols orbiting a central integral.
 *
 * Drawn as inline SVG rather than an image so it stays crisp at any size, follows
 * the theme's line colour, and adds nothing to the bundle.
 */
export default function HeroGraphic({ className }) {
  return (
    <div className={cx('w-full max-w-md', className)} aria-hidden="true">
      <svg viewBox="0 0 420 420" className="w-full h-auto" focusable="false">
        {/* orbits — muted rather than `line`, so they stay visible in dark mode too */}
        <g fill="none" stroke="rgb(var(--c-muted))" strokeWidth="1.2" opacity="0.4">
          <ellipse cx="210" cy="210" rx="188" ry="70" transform="rotate(-28 210 210)" />
          <ellipse cx="210" cy="210" rx="188" ry="70" transform="rotate(28 210 210)" />
          <ellipse cx="210" cy="210" rx="150" ry="150" opacity="0.6" />
        </g>

        {/* centre */}
        <circle cx="210" cy="210" r="76" fill="#DDE8DC" />
        <text
          x="210"
          y="212"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="80"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#2F5D3A"
        >
          ∫
        </text>

        {/* pi */}
        <circle cx="92" cy="96" r="34" fill="#F6DED4" />
        <text
          x="92"
          y="98"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="34"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#8C5A4A"
        >
          π
        </text>

        {/* sigma */}
        <circle cx="338" cy="176" r="32" fill="#E2DDF2" />
        <text
          x="338"
          y="178"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="32"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#5B4B9E"
        >
          Σ
        </text>

        {/* infinity */}
        <circle cx="104" cy="308" r="32" fill="#F7F2CC" />
        <text
          x="104"
          y="310"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="34"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#B8A93A"
        >
          ∞
        </text>

        {/* accents */}
        <g stroke="#A85B41" strokeWidth="3" strokeLinecap="round">
          <path d="M330 66v30M315 81h30M319.5 70.5l21 21M340.5 70.5l-21 21" />
        </g>
        <circle cx="318" cy="318" r="6" fill="#5F6B4A" />
      </svg>
    </div>
  );
}
