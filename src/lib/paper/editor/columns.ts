// Columns blocks as pure transactions over ProseMirror (no DOM, testable): insert at the cursor, back to equal
// widths, and take the columns away while keeping their text. The Columns button's panel drives these.
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { Node as PmNodeType } from '@tiptap/pm/model';

export const COLUMN_COUNTS = [2, 3, 4, 5, 6] as const;
export type ColumnPreset = 'equal' | 'first' | 'last';

/** Shares of the row, as the node stores them ("2,1,1"). An empty string means equal. */
export function presetWidths(count: number, preset: ColumnPreset): string {
  if (preset === 'equal') return '';
  const w = Array.from({ length: count }, () => 1);
  w[preset === 'first' ? 0 : count - 1] = 2;
  return w.join(',');
}

/** The Columns block the cursor is inside, if any. */
/** Sets the column setting ("1", "2", or "" to follow the paper) on the section at the cursor, or on every section. */
export function setSectionColumns(state: EditorState, value: string, all = false): Transaction | null {
  const tr = state.tr;
  if (all) {
    state.doc.forEach((node, pos) => {
      if (node.type.name === 'section' && node.attrs.columns !== value) tr.setNodeMarkup(tr.mapping.map(pos), undefined, { ...node.attrs, columns: value });
    });
  } else {
    const $ = state.selection.$from;
    for (let d = $.depth; d > 0; d--) {
      if ($.node(d).type.name !== 'section') continue;
      const pos = $.before(d);
      tr.setNodeMarkup(pos, undefined, { ...$.node(d).attrs, columns: value });
      break;
    }
  }
  return tr.docChanged ? tr : null;
}

/** The section at the cursor: its position and its column setting. */
export function sectionColumnsAt(state: EditorState): string | null {
  const $ = state.selection.$from;
  for (let d = $.depth; d > 0; d--) if ($.node(d).type.name === 'section') return String($.node(d).attrs.columns ?? '');
  return null;
}

export function columnsAt(state: EditorState): { pos: number; node: PmNodeType } | null {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'columns') return { pos: $from.before(d), node: $from.node(d) };
  }
  return null;
}

/**
 * Puts empty columns after the block the cursor is in (after the whole Columns block when the cursor is already in
 * one), with an empty paragraph below to click into and leave. The cursor lands in the first column.
 */
export function insertColumns(state: EditorState, count: number, preset: ColumnPreset = 'equal'): Transaction | null {
  const { $from } = state.selection;
  if ($from.depth < 2) return null;
  const { schema } = state;
  const columns = schema.nodes.columns.create(
    { widths: presetWidths(count, preset) },
    Array.from({ length: count }, () => schema.nodes.column.create(null, schema.nodes.paragraph.create()))
  );
  const at = $from.after(2); // depth 2 is the block inside the section, so this is after a Columns block too
  const tr = state.tr.insert(at, [columns, schema.nodes.paragraph.create()]);
  return tr.setSelection(TextSelection.create(tr.doc, at + 3)).scrollIntoView();
}

/** Sets the widths of the Columns block the cursor is in to a preset. */
export function applyWidths(state: EditorState, preset: ColumnPreset): Transaction | null {
  const at = columnsAt(state);
  return at ? state.tr.setNodeMarkup(at.pos, undefined, { ...at.node.attrs, widths: presetWidths(at.node.childCount, preset) }) : null;
}

/** Resets the Columns block the cursor is in to equal widths. */
export const equalWidths = (state: EditorState): Transaction | null => applyWidths(state, 'equal');

/** Replaces the Columns block the cursor is in with the blocks it held, column by column. */
export function removeColumns(state: EditorState): Transaction | null {
  const at = columnsAt(state);
  if (!at) return null;
  const blocks: PmNodeType[] = [];
  at.node.forEach((column) => column.forEach((block) => blocks.push(block)));
  return state.tr.replaceWith(at.pos, at.pos + at.node.nodeSize, blocks);
}
