// The editor's schema and guards (design note section 2.2). Node names and attributes are the ones docModel.ts writes.
// Rendering is plain DOM with data-* attributes, so copy and paste inside the editor keeps the nodes (section 8).
//   - A citation or quote draws its marker from a decoration (data-marker), computed from the cite map outside
//     the document, so switching style never touches the text.
//   - Nothing is locked: a template's sections, their headings and the blocks around the text can all be changed or
//     deleted, because a real paper rarely matches the template (owner feedback, 2026-10-22). A section's heading
//     is optional.
import { Node, Mark, Extension, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Mathematics } from '@tiptap/extension-mathematics';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNodeType } from '@tiptap/pm/model';
import { CLIP_MIME, CITE_MIME } from '../dnd.ts';

const attr = (name: string, def: unknown = '') => ({ default: def, parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name.toLowerCase()}`) ?? def, renderHTML: (a: Record<string, unknown>) => ({ [`data-${name.toLowerCase()}`]: a[name] as string }) });
const boolAttr = (name: string) => ({ default: false, parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name.toLowerCase()}`) === 'true', renderHTML: (a: Record<string, unknown>) => ({ [`data-${name.toLowerCase()}`]: String(Boolean(a[name])) }) });

export const Doc = Node.create({ name: 'doc', topNode: true, content: 'section+ unplaced?' });

export const Section = Node.create({
  name: 'section',
  content: 'sectionHeading? block*',
  isolating: true,
  defining: true,
  addAttributes() {
    return { id: attr('id'), key: attr('key'), locked: boolAttr('locked'), point: attr('point'), done: boolAttr('done'), aiAssisted: boolAttr('aiAssisted'), columns: attr('columns') };
  },
  parseHTML: () => [{ tag: 'section[data-section]' }],
  renderHTML: ({ HTMLAttributes }) => ['section', mergeAttributes(HTMLAttributes, { 'data-section': '', class: 'paper-section' }), 0],
});

export const SectionHeading = Node.create({
  name: 'sectionHeading',
  content: 'text*',
  marks: '',
  defining: true,
  parseHTML: () => [{ tag: 'h2[data-section-heading]' }],
  renderHTML: ({ HTMLAttributes }) => ['h2', mergeAttributes(HTMLAttributes, { 'data-section-heading': '', class: 'paper-h1' }), 0],
});

export const Quote = Node.create({
  name: 'quote',
  group: 'block',
  content: 'text*',
  defining: true,
  addAttributes() {
    return { clipId: attr('clipId'), page: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-page'), renderHTML: (a: Record<string, unknown>) => (a.page ? { 'data-page': String(a.page) } : {}) } };
  },
  parseHTML: () => [{ tag: 'blockquote[data-quote]' }],
  renderHTML: ({ HTMLAttributes }) => ['blockquote', mergeAttributes(HTMLAttributes, { 'data-quote': '', class: 'paper-quote' }), 0],
});

export const ClipNote = Node.create({
  name: 'clipNote',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { clipId: attr('clipId') };
  },
  parseHTML: () => [{ tag: 'div[data-clip-note]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-clip-note': '', class: 'paper-clipnote' }), 'An AI summary is in the text here. Rewrite it from the source.'],
});

export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      keys: {
        default: [] as string[],
        parseHTML: (el: HTMLElement) => (el.getAttribute('data-cite-keys') ?? '').split(';').filter(Boolean),
        renderHTML: (a: Record<string, unknown>) => ({ 'data-cite-keys': ((a.keys as string[]) ?? []).join(';') }),
      },
      locator: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-locator'), renderHTML: (a: Record<string, unknown>) => (a.locator ? { 'data-locator': String(a.locator) } : {}) },
    };
  },
  parseHTML: () => [{ tag: 'span[data-cite-keys]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: 'paper-cite' })],
});

/** Fired on window when the project's clips change, so figure views read their pictures again. */
export const CLIPS_CHANGED = 'paper:clips-changed';
/** Clip id to picture (data URL) for every image clip in the project. Figure views read it when they paint. */
export const figureSources = new Map<string, string>();

/**
 * An image from a clip. The paper holds the clip id, the caption and the width, never the picture: the picture is read
 * from the clip when the page is drawn. Nothing else is printed in the box (no label, no placeholder text).
 */
export const Figure = Node.create<{ imageFor: (clipId: string) => string | null }>({
  name: 'figure',
  group: 'block',
  atom: true,
  selectable: true,
  addOptions() {
    return { imageFor: () => null };
  },
  addAttributes() {
    return { clipId: attr('clipId'), caption: attr('caption'), alt: attr('alt'), width: attr('width', null) };
  },
  parseHTML: () => [{ tag: 'figure[data-figure]' }],
  renderHTML: ({ node, HTMLAttributes }) => ['figure', mergeAttributes(HTMLAttributes, { 'data-figure': '', class: 'paper-figure' }), ['figcaption', {}, String(node.attrs.caption || '')]],
  addNodeView() {
    const imageFor = this.options.imageFor;
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement('figure');
      dom.setAttribute('data-figure', '');
      dom.className = 'paper-figure';
      const box = document.createElement('div');
      box.className = 'paper-figure-frame';
      const img = document.createElement('img');
      img.className = 'paper-figure-img';
      const handle = document.createElement('span');
      handle.className = 'paper-figure-handle';
      handle.setAttribute('aria-label', 'Drag to resize');
      box.append(img, handle);
      const caption = document.createElement('figcaption');
      dom.append(box, caption);

      const paint = (n: typeof node) => {
        const src = figureSources.get(String(n.attrs.clipId ?? '')) ?? null;
        if (src) {
          img.src = src;
          img.alt = String(n.attrs.alt ?? '');
          img.hidden = false;
        } else {
          img.removeAttribute('src');
          img.hidden = true;
        }
        if (n.attrs.width) img.style.width = `${n.attrs.width}px`;
        else img.style.removeProperty('width');
        caption.textContent = String(n.attrs.caption ?? '');
        caption.hidden = !n.attrs.caption;
      };
      paint(node);
      const refresh = () => paint(current);
      window.addEventListener(CLIPS_CHANGED, refresh);

      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = img.getBoundingClientRect().width;
        let width = startW;
        const move = (ev: PointerEvent) => {
          width = Math.max(40, Math.round(startW + ev.clientX - startX));
          img.style.width = `${width}px`;
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          const pos = getPos();
          if (typeof pos !== 'number') return;
          editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, width }));
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });

      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'figure') return false;
          current = updated;
          paint(updated);
          return true;
        },
        stopEvent: (event) => handle.contains(event.target as globalThis.Node),
        ignoreMutation: () => true,
        destroy: () => window.removeEventListener(CLIPS_CHANGED, refresh),
      };
    };
  },
});

export const TableFigure = Node.create({
  name: 'tableFigure',
  group: 'block',
  content: 'table',
  isolating: true,
  addAttributes() {
    return { clipId: attr('clipId'), caption: attr('caption') };
  },
  parseHTML: () => [{ tag: 'figure[data-table-figure]' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', mergeAttributes(HTMLAttributes, { 'data-table-figure': '', class: 'paper-table-figure' }), 0],
});

export const Unplaced = Node.create({
  name: 'unplaced',
  content: 'block*',
  isolating: true,
  parseHTML: () => [{ tag: 'aside[data-unplaced]' }],
  renderHTML: ({ HTMLAttributes }) => ['aside', mergeAttributes(HTMLAttributes, { 'data-unplaced': '', class: 'paper-unplaced' }), 0],
});

// ───────────────────────────── pages ─────────────────────────────

/** A hard page break: the block after it starts a new page. It takes no height itself. */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-page-break]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': '', class: 'paper-page-break', contenteditable: 'false' })],
});

// ──────────────────────────── columns ────────────────────────────

/** Widths are stored as shares ("1,1,1"); the grid and the dividers both read them. */
const parseWidths = (raw: unknown, n: number): number[] => {
  const w = String(raw ?? '').split(',').map(Number);
  return w.length === n && w.every((x) => x > 0) ? w : Array.from({ length: n }, () => 1);
};
const gridOf = (w: number[]) => w.map((x) => `${x}fr`).join(' ');

/** One column of a Columns block. Holds ordinary blocks (headings too, so the Style menu works in a column); no columns inside columns. */
export const Column = Node.create({
  name: 'column',
  content: '(paragraph | heading | figure | quote | bulletList | orderedList)+',
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-column]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-column': '', class: 'paper-column' }), 0],
});

/** Two to six columns side by side. Drag a divider to change the widths; text and pictures reflow to fit. */
export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,6}',
  isolating: true,
  addAttributes() {
    return { widths: { default: '', parseHTML: (el: HTMLElement) => el.getAttribute('data-widths') ?? '', renderHTML: (a: Record<string, unknown>) => ({ 'data-widths': String(a.widths ?? '') }) } };
  },
  parseHTML: () => [{ tag: 'div[data-columns]' }],
  renderHTML: ({ node, HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-columns': '', class: 'paper-columns', style: `grid-template-columns:${gridOf(parseWidths(node.attrs.widths, node.childCount))}` }), 0],
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement('div');
      dom.className = 'paper-columns-wrap';
      const grid = document.createElement('div');
      grid.setAttribute('data-columns', '');
      grid.className = 'paper-columns';
      const dividers = document.createElement('div');
      dividers.className = 'paper-columns-dividers';
      dividers.contentEditable = 'false';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'paper-columns-delete';
      remove.contentEditable = 'false';
      remove.title = 'Delete these columns';
      remove.setAttribute('aria-label', 'Delete these columns');
      remove.setAttribute('data-testid', 'columns-delete');
      remove.innerHTML = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Zm48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Z"/></svg>';
      remove.addEventListener('mousedown', (e) => e.preventDefault());
      remove.addEventListener('click', () => {
        const pos = getPos();
        if (typeof pos !== 'number') return;
        let hasFigure = false;
        current.descendants((n) => { if (n.type.name === 'figure') hasFigure = true; return !hasFigure; });
        if ((current.textContent.trim() || hasFigure) && !window.confirm('Delete these columns and everything in them? You can undo it with Ctrl+Z.')) return;
        editor.view.dispatch(closeHistory(editor.state.tr));
        editor.view.dispatch(closeHistory(editor.state.tr.delete(pos, pos + current.nodeSize)).scrollIntoView());
        editor.view.focus();
      });
      dom.append(grid, dividers, remove);
      dom.setAttribute('data-widths', String(node.attrs.widths ?? ''));

      let widths = parseWidths(node.attrs.widths, node.childCount);
      const paint = () => {
        grid.style.gridTemplateColumns = gridOf(widths);
        const total = widths.reduce((a, b) => a + b, 0);
        dividers.replaceChildren();
        let acc = 0;
        for (let i = 0; i < widths.length - 1; i++) {
          acc += widths[i];
          const d = document.createElement('span');
          d.className = 'paper-columns-divider';
          d.style.left = `${(acc / total) * 100}%`;
          d.setAttribute('role', 'separator');
          d.setAttribute('aria-orientation', 'vertical');
          d.setAttribute('aria-label', 'Resize the columns: drag, or use the left and right arrow keys');
          d.tabIndex = 0;
          d.title = 'Drag to resize the columns';
          d.addEventListener('pointerdown', (e) => drag(e, i));
          d.addEventListener('keydown', (e) => nudge(e, i));
          dividers.append(d);
        }
      };
      const commit = () => {
        const pos = getPos();
        if (typeof pos !== 'number') return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, widths: widths.map((w) => Math.round(w * 1000) / 1000).join(',') }));
      };
      /** Moves divider i by `by` (a share of the row) between its two neighbours, keeping each at least a tenth. */
      const shift = (start: number[], i: number, by: number) => {
        const total = start.reduce((a, b) => a + b, 0);
        const pair = start[i] + start[i + 1];
        const left = Math.min(pair - total * 0.1, Math.max(total * 0.1, start[i] + by));
        const next = start.slice();
        next[i] = left;
        next[i + 1] = pair - left;
        return next;
      };
      const nudge = (e: KeyboardEvent, i: number) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const total = widths.reduce((a, b) => a + b, 0);
        widths = shift(widths, i, (e.key === 'ArrowRight' ? 1 : -1) * total * 0.05);
        paint();
        commit();
        (dividers.children[i] as HTMLElement | undefined)?.focus();
      };
      const drag = (e: PointerEvent, i: number) => {
        e.preventDefault();
        const box = grid.getBoundingClientRect();
        const total = widths.reduce((a, b) => a + b, 0);
        const start = widths.slice();
        const x0 = e.clientX;
        dom.classList.add('paper-columns-dragging');
        const move = (ev: PointerEvent) => {
          widths = shift(start, i, ((ev.clientX - x0) / box.width) * total);
          paint();
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          dom.classList.remove('paper-columns-dragging');
          commit();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      };
      paint();

      return {
        dom,
        contentDOM: grid,
        update(updated) {
          if (updated.type.name !== 'columns') return false;
          current = updated;
          dom.setAttribute('data-widths', String(updated.attrs.widths ?? ''));
          widths = parseWidths(updated.attrs.widths, updated.childCount);
          paint();
          return true;
        },
        ignoreMutation: (m) => dividers.contains(m.target as globalThis.Node) || remove.contains(m.target as globalThis.Node) || (m.type === 'attributes' && (m.target === grid || m.target === dom)),
        stopEvent: (event) => dividers.contains(event.target as globalThis.Node) || remove.contains(event.target as globalThis.Node),
      };
    };
  },
});

// ───────────────────────────── find and replace ─────────────────────────────

/** Set on a transaction that carries the matches of a search: `{ matches: Array<{from, to}>, current: number }`. */
export const FIND_META = 'paperFind';
const findKey = new PluginKey<DecorationSet>('paperFind');

/** Marks the matches of the find bar on the page, the current one in a stronger colour. They follow ordinary edits. */
export const FindHighlight = Extension.create({
  name: 'findHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const found = tr.getMeta(FIND_META) as { matches: Array<{ from: number; to: number }>; current: number } | undefined;
            if (!found) return set.map(tr.mapping, tr.doc);
            return DecorationSet.create(tr.doc, found.matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === found.current ? 'paper-find paper-find-current' : 'paper-find' })));
          },
        },
        props: { decorations: (state) => findKey.getState(state) },
      }),
    ];
  },
});

/** Set on a transaction that carries the padding each block needs to flow onto the next page (see paginate.ts). */
export const PAGINATION_META = 'paperPagination';

/** A section that ends in a formula, picture or table gets an empty paragraph after it, so the caret can go below it. */
const TEXT_ENDINGS = new Set(['paragraph', 'heading', 'sectionHeading', 'quote', 'bulletList', 'orderedList']);
export const TrailingText = Extension.create({
  name: 'trailingText',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        // once when the editor opens, so papers saved before this rule get their trailing paragraphs too
        view: (view) => {
          const t = setTimeout(() => { if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta('trailingCheck', true)); }, 0);
          return { destroy: () => clearTimeout(t) };
        },
        appendTransaction(trs, _old, state) {
          if (!trs.some((t) => t.docChanged || t.getMeta('trailingCheck'))) return null;
          const tr = state.tr;
          state.doc.forEach((section, pos) => {
            if (section.type.name !== 'section') return;
            const last = section.lastChild;
            if (!last || TEXT_ENDINGS.has(last.type.name)) return;
            tr.insert(tr.mapping.map(pos + section.nodeSize - 1), state.schema.nodes.paragraph.create());
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
/** `splits` are gaps inside a long text block: `at` is the document position of a line start, `height` the gap in px. */
export type PadEntry = { pos: number; pad: number; tall?: boolean; splits?: Array<{ at: number; height: number }> };

function splitGap(height: number): HTMLElement {
  const el = document.createElement('span');
  el.className = 'paper-split';
  el.setAttribute('data-split', String(Math.round(height * 100) / 100));
  el.contentEditable = 'false';
  el.style.height = `${height}px`;
  return el;
}
const paginationKey = new PluginKey<DecorationSet>('pagination');

/**
 * Moves blocks down with a padding-top decoration. The editor measures and computes the pads; this plugin only holds
 * them, and maps them through ordinary edits so they stay on the same blocks until the next measurement.
 */
export const Pagination = Extension.create({
  name: 'pagination',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const pads = tr.getMeta(PAGINATION_META) as PadEntry[] | undefined;
            if (!pads) return set.map(tr.mapping, tr.doc);
            const decos: Decoration[] = [];
            for (const e of pads) {
              if (e.pad > 0.5 || e.tall) decos.push(Decoration.node(e.pos, e.pos + (tr.doc.nodeAt(e.pos)?.nodeSize ?? 0), { ...(e.pad > 0.5 ? { style: `padding-top: ${e.pad}px` } : {}), ...(e.tall ? { class: 'paper-oversize' } : {}) }));
              for (const sp of e.splits ?? []) decos.push(Decoration.widget(sp.at, () => splitGap(sp.height), { side: -1, key: `split-${sp.at}-${Math.round(sp.height)}`, ignoreSelection: true }));
            }
            return DecorationSet.create(tr.doc, decos);
          },
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state);
          },
        },
      }),
    ];
  },
});

// ───────────────────────────── formatting ─────────────────────────────

/** Font sizes, in points, the toolbar offers. The sheet is drawn at real page size, so 10 is 10 pt as on paper. */
export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18] as const;

/** A run of text at its own size. Whole paragraphs get their size from their style instead (see format.ts). */
export const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return { size: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-size'), renderHTML: (a: Record<string, unknown>) => (a.size ? { 'data-size': String(a.size) } : {}) } };
  },
  parseHTML: () => [{ tag: 'span[data-size]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: 'paper-fs' }), 0],
});

/** The typefaces a run of text can take. Only these are stored, so a font pasted from elsewhere never gets in. */
export const FONT_FAMILIES = [
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'georgia', label: 'Georgia', css: "Georgia, 'Times New Roman', serif" },
  { id: 'times', label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  { id: 'verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { id: 'courier', label: 'Courier New', css: "'Courier New', Courier, monospace" },
] as const;

/** A run of text in its own typeface. The rest of the paper keeps the paper's typeface (Front matter panel). */
export const FontFamilyMark = Mark.create({
  name: 'fontFamily',
  addAttributes() {
    return { family: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-font'), renderHTML: (a: Record<string, unknown>) => (a.family ? { 'data-font': String(a.family) } : {}) } };
  },
  parseHTML: () => [{ tag: 'span[data-font]', getAttrs: (el) => (FONT_FAMILIES.some((f) => f.id === (el as HTMLElement).getAttribute('data-font')) ? null : false) }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: 'paper-ff' }), 0],
});

export const HIGHLIGHTS = [
  { id: 'yellow', label: 'Yellow', hex: '#FEF08A' },
  { id: 'green', label: 'Green', hex: '#BBF7D0' },
  { id: 'blue', label: 'Blue', hex: '#BFDBFE' },
  { id: 'pink', label: 'Pink', hex: '#FBCFE8' },
  { id: 'orange', label: 'Orange', hex: '#FED7AA' },
] as const;

/** A highlighted run of text, in one of five colours. */
export const HighlightMark = Mark.create({
  name: 'highlight',
  addAttributes() {
    return { color: { default: 'yellow', parseHTML: (el: HTMLElement) => el.getAttribute('data-hl'), renderHTML: (a: Record<string, unknown>) => ({ 'data-hl': String(a.color || 'yellow') }) } };
  },
  parseHTML: () => [{ tag: 'mark[data-hl]', getAttrs: (el) => (HIGHLIGHTS.some((h) => h.id === (el as HTMLElement).getAttribute('data-hl')) ? null : false) }],
  renderHTML: ({ HTMLAttributes }) => ['mark', mergeAttributes(HTMLAttributes, { class: 'paper-hl' }), 0],
});

const dataAttr = (name: string) => ({
  default: null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`),
  renderHTML: (a: Record<string, unknown>) => (a[name] ? { [`data-${name}`]: String(a[name]) } : {}),
});

/** Alignment, line spacing and first-line indent for every text block; a style (variant) for paragraphs. */
export const BlockFormat = Extension.create({
  name: 'blockFormat',
  addGlobalAttributes() {
    return [
      { types: ['paragraph', 'heading', 'sectionHeading', 'quote'], attributes: { align: dataAttr('align'), line: dataAttr('line'), indent: dataAttr('indent'), before: dataAttr('before'), after: dataAttr('after') } },
      { types: ['paragraph'], attributes: { variant: dataAttr('variant') } },
    ];
  },
});

// ───────────────────────────── markers ─────────────────────────────

export const MARKERS_META = 'paperMarkers';
const markersKey = new PluginKey<{ markers: string[]; set: DecorationSet }>('paperMarkers');

const CITABLE = new Set(['citation', 'quote', 'figure', 'tableFigure']);

/** Document-order walk matching docModel.citableNodes(): sections only, the Unplaced bin is skipped. */
function decorate(doc: PmNodeType, markers: string[]): DecorationSet {
  const decos: Decoration[] = [];
  let i = 0;
  doc.descendants((node, pos) => {
    if (node.type.name === 'unplaced') return false;
    if (CITABLE.has(node.type.name)) {
      const marker = markers[i++] ?? '';
      if (marker) decos.push(Decoration.node(pos, pos + node.nodeSize, { 'data-marker': marker }));
    }
    return true;
  });
  return DecorationSet.create(doc, decos);
}

/** Draws the markers (set with a transaction carrying MARKERS_META) as data-marker attributes the CSS prints. */
export const CitationMarkers = Extension.create({
  name: 'citationMarkers',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markersKey,
        state: {
          init: (_, state) => ({ markers: [] as string[], set: decorate(state.doc, []) }),
          apply(tr, value, _old, newState) {
            const meta = tr.getMeta(MARKERS_META) as string[] | undefined;
            if (meta) return { markers: meta, set: decorate(newState.doc, meta) };
            // a text edit moves positions; the markers are recomputed by the shell, so just keep them aligned meanwhile
            return tr.docChanged ? { markers: value.markers, set: decorate(newState.doc, value.markers) } : value;
          },
        },
        props: { decorations: (state) => markersKey.getState(state)?.set },
      }),
    ];
  },
});

// ───────────────────────────── hints in empty sections ─────────────────────────────

/**
 * The grey hint in an empty paragraph directly inside a section (what goes in this section). A decoration of the
 * current document, so it never reads a stale position the way a position lookup on the previous state would.
 */
export const SectionHints = Extension.create<{ hintFor: (key: string) => string }>({
  name: 'sectionHints',
  addOptions() {
    return { hintFor: () => '' };
  },
  addProseMirrorPlugins() {
    const hintFor = this.options.hintFor;
    return [
      new Plugin({
        key: new PluginKey('sectionHints'),
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.forEach((section, sectionPos) => {
              if (section.type.name !== 'section') return;
              const hint = hintFor(String(section.attrs.key));
              section.forEach((child, childPos) => {
                if (child.type.name !== 'paragraph' || child.content.size > 0) return;
                const from = sectionPos + 1 + childPos;
                decos.push(Decoration.node(from, from + child.nodeSize, { class: 'is-empty', 'data-placeholder': hint }));
              });
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

// ───────────────────────────── drops from the sidebar ─────────────────────────────

export interface DropPayload {
  kind: 'clip' | 'cite';
  id: string;
  /** Document position under the pointer, or null when the pointer is not over the text. */
  pos: number | null;
}

/**
 * Takes a clip or citation row dragged from the sidebar. Anything else (files, text, links) is left to the editor,
 * so the paste work (S-151) can handle it. The payload is handed to the shell, which builds the nodes.
 */
export const ClipDrop = Extension.create<{ onDrop?: (payload: DropPayload) => void }>({
  name: 'clipDrop',
  addOptions() {
    return { onDrop: undefined };
  },
  addProseMirrorPlugins() {
    const onDrop = this.options.onDrop;
    return [
      new Plugin({
        key: new PluginKey('clipDrop'),
        props: {
          handleDrop(view, event) {
            const types = event.dataTransfer?.types ?? [];
            const kind = types.includes(CITE_MIME) ? 'cite' : types.includes(CLIP_MIME) ? 'clip' : null;
            if (!kind || !onDrop) return false;
            const id = event.dataTransfer?.getData(kind === 'cite' ? CITE_MIME : CLIP_MIME) ?? '';
            if (!id) return false;
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            event.preventDefault();
            onDrop({ kind, id, pos: at ? at.pos : null });
            return true;
          },
        },
      }),
    ];
  },
});

// ─────────────────────────── the extension list ───────────────────────────

export interface ExtensionOptions {
  /** The hint shown in an empty paragraph of the section with this key. */
  hintFor: (sectionKey: string) => string;
  /** The picture of an image clip, for drawing a figure; null when the clip is gone. */
  imageFor?: (clipId: string) => string | null;
  /** A click on a formula: the editor opens a way to change it. */
  onMathClick?: (latex: string, pos: number, display: boolean) => void;
  /** A clip or citation row was dropped on the page. */
  onDropClip?: (payload: DropPayload) => void;
}

export function paperExtensions({ hintFor, onMathClick, onDropClip, imageFor = () => null }: ExtensionOptions) {
  return [
    StarterKit.configure({
      document: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      strike: false,
      horizontalRule: false,
      trailingNode: false, // would add a paragraph after the Unplaced bin and break the schema
      heading: { levels: [2, 3] },
      link: { openOnClick: false, autolink: false, protocols: ['mailto'] },
    }),
    Doc,
    Section,
    SectionHeading,
    Quote,
    ClipNote,
    Citation,
    Figure.configure({ imageFor }),
    TableFigure,
    Unplaced,
    TableKit.configure({ table: { resizable: false } }),
    Mathematics.configure({
      katexOptions: { throwOnError: false, trust: false, strict: 'ignore' },
      inlineOptions: { onClick: (node, pos) => onMathClick?.(String(node.attrs.latex ?? ''), pos, false) },
      blockOptions: { onClick: (node, pos) => onMathClick?.(String(node.attrs.latex ?? ''), pos, true) },
    }),
    Subscript,
    Superscript,
    TextStyle,
    Color,
    SectionHints.configure({ hintFor }),
    BlockFormat,
    FontSize,
    FontFamilyMark,
    HighlightMark,
    PageBreak,
    Column,
    Columns,
    Pagination,
    TrailingText,
    FindHighlight,
    CitationMarkers,
    ClipDrop.configure({ onDrop: onDropClip }),
  ];
}
