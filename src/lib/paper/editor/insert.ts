// Where a placed clip or citation lands in the document, and the transaction that puts it there (design note 4.3).
// A dropped or inserted block goes after the block the position is in, never inside a heading and never between the
// section and its heading; an empty paragraph it lands on is replaced instead of left behind. Pure over ProseMirror.
import type { Node as PmNodeType } from '@tiptap/pm/model';
import { Fragment } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { PmNode } from '../docModel.ts';

const CONTAINERS = new Set(['section', 'unplaced', 'column']);
/** The same without columns: where a block goes when the column the cursor is in cannot hold it (a table, a note). */
const OUTSIDE_COLUMNS = new Set(['section', 'unplaced']);

/** The range to replace with the new blocks. from === to means a plain insert. */
export function blockPlacement(doc: PmNodeType, pos: number, containers: Set<string> = CONTAINERS): { from: number; to: number } {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let d = $pos.depth; d >= 0; d--) {
    const container = $pos.node(d);
    if (!containers.has(container.type.name)) continue;
    if (d === $pos.depth) {
      // between two children of the container: not before the heading
      if (container.type.name === 'section' && $pos.index() === 0) {
        const at = $pos.pos + (container.firstChild?.nodeSize ?? 0);
        return { from: at, to: at };
      }
      return { from: $pos.pos, to: $pos.pos };
    }
    const child = $pos.node(d + 1);
    const start = $pos.before(d + 1);
    const end = $pos.after(d + 1);
    if (child.type.name === 'paragraph' && child.content.size === 0) return { from: start, to: end };
    return { from: end, to: end };
  }
  // between sections, or at the very start or end: the end of the section before, or the start of the first one
  let before: { node: PmNodeType; start: number } | null = null;
  doc.forEach((node, off) => {
    if (node.type.name === 'section' && off < $pos.pos) before = { node, start: off };
  });
  const prev = before as { node: PmNodeType; start: number } | null;
  if (prev) {
    const at = prev.start + prev.node.nodeSize - 1; // inside the end of that section
    return { from: at, to: at };
  }
  const first = doc.firstChild;
  const at = 1 + (first?.firstChild?.nodeSize ?? 0);
  return { from: at, to: at };
}

/** A transaction placing block nodes (ProseMirror JSON) at `pos`. A paragraph is left after them so the person can keep typing. */
export function insertBlocks(state: EditorState, pos: number, nodes: PmNode[]): Transaction {
  const { schema, doc } = state;
  const blocks = nodes.map((n) => schema.nodeFromJSON(n));
  const fragment = Fragment.fromArray(blocks);
  let { from, to } = blockPlacement(doc, pos);
  const $from = doc.resolve(from);
  // inside a column only what a column can hold goes in; anything else lands after the whole set of columns
  if (!$from.parent.canReplace($from.index(), doc.resolve(to).index(), fragment)) ({ from, to } = blockPlacement(doc, pos, OUTSIDE_COLUMNS));
  const tr = state.tr.replaceWith(from, to, fragment);
  const after = from + blocks.reduce((n, b) => n + b.nodeSize, 0);
  const $after = tr.doc.resolve(Math.min(after, tr.doc.content.size));
  if (!$after.nodeAfter || $after.nodeAfter.type.name !== 'paragraph') {
    if (CONTAINERS.has($after.parent.type.name)) tr.insert(after, schema.nodes.paragraph.create());
  }
  return tr.scrollIntoView();
}

/** A transaction placing an inline node (a citation) at `pos`. Where inline content is not allowed it goes in a new paragraph. */
export function insertInline(state: EditorState, pos: number, node: PmNode): Transaction {
  const { schema, doc } = state;
  const inline = schema.nodeFromJSON(node);
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  if ($pos.parent.isTextblock && $pos.parent.type.name !== 'sectionHeading' && $pos.parent.type.name !== 'quote') {
    return state.tr.insert($pos.pos, inline).scrollIntoView();
  }
  return insertBlocks(state, pos, [{ type: 'paragraph', content: [node] }]);
}
