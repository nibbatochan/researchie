// Page layout for the paper sheet: fixed A4 or Letter pages with a grey gap between them, and content that flows from
// one page to the next (micro changes, step 3). Pure: no DOM. The editor measures each block and passes the numbers
// in; this module says how far each block must move down (its padding-top) so that no block crosses a page's
// bottom margin, and a page-break block starts the next block on a new page.

export type PageSize = 'a4' | 'letter';
export type Margin = 'narrow' | 'normal' | 'wide';

export interface Geometry {
  /** Page height in px at 96 dpi (A4 is 1123, Letter 1056). */
  H: number;
  /** Gap between pages in px. */
  G: number;
  /** Page height plus gap: where one page starts and the next begins. */
  S: number;
  /** Top margin, and bottom margin (equal here), in px. */
  top: number;
  bottom: number;
}

/** `gap` is the grey space between pages on screen; printing uses 0 so the pages follow each other exactly. */
export function pageGeometry(size: PageSize, margin: Margin, marginPx?: number | null, gap = 24): Geometry {
  const H = size === 'letter' ? 1056 : 1123;
  const G = gap;
  const top = marginPx && marginPx > 0 ? marginPx : { narrow: 48, normal: 96, wide: 120 }[margin];
  return { H, G, S: H + G, top, bottom: top };
}

/** A measured block: where its border starts now, its height, its current padding-top, and whether it starts a page. */
export interface MeasuredBlock {
  top: number;
  height: number;
  pad: number;
  breakBefore?: boolean;
  /** A heading: it stays on the same page as the start of the block after it. */
  keepWithNext?: boolean;
  /**
   * For a text block that may be taller than a page: its lines, top and bottom in px from the top of its text, as if no
   * split gap were in it. When such a block is taller than a page it is split at line boundaries across pages.
   */
  lines?: Array<{ top: number; bottom: number }>;
  /** The height of the split gaps the block has now (they are in `height`). */
  extras?: number;
}

/** A gap put before line `line` of a block so that the line starts the next page. */
export interface Split {
  line: number;
  height: number;
}

export interface Layout {
  /** New padding-top for each block, in px (0 when nothing moves). */
  pads: number[];
  /** Where each block's border starts once the pads are applied. */
  tops: number[];
  /** True for a block taller than a page's text area: it can not fit anywhere and runs past the page edge. */
  tall: boolean[];
  /** For a block with `lines` taller than a page: where to put gaps. Empty for every other block. */
  splits: Split[][];
}

export const pageStart = (page: number, g: Geometry) => page * g.S;
export const contentStart = (page: number, g: Geometry) => page * g.S + g.top;
export const contentLimit = (page: number, g: Geometry) => page * g.S + g.H - g.bottom;
export const pageOf = (y: number, g: Geometry) => Math.max(0, Math.floor(y / g.S));

/**
 * How far each block moves down. Blocks are processed in order; each one is moved onto the next page when its content
 * would run past the bottom margin, when it starts inside a top or bottom margin, or when it follows a page break.
 * A block taller than a page is left where it starts (it can not be split here) rather than pushed forever, and is
 * reported in `tall` so the editor can say so. A heading also needs room for the start of the block after it.
 */
export function layoutPages(blocks: MeasuredBlock[], g: Geometry): Layout {
  let oldPads = 0; // pads the blocks above had before this pass
  let newPads = 0; // pads the blocks above get now
  const pads: number[] = [];
  const tops: number[] = [];
  const tall: boolean[] = [];
  const splits: Split[][] = [];
  const area = g.H - g.top - g.bottom;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    const naturalContent = Math.max(0, b.height - b.pad - (b.extras ?? 0));
    if (b.lines && b.lines.length > 0 && naturalContent > area) {
      // a long text block: it starts where it is and is split line by line, instead of being pushed to a page of its own
      const y0 = b.top - oldPads + newPads;
      let start = y0;
      const p0 = pageOf(start, g);
      const local = start - pageStart(p0, g);
      if (local < g.top) start = contentStart(p0, g);
      else if (local >= g.H) start = contentStart(p0 + 1, g);
      if (b.breakBefore && start > contentStart(pageOf(start, g), g) + 0.5) start = contentStart(pageOf(start, g) + 1, g);
      const here: Split[] = [];
      let shift = 0;
      b.lines.forEach((line, k) => {
        const lt = start + shift + line.top;
        const lb = start + shift + line.bottom;
        const pg = pageOf(lt, g);
        if (lb > contentLimit(pg, g) && lt > contentStart(pg, g) + 0.5) {
          const h = contentStart(pg + 1, g) - lt;
          shift += h;
          here.push({ line: k, height: h });
        }
      });
      const pad = Math.max(0, start - y0);
      oldPads += b.pad + (b.extras ?? 0);
      newPads += pad + shift;
      pads.push(pad);
      tops.push(y0);
      tall.push(false);
      splits.push(here);
      continue;
    }
    // where the border would start if no block above had any pad, then with this pass's pads
    const y0 = b.top - oldPads + newPads;
    const content = Math.max(0, b.height - b.pad);
    let start = y0;
    const p0 = pageOf(start, g);
    const local = start - pageStart(p0, g);
    if (local < g.top) start = contentStart(p0, g); // in the top margin
    else if (local >= g.H) start = contentStart(p0 + 1, g); // in the gap, which belongs to the next page
    const p = pageOf(start, g);
    const need = b.keepWithNext && next ? Math.min(next.height - next.pad, 48) : 0; // at least a couple of lines of what follows
    const fits = start + content + need <= contentLimit(p, g);
    const alreadyAtTop = start <= contentStart(p, g) + 0.5;
    if (!fits && !alreadyAtTop) start = contentStart(p + 1, g);
    if (b.breakBefore && start > contentStart(pageOf(start, g), g) + 0.5) start = contentStart(pageOf(start, g) + 1, g);
    const pad = Math.max(0, start - y0);
    oldPads += b.pad;
    newPads += pad;
    pads.push(pad);
    tops.push(y0);
    tall.push(content > area);
    splits.push([]);
  }
  return { pads, tops, tall, splits };
}

/** How many pages the content takes, given the bottom of the content in px. At least one. */
export function pageCount(contentBottom: number, g: Geometry): number {
  return Math.max(1, Math.floor((contentBottom - 1) / g.S) + 1);
}
