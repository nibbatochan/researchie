// Taking the paper's structure apart and putting it together again (owner feedback, 2026-10-22: "I must be able to
// remove structural elements"). Pure transactions over ProseMirror. A section is a heading (optional) and the blocks
// under it; a paper always keeps at least one section, so removing the last one empties it instead.
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as PmNodeType } from '@tiptap/pm/model';

export interface SectionAt {
  node: PmNodeType;
  /** Position before the section node. */
  pos: number;
  index: number;
}

/** The section that contains `pos`, or null (the Unplaced bin, or outside the text). */
export function sectionAt(doc: PmNodeType, pos: number): SectionAt | null {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let d = $pos.depth; d >= 1; d--) {
    if ($pos.node(d).type.name === 'section') return { node: $pos.node(d), pos: $pos.before(d), index: $pos.index(d - 1) };
  }
  // between sections: the one before, else the first
  let found: SectionAt | null = null;
  doc.forEach((node, off, index) => {
    if (node.type.name === 'section' && (found === null || off < $pos.pos)) found = { node, pos: off, index };
  });
  return found;
}

const randomId = () => Math.random().toString(36).slice(2, 10);

/** A new section after the one `pos` is in, with a heading to type over. The cursor goes into its heading. */
export function addSectionAfter(state: EditorState, pos: number, makeId: () => string = randomId): Transaction {
  const { schema, doc } = state;
  const id = makeId();
  const at = sectionAt(doc, pos);
  const insertAt = at ? at.pos + at.node.nodeSize : doc.content.size;
  const section = schema.nodes.section.create({ id, key: `custom-${id}`, locked: false }, [
    schema.nodes.sectionHeading.create(null, schema.text('New section')),
    schema.nodes.paragraph.create(),
  ]);
  const tr = state.tr.insert(insertAt, section);
  // select the heading text so typing replaces it
  tr.setSelection(TextSelection.create(tr.doc, insertAt + 2, insertAt + 2 + 'New section'.length));
  return tr.scrollIntoView();
}

/** Removes the section `pos` is in, with its heading and everything under it. The last section is emptied, not removed. */
export function deleteSection(state: EditorState, pos: number): Transaction | null {
  const { schema, doc } = state;
  const at = sectionAt(doc, pos);
  if (!at) return null;
  const sections = doc.content.content.filter((n) => n.type.name === 'section').length;
  if (sections <= 1) {
    const empty = schema.nodes.section.create({ id: String(at.node.attrs.id), key: String(at.node.attrs.key) }, [schema.nodes.paragraph.create()]);
    return state.tr.replaceWith(at.pos, at.pos + at.node.nodeSize, empty);
  }
  return state.tr.delete(at.pos, at.pos + at.node.nodeSize);
}

/** Removes only the heading of the section `pos` is in; its text stays. Null when there is no heading. */
export function deleteSectionHeading(state: EditorState, pos: number): Transaction | null {
  const at = sectionAt(state.doc, pos);
  const heading = at?.node.firstChild;
  if (!at || !heading || heading.type.name !== 'sectionHeading') return null;
  const from = at.pos + 1;
  const tr = state.tr.delete(from, from + heading.nodeSize);
  // a section with nothing left in it keeps one paragraph, so there is somewhere to type
  const left = tr.doc.nodeAt(at.pos);
  if (left && left.childCount === 0) tr.insert(at.pos + 1, state.schema.nodes.paragraph.create());
  return tr;
}

/** True when the section `pos` is in has a heading. */
export function hasHeading(doc: PmNodeType, pos: number): boolean {
  return sectionAt(doc, pos)?.node.firstChild?.type.name === 'sectionHeading';
}
