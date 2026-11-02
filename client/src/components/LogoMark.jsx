/**
 * The app symbol, derived from the orbital illustration: an integral inside a
 * sage disc with an orbit ring. Simplified to the two elements that survive at
 * header size — the pastel satellite chips read as noise below ~100px.
 */
export default function LogoMark({ size = 36, className = '' }) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="36" rx="11" fill="#DDE8DC" />
      <ellipse
        cx="18"
        cy="18"
        rx="12.5"
        ry="5"
        fill="none"
        stroke="#2F5D3A"
        strokeOpacity="0.4"
        strokeWidth="1.1"
        transform="rotate(-28 18 18)"
      />
      <text
        x="18"
        y="19"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="18"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill="#2F5D3A"
      >
        ∫
      </text>
    </svg>
  );
}
