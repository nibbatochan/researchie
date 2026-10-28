// Comments on selected text (Word-style). The text carries a `comment` mark; the paper's `comments` list in meta holds
// the note. These helpers read and clear the marks, and are pure so they can be tested without the editor.
import type { Node as PmNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

export interface CommentRange {
  id: string;
  from: number;
  to: number;
  quote: string;
}

/** Every stretch of text carrying a comment mark, in document order. One comment can have several stretches (after a copy). */
export function commentRanges(doc: PmNode): CommentRange[] {
  const out: CommentRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const m of node.marks) {
      if (m.type.name !== 'comment') continue;
      const id = String(m.attrs.id ?? '');
      const last = out.findLast((r) => r.id === id);
      if (last && last.to === pos) {
        last.to = pos + node.nodeSize;
        last.quote += node.text ?? '';
      } else {
        out.push({ id, from: pos, to: pos + node.nodeSize, quote: node.text ?? '' });
      }
    }
  });
  return out;
}

/** Removes the comment mark with this id from every stretch of the document. */
export function removeCommentMarks(tr: Transaction, id: string): Transaction {
  tr.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const m of node.marks) {
      if (m.type.name === 'comment' && String(m.attrs.id ?? '') === id) tr.removeMark(pos, pos + node.nodeSize, m);
    }
  });
  return tr;
}
