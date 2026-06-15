/**
 * UI Scale — glove-friendly sizing constants and helpers.
 *
 * Hockey players log sets with gloves on. Every interactive element
 * must hit ≥ 48 px (WCAG 2.5.5) with the LOG button and zone selectors
 * reaching the 72 px "glove target" for reliable one-tap interaction.
 */

// ── Touch targets ─────────────────────────────────────────────────────────────
export const TOUCH = {
  /** WCAG minimum — bare-finger safe */
  min:   48,
  /** Recommended for hockey gloves */
  glove: 72,
  /** Zone LOG button height */
  logBtn: 52,
  /** Tab-bar item minimum width */
  tabW:   52,
  /** Tab-bar total height */
  tabH:   56,
}

// ── Typography scale (px) ────────────────────────────────────────────────────
export const FONT = {
  tiny:    9,
  micro:   10,
  label:   11,
  caption: 12,
  small:   13,
  body:    14,
  subhead: 16,
  title:   20,
  heading: 24,
  display: 32,
  hero:    42,
}

// ── Spacing (px) ─────────────────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
}

// ── Border radii (px) ────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
}

// ── Max content width (mobile-first) ─────────────────────────────────────────
export const MAX_W = {
  content: 480,
  modal:   420,
  wide:    520,
}

// ── Colour palette (authoritative reference for service-layer consumers) ──────
export const COLOR = {
  bg:        '#0a0f1a',
  bgCard:    '#1e293b',
  bgDeep:    '#0f172a',
  border:    '#334155',
  borderFaint: '#1e3a5f',
  textPrimary:   '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted:     '#94a3b8',
  textDim:       '#6b7280',
  accent:  '#3b82f6',
  accentLt:'#60a5fa',
  success: '#34d399',
  warning: '#f59e0b',
  danger:  '#ef4444',
  fire:    '#f97316',
  ice:     '#60a5fa',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns inline-style for a glove-friendly button.
 * Minimum hit area is TOUCH.glove × TOUCH.glove.
 */
export function gloveBtnStyle(bg = COLOR.accent, color = '#fff') {
  return {
    minHeight:     TOUCH.glove,
    padding:       `${SPACE.md}px ${SPACE.lg}px`,
    background:    bg,
    color,
    border:        'none',
    borderRadius:  RADIUS.lg,
    fontFamily:    "'Barlow Condensed',sans-serif",
    fontWeight:    700,
    fontSize:      FONT.subhead,
    cursor:        'pointer',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    gap:           SPACE.sm,
    userSelect:    'none',
    WebkitTapHighlightColor: 'transparent',
  }
}

/**
 * Returns inline-style for a tight secondary button (tab, filter pill).
 * Still meets TOUCH.min.
 */
export function compactBtnStyle(active = false) {
  return {
    minHeight:  TOUCH.min,
    padding:    `${SPACE.sm}px ${SPACE.md}px`,
    background: active ? '#1e3a5f' : '#0a0f1a',
    color:      active ? COLOR.accentLt : COLOR.textMuted,
    border:     `1px solid ${active ? COLOR.accent : COLOR.border}`,
    borderRadius: RADIUS.md,
    fontFamily: "'Barlow Condensed',sans-serif",
    fontWeight: 700,
    fontSize:   FONT.label,
    cursor:     'pointer',
    letterSpacing: '0.04em',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }
}

/** CSS string for smooth momentum scrolling on iOS */
export const SCROLL_CSS = `
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
`
