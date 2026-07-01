import React from 'react';

// Premium dark reader palette (per the reference image / spec color direction).
export const THEMES = {
  light: { label: 'Light', pageFilter: 'none', area: '#0e1318' },
  sepia: { label: 'Sepia', pageFilter: 'sepia(0.5) saturate(1.05) brightness(0.96)', area: '#15110b' },
  dark: { label: 'Dark', pageFilter: 'invert(0.9) hue-rotate(180deg) contrast(0.95)', area: '#0b0f12' }
};

// Minimal stroke icon set (lucide-ish) so the toolbar looks premium and clean.
const P = {
  menu: 'M3 6h18M3 12h18M3 18h18',
  back: 'M15 18l-6-6 6-6',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 6l6 6-6 6',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  bookmark: 'M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z',
  note: 'M4 4h16v12l-4 4H4zM16 20v-4h4',
  expand: 'M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  close: 'M18 6L6 18M6 6l12 12',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  book: 'M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zM19 3v18'
};

export const Icon = ({ name, size = 18, className = '', strokeWidth = 1.8 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={P[name] || ''} />
  </svg>
);

// A round toolbar button.
export const IconBtn = ({ name, onClick, active, title, size = 18, children, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    aria-label={title}
    className={`grid place-items-center h-9 w-9 rounded-lg transition-colors disabled:opacity-30 ${
      active ? 'bg-gold/20 text-gold' : 'text-[#A9B1B8] hover:text-[#F5F2EA] hover:bg-white/5'
    }`}
  >
    {children || <Icon name={name} size={size} />}
  </button>
);
