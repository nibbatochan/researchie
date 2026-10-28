// Find and replace inside the paper document (pure: no DOM, no view). Matches are document positions, so the editor
// can select them and replace them in one transaction. Each textblock is searched on its own, so a match never
// spans two blocks. A citation or formula is one placeholder character, so offsets stay aligned with positions.
import type { Node as PmNode } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';

export interface FindOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface FindMatch {
  from: number;
  to: number;
}

/** Stands in for every non-text inline node (citation, formula) so that one node is one character. */
const PLACEHOLDER = '￼';
const WORD_CHAR = /[\p{L}\p{N}_]/u;

const isWordChar = (ch: string | undefined): boolean => ch !== undefined && WORD_CHAR.test(ch);

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Start and end offsets of every non-overlapping occurrence of `query` in `text`. */
function occurrences(text: string, query: string, caseSensitive: boolean): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const hay = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  if (!caseSensitive && (hay.length !== text.length || needle.length !== query.length)) {
    // toLowerCase changed the length, so offsets in the lowered copy would drift: match on the original text instead.
    const re = new RegExp(escapeRegex(query), 'gi');
    for (let m = re.exec(text); m; m = re.exec(text)) out.push([m.index, m.index + m[0].length]);
    return out;
  }
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out.push([i, i + needle.length]);
    i = hay.indexOf(needle, i + needle.length);
  }
  return out;
}

/** Every non-overlapping match of `query` in the document's text, in document order. */
export function findMatches(doc: PmNode, query: string, options: FindOptions = {}): FindMatch[] {
  if (!query) return [];
  const caseSensitive = Boolean(options.caseSensitive);
  const wholeWord = Boolean(options.wholeWord);
  const matches: FindMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, undefined, PLACEHOLDER);
    for (const [start, end] of occurrences(text, query, caseSensitive)) {
      if (wholeWord) {
        const before = start > 0 ? [...text.slice(Math.max(0, start - 2), start)].pop() : undefined;
        const after = [...text.slice(end, end + 2)][0];
        if (isWordChar(before) || isWordChar(after)) continue;
      }
      // the text of a textblock starts one position inside its opening token
      matches.push({ from: pos + 1 + start, to: pos + 1 + end });
    }
    return false;
  });
  return matches;
}

/** The marks of the character a match starts on, so a replacement keeps bold, italic and so on. */
function marksAt(state: EditorState, pos: number) {
  return state.doc.nodeAt(pos)?.marks ?? [];
}

/** Replaces one match with `replacement`; an empty replacement deletes it. */
export function replaceMatch(state: EditorState, match: FindMatch, replacement: string): Transaction {
  const tr = state.tr;
  if (!replacement) return tr.delete(match.from, match.to);
  return tr.replaceWith(match.from, match.to, state.schema.text(replacement, marksAt(state, match.from)));
}

/**
 * Replaces every match in one transaction. Applied from the last match to the first, so the earlier positions stay
 * valid. Returns null when there is nothing to replace.
 */
export function replaceAll(state: EditorState, query: string, replacement: string, options: FindOptions = {}): Transaction | null {
  const matches = findMatches(state.doc, query, options);
  if (matches.length === 0) return null;
  const tr = state.tr;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    if (replacement) tr.replaceWith(m.from, m.to, state.schema.text(replacement, marksAt(state, m.from)));
    else tr.delete(m.from, m.to);
  }
  return tr;
}

/**
 * The index of the next match from `cursor` in `direction`. Forward: the first match starting at or after the cursor.
 * Backward: the last match ending at or before it. Both wrap around. -1 when there are no matches.
 */
export function nextMatchIndex(matches: FindMatch[], cursor: number, direction: 1 | -1): number {
  if (matches.length === 0) return -1;
  if (direction === 1) {
    const i = matches.findIndex((m) => m.from >= cursor);
    return i === -1 ? 0 : i;
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i].to <= cursor) return i;
  }
  return matches.length - 1;
}
