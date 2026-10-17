// Geometry for canvas items that can be rotated and resized. Pure functions, no React.
// A box is stored as its unrotated top-left corner plus a rotation in degrees. It rotates around its
// centre, so moving the box never changes how it looks and rotating never moves its centre.

export type Port = 'top' | 'bottom' | 'left' | 'right';
export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Point {
  x: number;
  y: number;
}

export const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function rotatePoint(p: Point, center: Point, deg: number): Point {
  if (!deg) return { x: p.x, y: p.y };
  const r = toRadians(deg);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function boxCenter(b: Box): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** The four corners after rotation: top-left, top-right, bottom-right, bottom-left. */
export function boxCorners(b: Box): Point[] {
  const c = boxCenter(b);
  const rot = b.rotation || 0;
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ].map((p) => rotatePoint(p, c, rot));
}

/** The smallest axis-aligned rectangle that holds the rotated box. */
export function boxBounds(b: Box): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = boxCorners(b).map((p) => p.x);
  const ys = boxCorners(b).map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Where a connector port sits on the box, after rotation. */
export function portPoint(b: Box, port: Port): Point {
  const c = boxCenter(b);
  const local: Point =
    port === 'top'
      ? { x: c.x, y: b.y }
      : port === 'bottom'
        ? { x: c.x, y: b.y + b.height }
        : port === 'left'
          ? { x: b.x, y: c.y }
          : { x: b.x + b.width, y: c.y };
  return rotatePoint(local, c, b.rotation || 0);
}

export interface ResizeOptions {
  minWidth?: number;
  minHeight?: number;
  /** Keep the width to height ratio. Only used by corner handles. */
  keepAspect?: boolean;
}

/**
 * Resize a box by dragging one handle. deltaX and deltaY are how far the pointer moved on the canvas
 * (screen axes, already divided by zoom). The handle opposite the one being dragged stays where it is
 * on the canvas, also when the box is rotated.
 */
export function resizeBox(initial: Box, dir: ResizeDirection, deltaX: number, deltaY: number, opts: ResizeOptions = {}): Box {
  const minW = opts.minWidth ?? 8;
  const minH = opts.minHeight ?? 8;
  const rot = initial.rotation || 0;
  const r = toRadians(rot);
  const cos = Math.cos(r);
  const sin = Math.sin(r);

  // The pointer movement in the box's own axes.
  const dx = deltaX * cos + deltaY * sin;
  const dy = -deltaX * sin + deltaY * cos;

  const iw = initial.width;
  const ih = initial.height;
  let w = iw;
  let h = ih;
  if (dir.includes('e')) w = iw + dx;
  if (dir.includes('w')) w = iw - dx;
  if (dir.includes('s')) h = ih + dy;
  if (dir.includes('n')) h = ih - dy;

  if (opts.keepAspect && dir.length === 2 && iw > 0 && ih > 0) {
    const s = Math.max(w / iw, h / ih);
    w = iw * s;
    h = ih * s;
  }

  w = Math.max(minW, w);
  h = Math.max(minH, h);
  if (opts.keepAspect && dir.length === 2 && iw > 0 && ih > 0) {
    // After clamping, bring the other side back to the ratio.
    const s = Math.max(w / iw, h / ih);
    w = iw * s;
    h = ih * s;
  }

  // The anchor is the side or corner opposite the handle, as an offset from the centre in box axes.
  const axOld = dir.includes('e') ? -iw / 2 : dir.includes('w') ? iw / 2 : 0;
  const ayOld = dir.includes('s') ? -ih / 2 : dir.includes('n') ? ih / 2 : 0;
  const axNew = dir.includes('e') ? -w / 2 : dir.includes('w') ? w / 2 : 0;
  const ayNew = dir.includes('s') ? -h / 2 : dir.includes('n') ? h / 2 : 0;

  const c0 = boxCenter(initial);
  const anchorX = c0.x + axOld * cos - ayOld * sin;
  const anchorY = c0.y + axOld * sin + ayOld * cos;
  const cx = anchorX - (axNew * cos - ayNew * sin);
  const cy = anchorY - (axNew * sin + ayNew * cos);

  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rotation: rot };
}

/** Angle in degrees of the line from the centre to a point. 0 is to the right, 90 is down. */
export function angleFrom(center: Point, p: Point): number {
  return (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
}

/** Wrap an angle into the range -180 to 180. */
export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step;
}
