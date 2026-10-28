// Paragraph formatting for the toolbar, as pure transactions over ProseMirror (no DOM, testable).
// The paragraph styles come from the type scale of a real journal article (a PLOS ONE paper, studied 2026-10-22):
//   body 10 pt justified, first-line indent; section heading 11 pt bold; sub-heading 10 pt bold; sub-sub-heading
//   10 pt bold italic; caption and table text 8 pt; notes (sidebars, table notes) 8 pt; references 8 pt with a
//   hanging indent; the article-type label 8 pt capitals.
import type { Node as PmNodeType, NodeType } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';

export type StyleId = 'body' | 'h2' | 'h3' | 'caption' | 'note' | 'reference' | 'label';

export const STYLE_LABELS: Array<{ id: StyleId; label: string; hint: string }> = [
  { id: 'body', label: 'Body text', hint: '10 pt' },
  { id: 'h2', label: 'Sub-heading', hint: '10 pt bold' },
  { id: 'h3', label: 'Small sub-heading', hint: '10 pt bold italic' },
  { id: 'caption', label: 'Caption', hint: '8 pt' },
  { id: 'note', label: 'Note', hint: '8 pt' },
  { id: 'reference', label: 'Reference', hint: '8 pt, hanging' },
  { id: 'label', label: 'Label', hint: '8 pt capitals' },
];

export const ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

/** Space before and after a paragraph, in pt, as Word's "Add space before / after" sets it. A paragraph has 0 before and 6 after until changed. */
export const SPACE_ADDED = '12';
export const DEFAULT_SPACE = { before: 0, after: 6 };

export const LINE_SPACINGS = ['1', '1.15', '1.4', '1.5', '2', '2.5', '3'] as const;
/** The spacing a paragraph has when none is chosen. */
export const DEFAULT_LINE = '1.4';

const TEXT_BLOCKS = new Set(['paragraph', 'heading', 'sectionHeading', 'quote']);

interface Located {
  node: PmNodeType;
  pos: number;
}

/** The text blocks the selection touches, in order. */
export function selectedTextBlocks(state: EditorState): Located[] {
  const { from, to } = state.selection;
  const out: Located[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (TEXT_BLOCKS.has(node.type.name)) out.push({ node, pos });
    return true;
  });
  return out;
}

/** Sets the attributes (those the block's type has) on every selected text block. A null value clears one. */
export function setBlockAttrs(state: EditorState, attrs: Record<string, string | null>): Transaction {
  const tr = state.tr;
  for (const { node, pos } of selectedTextBlocks(state)) {
    const next = { ...node.attrs };
    let changed = false;
    for (const [k, v] of Object.entries(attrs)) {
      if (k in node.type.spec.attrs! || k in node.attrs) {
        if (next[k] !== v) changed = true;
        next[k] = v;
      }
    }
    if (changed) tr.setNodeMarkup(pos, undefined, next);
  }
  return tr;
}

/** The attributes of the first selected text block, for showing the toolbar's current state. */
export function blockStateAt(state: EditorState): { type: string; level: number | null; align: string | null; line: string | null; indent: string | null; variant: string | null; before: string | null; after: string | null } {
  const first = selectedTextBlocks(state)[0]?.node;
  return {
    type: first?.type.name ?? '',
    level: first?.type.name === 'heading' ? Number(first.attrs.level) : null,
    align: (first?.attrs.align as string | null) ?? null,
    line: (first?.attrs.line as string | null) ?? null,
    indent: (first?.attrs.indent as string | null) ?? null,
    variant: (first?.attrs.variant as string | null) ?? null,
    before: (first?.attrs.before as string | null) ?? null,
    after: (first?.attrs.after as string | null) ?? null,
  };
}

function retype(tr: Transaction, pos: number, node: PmNodeType, type: NodeType, override: Record<string, unknown>) {
  const attrs: Record<string, unknown> = {};
  for (const key of Object.keys(type.spec.attrs ?? {})) attrs[key] = key in override ? override[key] : (node.attrs[key] ?? null);
  if ('level' in (type.spec.attrs ?? {}) && attrs.level == null) attrs.level = 2;
  tr.setNodeMarkup(pos, type, attrs);
}

/** Applies a paragraph style to every selected text block. Section headings and quotes are left alone. */
export function applyStyle(state: EditorState, id: StyleId): Transaction {
  const { paragraph, heading } = state.schema.nodes;
  const tr = state.tr;
  for (const { node, pos } of selectedTextBlocks(state)) {
    if (node.type.name !== 'paragraph' && node.type.name !== 'heading') continue;
    if (id === 'h2' || id === 'h3') retype(tr, pos, node, heading, { level: id === 'h2' ? 2 : 3, variant: null });
    else retype(tr, pos, node, paragraph, { variant: id === 'body' ? null : id });
  }
  return tr;
}

/** Which style the first selected block has, for the toolbar's menu. */
export function styleOf(state: EditorState): StyleId | '' {
  const b = blockStateAt(state);
  if (b.type === 'heading') return b.level === 3 ? 'h3' : 'h2';
  if (b.type === 'paragraph') return (b.variant as StyleId) || 'body';
  return '';
}
