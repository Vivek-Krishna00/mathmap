const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const paths = {
  // brand / branches
  sigma: <path {...S} d="M18 5H6l6 7-6 7h12" />,
  grid: <g {...S}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></g>,
  dice: <g {...S}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /></g>,
  chart: <g {...S}><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7.5" y="12" width="3" height="5" rx="0.8" /><rect x="12.5" y="8.5" width="3" height="8.5" rx="0.8" /><rect x="17" y="5.5" width="3" height="11.5" rx="0.8" /></g>,
  curve: <g {...S}><path d="M3 19c4 0 4-12 9-12s5 12 9 12" /><path d="M3 19h18" opacity="0.35" /></g>,
  hash: <g {...S}><path d="M9 4 7.5 20M16.5 4 15 20M4.5 9h15M4 15h15" /></g>,
  nodes: <g {...S}><circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="7" r="2.4" /><circle cx="12" cy="18" r="2.4" /><path d="M8.2 7.2 15.6 7M7.4 8.1 10.8 15.6M16.6 9.2 13.3 15.8" /></g>,

  // resource types
  play: <path {...S} d="M8 5.5v13l11-6.5-11-6.5Z" />,
  doc: <g {...S}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M13 3.5V9h5M8.5 13h7M8.5 16.5h5" /></g>,
  gamepad: <g {...S}><rect x="2.5" y="7" width="19" height="10" rx="4.5" /><path d="M7.5 10.5v3M6 12h3M15.5 11.5h.01M17.8 13.5h.01" /></g>,
  flask: <g {...S}><path d="M9.5 3.5h5M10.5 3.5v5L5.5 17.5a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3L13.5 8.5v-5" /><path d="M7.6 14.5h8.8" /></g>,
  puzzle: <path {...S} d="M10 4.5a2 2 0 0 1 4 0V6h3.5a1 1 0 0 1 1 1v3.5h1.5a2 2 0 0 1 0 4H18.5V18a1 1 0 0 1-1 1H14v-1.5a2 2 0 0 0-4 0V19H6.5a1 1 0 0 1-1-1v-3.5H4a2 2 0 0 1 0-4h1.5V7a1 1 0 0 1 1-1H10V4.5Z" />,
  rocket: <g {...S}><path d="M12 3c3.5 1.5 5.5 5 5.5 9l-2.5 3H9l-2.5-3C6.5 8 8.5 4.5 12 3Z" /><circle cx="12" cy="9.5" r="1.6" /><path d="M9 15c-1.6.8-2.4 2.4-2.6 4.6 2.2-.2 3.8-1 4.6-2.6M15 15c1.6.8 2.4 2.4 2.6 4.6-2.2-.2-3.8-1-4.6-2.6" /></g>,
  cap: <g {...S}><path d="M2.8 9 12 4.5 21.2 9 12 13.5 2.8 9Z" /><path d="M6.5 11v4.2c0 .9 2.5 2.3 5.5 2.3s5.5-1.4 5.5-2.3V11" /></g>,
  book: <g {...S}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v17H5.5A1.5 1.5 0 0 1 4 18.5v-14Z" /><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v17h6.5a1.5 1.5 0 0 0 1.5-1.5v-14Z" /></g>,

  // ui
  star: <path {...S} d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6Z" />,
  sparkles: <g {...S}><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" /><path d="M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.5Z" /></g>,
  compass: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="m15.2 8.8-2 4.4-4.4 2 2-4.4 4.4-2Z" /></g>,
  map: <g {...S}><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" /><path d="M9 4v14M15 6v14" /></g>,
  route: <g {...S}><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="6" r="2.4" /><path d="M8.4 18h5.1a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7h5.1" /></g>,
  target: <g {...S}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></g>,
  clock: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g>,
  check: <path {...S} d="m5 12.5 4.5 4.5L19 7" />,
  checkCircle: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.5 2.5 4.5-5" /></g>,
  plus: <path {...S} d="M12 5v14M5 12h14" />,
  minus: <path {...S} d="M5 12h14" />,
  search: <g {...S}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></g>,
  sun: <g {...S}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></g>,
  moon: <path {...S} d="M20 14.2A8 8 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />,
  menu: <path {...S} d="M4 7h16M4 12h16M4 17h16" />,
  close: <path {...S} d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path {...S} d="m6 9 6 6 6-6" />,
  chevronRight: <path {...S} d="m9 6 6 6-6 6" />,
  chevronLeft: <path {...S} d="m15 6-6 6 6 6" />,
  arrowRight: <path {...S} d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path {...S} d="M19 12H5M11 6l-6 6 6 6" />,
  up: <path {...S} d="m6 14 6-6 6 6" />,
  down: <path {...S} d="m6 10 6 6 6-6" />,
  trash: <g {...S}><path d="M4.5 7h15M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7" /><path d="M6.5 7 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></g>,
  shield: <g {...S}><path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-2.5Z" /><path d="m9 12 2 2 4-4" /></g>,
  user: <g {...S}><circle cx="12" cy="8.2" r="3.6" /><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" /></g>,
  users: <g {...S}><circle cx="9" cy="8.4" r="3.2" /><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" /><path d="M16 5.6a3.2 3.2 0 0 1 0 6.1M17 14.4a5.5 5.5 0 0 1 3.5 5.1" /></g>,
  logout: <g {...S}><path d="M14 4.5H7a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 7 19.5h7" /><path d="M11.5 12h9M17 8.5l3.5 3.5-3.5 3.5" /></g>,
  external: <g {...S}><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M18 14v4.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" /></g>,
  edit: <g {...S}><path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5l-1 3Z" /><path d="m14.5 7.5 3 3" /></g>,
  alert: <g {...S}><path d="M12 4 21 19H3L12 4Z" /><path d="M12 10v4M12 16.8h.01" /></g>,
  info: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8.2h.01" /></g>,
  xCircle: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="m9.5 9.5 5 5M14.5 9.5l-5 5" /></g>,
  layers: <g {...S}><path d="m12 3.5 8 4.2-8 4.2-8-4.2 8-4.2Z" /><path d="m4 12.2 8 4.2 8-4.2M4 16.4l8 4.2 8-4.2" /></g>,
  signal: <g {...S}><path d="M5 19v-3M10 19v-6M15 19v-9M20 19V7" /></g>,
  filter: <path {...S} d="M4 6h16M7 12h10M10 18h4" />,
  flag: <g {...S}><path d="M6 4v16" /><path d="M6 5h10l-1.5 4L16 13H6" /></g>,
  globe: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.3 3.8 8.5S14.5 18.1 12 20.5c-2.5-2.4-3.8-5.3-3.8-8.5S9.5 5.9 12 3.5Z" /></g>,
};

export function Icon({ name, size = 20, className = '', strokeWidth, ...props }) {
  const content = paths[name];
  if (!content) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...(strokeWidth ? { strokeWidth } : null)}
      {...props}
    >
      {content}
    </svg>
  );
}

export const BRANCH_ICONS = ['sigma', 'dice', 'chart', 'curve', 'hash', 'nodes'];

export default Icon;
