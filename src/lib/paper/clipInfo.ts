// What the paper views need to know about a clip, taken from the clip (atom) itself. Shared by the old outline
// view and the paper editor's sidebar. Pure.
import type { ResearchAtom } from '../types/research';
import type { CitationRecord } from '../citations/types.ts';
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
  // a note is its written text, paragraphs kept (blank lines); its reference list is shown elsewhere, so it is cut here
  if (a.type === 'note' && a.content?.markdownContent) return a.content.markdownContent.split(/\n#+ References/i)[0].replace(/[#*_`>]/g, '').replace(/[ \t]+/g, ' ').trim();
  return a.content?.text || a.content?.rawText || a.metadata?.selectedText || a.title || '';
}

/** The citation a clip carries. A clip with no citation but a web address is cited as a web page with what is known, so it still gets a number and a reference. */
export function recordOf(a: ResearchAtom): CitationRecord | undefined {
  if (a.metadata?.citation) return a.metadata.citation;
  const url = a.metadata?.sourceUrl || a.content?.targetUrl;
  if (!url || url === PLACEHOLDER_URL) return undefined;
  return {
    status: 'incomplete',
    sourceType: 'web_page',
    resolvedFrom: 'manual',
    title: a.metadata?.pageTitle || a.title || url,
    url,
    authors: [],
    missingFields: ['authors', 'year'],
  };
}

const PLACEHOLDER_URL = 'https://example.com'; // what the server stores for a clip saved without a web address

/** A short line for a list: the clip's text cut to `max` characters. */
export function clipPreview(a: ResearchAtom, max = 140): string {
  const text = clipTextOf(a);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function clipInfoOf(a: ResearchAtom): ClipInfo {
  const kind = getEvidenceKind(a);
  const record = recordOf(a);
  return {
    id: a.id,
    text: clipTextOf(a),
    kind,
    record,
    webFallback: Boolean(record) && !a.metadata?.citation,
    page: kind === 'quote' ? (a.metadata?.pageNumber ?? a.metadata?.page) : undefined,
    retractionState: a.metadata?.health?.retraction?.state,
    media: mediaOf(a),
    sourceIds: a.metadata?.sourceAtomIds,
  };
}

export function buildClipInfos(atoms: ResearchAtom[]): Map<string, ClipInfo> {
  return new Map(atoms.map((a) => [a.id, clipInfoOf(a)]));
}
