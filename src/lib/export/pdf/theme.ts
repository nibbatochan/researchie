// Design-system tokens for the PDF, from DESIGN_SYSTEM.md (light mode, because the page is paper).
// Each semantic colour has one job. Contrast on white is in the comment (4.5 passes for small text).
// Sky, green and amber fall below 4.5, so they colour SHAPES (side bars, dots, badge outlines) and the
// words next to them stay in ink.

export const COLORS = {
  // Surfaces and lines (White ramp)
  page: '#FFFFFF', // White 100: the page
  card: '#F0F1F5', // White 90: clip cards and callouts
  chip: '#E0E4EB', // White 80: type tags, table header rows
  border: '#D1D6E0', // White 70: card borders and dividers
  hairline: '#BFC6D4', // White 60: light rules
  // Text
  ink: '#0F172A', // 17.9: body text
  muted: '#667085', // 5.0: captions, dates, secondary text (Black 60)
  // Semantic roles
  primary: '#325FEC', // 5.3: brand rule on the cover, section rules and numbers
  link: '#1D4ED8', // 6.7: every clickable link, DOI and [n] marker (Citation / Deep Link)
  ai: '#7C3AED', // 5.7: AI summaries and saved assistant answers
  block: '#0284C7', // 4.1: web blocks and tables (shape colour only)
  success: '#059669', // 3.8: verified DOI badge (shape colour only)
  warning: '#D97706', // 3.2: retracted, verify source (shape colour only)
  error: '#DC2626', // 4.8: source could not be checked
} as const;

export const FONTS = {
  display: 'JetBrains Mono', // headings, section titles
  body: 'Figtree', // reading text
  mono: 'JetBrains Mono', // citations, DOIs, dates, selectors
} as const;

// The design system's type ramp, px converted to PDF points (x 0.75).
export const TYPE = {
  displayXL: { size: 24, lineHeight: 30 }, // 32/40: cover title
  headingLG: { size: 16.5, lineHeight: 21 }, // 22/28: section titles
  headingMD: { size: 12.75, lineHeight: 18 }, // 17/24: clip titles
  bodyLG: { size: 11.25, lineHeight: 16.5 }, // 15/22: syntheses
  body: { size: 10, lineHeight: 15 }, // 13.5/20: quotes and clip text
  caption: { size: 8.6, lineHeight: 12 }, // 11.5/16: tags, flags, footers
} as const;

// Page: A4 in points, with margins.
export const PAGE = { width: 595.28, height: 841.89, marginX: 54, marginTop: 64, marginBottom: 60 } as const;

export type SemanticColor = 'primary' | 'link' | 'ai' | 'block' | 'success' | 'warning' | 'error';
