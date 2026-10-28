// The ruler above the page: tick marks in centimetres (A4) or inches (US Letter), and the margin the handles set.
// Pure, so the numbers can be tested without a browser.

export type RulerUnit = 'cm' | 'in';

export const PX_PER_IN = 96;
export const PX_PER_CM = PX_PER_IN / 2.54;

/** Margins move in eighths of an inch, from a quarter inch to two inches. */
export const MARGIN_STEP = 12;
export const MARGIN_MIN = 24;
export const MARGIN_MAX = 192;

export const snapMargin = (px: number): number => Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, Math.round(px / MARGIN_STEP) * MARGIN_STEP));

export const unitFor = (size: 'a4' | 'letter'): RulerUnit => (size === 'letter' ? 'in' : 'cm');

export interface Tick {
  x: number;
  kind: 'major' | 'half' | 'minor';
  /** The number printed at a major tick. */
  label?: string;
}

/** Tick marks from the left edge of the page to `width` px: a labelled one per unit, a half mark, and minor marks. */
export function rulerTicks(width: number, unit: RulerUnit): Tick[] {
  const out: Tick[] = [];
  if (unit === 'cm') {
    const half = PX_PER_CM / 2;
    for (let i = 0; i * half <= width; i++) {
      out.push(i % 2 === 0 ? { x: i * half, kind: 'major', label: i === 0 ? undefined : String(i / 2) } : { x: i * half, kind: 'half' });
    }
    return out;
  }
  const eighth = PX_PER_IN / 8;
  for (let i = 0; i * eighth <= width; i++) {
    const kind = i % 8 === 0 ? 'major' : i % 4 === 0 ? 'half' : 'minor';
    out.push({ x: i * eighth, kind, label: kind === 'major' && i > 0 ? String(i / 8) : undefined });
  }
  return out;
}

/** A margin as the person reads it: "2.5 cm" or "1.00 in". */
export const marginLabel = (px: number, unit: RulerUnit): string => (unit === 'cm' ? `${(px / PX_PER_CM).toFixed(1)} cm` : `${(px / PX_PER_IN).toFixed(2)} in`);
