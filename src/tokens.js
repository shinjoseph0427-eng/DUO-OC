// Design tokens — Base44 design system

export const C = {
  // Backgrounds
  bg:           '#0A0A0F',
  bg2:          '#1A1A1F',
  cardElevated: '#1C1C22',
  cardDeep:     '#151519',

  // Text
  white:  '#F5F5F8',
  muted:  '#8C8C96',

  // Lines
  border: '#2A2A32',

  // Brand accent
  amber:  '#F59E0B',
  rose:   '#F472B6',
  violet: '#8B5CF6',

  // Status
  success: '#10B981',
  danger:  '#EF4444',

  // Gradients
  gradientCTA:    'linear-gradient(135deg, #F59E0B, #F472B6)',
  gradientViolet: 'linear-gradient(135deg, #8B5CF6, #F472B6)',

  // ── backward-compat aliases (do not use in new code) ──
  orange:    '#F59E0B',
  gray:      '#8C8C96',
  card:      '#1C1C22',
  cardHov:   '#242428',
  warm:      '#F5F5F8',
  gray2:     '#2A2A32',
  green:     '#10B981',
  red:       '#EF4444',
  orangeT12: 'rgba(245,158,11,0.12)',
  orangeT15: 'rgba(245,158,11,0.15)',
  orangeT10: 'rgba(245,158,11,0.10)',
  orangeT30: 'rgba(245,158,11,0.30)',
  orangeT40: 'rgba(245,158,11,0.40)',
  orangeT08: 'rgba(245,158,11,0.08)',
  greenT08:  'rgba(16,185,129,0.08)',
  greenT12:  'rgba(16,185,129,0.12)',
  greenT20:  'rgba(16,185,129,0.20)',
  greenT30:  'rgba(16,185,129,0.30)',
};

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #FBBF24, #F97316)',
  'linear-gradient(135deg, #FB7185, #F472B6)',
  'linear-gradient(135deg, #A78BFA, #8B5CF6)',
  'linear-gradient(135deg, #60A5FA, #6366F1)',
  'linear-gradient(135deg, #2DD4BF, #10B981)',
  'linear-gradient(135deg, #4ADE80, #14B8A6)',
  'linear-gradient(135deg, #38BDF8, #3B82F6)',
  'linear-gradient(135deg, #22D3EE, #0EA5E9)',
  'linear-gradient(135deg, #FB923C, #F59E0B)',
  'linear-gradient(135deg, #F87171, #F97316)',
  'linear-gradient(135deg, #F472B6, #F43F5E)',
  'linear-gradient(135deg, #E879F9, #F472B6)',
];

export const F = {
  // backward-compat — Inter is set globally in index.css
  family: "'Inter', system-ui, -apple-system, Roboto, sans-serif",

  display:  { fontSize: 52, fontWeight: 800, letterSpacing: '-2px',   lineHeight: 1.1  },
  titleXl:  { fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.15 },
  titleLg:  { fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2  },
  titleMd:  { fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.25 },
  bodyLg:   { fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
  bodySm:   { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  label:    { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',  textTransform: 'uppercase' },
  micro:    { fontSize: 11, fontWeight: 500, letterSpacing: '0.5px'  },
};

export const R = {
  sm:   12,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  20,
  pill: 9999,
  full: '9999px',
};

export const S = {
  micro: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48, hero: 64,
};

export const APP_MAX_WIDTH = 448;
