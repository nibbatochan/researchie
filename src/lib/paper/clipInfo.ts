// What the paper views need to know about a clip, taken from the clip (atom) itself. Shared by the old outline
// view and the paper editor's sidebar. Pure.
import type { ResearchAtom } from '../types/research';
import { getEvidenceKind } from '../atoms/evidence.ts';
import type { ClipInfo } from './preview.ts';
import { parseTable } from './tableParse.ts';

/** An image clip is a figure; a clip that holds an HTML table is a table. Only the table's text is kept. */
export function mediaOf(a: ResearchAtom): ClipInfo['media'] {
  const caption = (a.content?.description || a.userNotes || a.title || '').trim();
  if (a.type === 'image' && a.content?.imageUrl) return { kind: 'image', src: a.content.imageUrl, caption };
  const html = a.content?.sanitizedHtml || a.content?.rawText || '';
  const table = a.type === 'block' ? parseTable(html) : undefined;
  return table ? { kind: 'table', table, caption: table.caption || caption } : undefined;
}

export function clipTextOf(a: ResearchAtom): string {
  return a.content?.text || a.content?.rawText || a.metadata?.selectedText || a.title || '';
}

/** A short line for a list: the clip's text cut to `max` characters. */
export function clipPreview(a: ResearchAtom, max = 140): string {
  const text = clipTextOf(a);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function clipInfoOf(a: ResearchAtom): ClipInfo {
  const kind = getEvidenceKind(a);
  return {
    id: a.id,
    text: clipTextOf(a),
    kind,
    record: a.metadata?.citation,
    page: kind === 'quote' ? (a.metadata?.pageNumber ?? a.metadata?.page) : undefined,
    retractionState: a.metadata?.health?.retraction?.state,
    media: mediaOf(a),
  };
}

export function buildClipInfos(atoms: ResearchAtom[]): Map<string, ClipInfo> {
  return new Map(atoms.map((a) => [a.id, clipInfoOf(a)]));
}
