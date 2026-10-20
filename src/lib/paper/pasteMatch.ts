// Matching pasted text against the PDFs in a project. No AI, no network.
// A researcher copies an answer from NotebookLM, a highlight from Zotero, or a passage from anywhere and pastes it
// here. Only words found WORD FOR WORD in one of the project's PDFs become a Quote, with the PDF's own wording,
// its page and its document's citation. Everything else stays what it is: an AI summary or the researcher's own text.
// A sentence that is merely similar to a PDF passage gets a hint, never a page that could be cited.

import type { CitationRecord } from '../citations/types';
import { checkQuoteAgainstPages, normalizeForMatch, type SourcePage } from '../ai/claimSupport.ts';
import { locateQuote } from '../ai/passages.ts';

export interface PasteDoc {
  id: string;
  title: string;
  filename?: string;
  totalPages?: number;
  citation?: CitationRecord;
  pages: SourcePage[];
}

export interface PasteHit {
  docId: string;
  docTitle: string;
  pageNumber: number;
  text: string; // the PDF's own wording, not the pasted wording
}

export interface PasteSentence {
  text: string; // as pasted, markers removed
  hit?: PasteHit; // word for word in a PDF
  similar?: { docId: string; docTitle: string; pageNumber: number }; // close but not word for word: a hint only
}

export interface PasteResult {
  cleaned: string;
  wholeBlock: boolean; // the whole paste is one passage in a PDF
  sentences: PasteSentence[];
  foundCount: number;
}

// A sentence shorter than this would match almost any page, so it is never counted as found.
export const MIN_MATCH_WORDS = 5;

/** Removes citation markers such as [1], [2, 3], [4-6] and superscript digits, and tidies spacing. */
export function cleanPaste(text: string): string {
  return (text || '')
    .replace(/\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g, '')
    .replace(/[²³¹⁰-⁹]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Splits into sentences at . ! ? followed by a space and a capital letter, digit or opening quote. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const words = (text: string) => normalizeForMatch(text).split(' ').filter(Boolean).length;

function findIn(text: string, docs: PasteDoc[]): { hit?: PasteHit; similar?: PasteSentence['similar'] } {
  if (words(text) < MIN_MATCH_WORDS) return {};
  let similar: PasteSentence['similar'];
  for (const doc of docs) {
    const check = checkQuoteAgainstPages(text, doc.pages);
    if (check.supported && check.exact && check.pageNumber !== undefined) {
      const page = doc.pages.find((p) => p.pageNumber === check.pageNumber);
      const span = page ? locateQuote(text, page.content) : null;
      // The span ends at the last letter; keep the closing punctuation the PDF has right after it.
      const tail = page && span ? (page.content.slice(span.end).match(/^[.!?;:”"')\]]+/)?.[0] ?? '') : '';
      const verbatim = page && span ? page.content.slice(span.start, span.end + tail.length).replace(/\s*\n\s*/g, ' ').trim() : text;
      return { hit: { docId: doc.id, docTitle: doc.title, pageNumber: check.pageNumber, text: verbatim } };
    }
    if (!similar && check.supported && check.pageNumber !== undefined) {
      similar = { docId: doc.id, docTitle: doc.title, pageNumber: check.pageNumber };
    }
  }
  return { similar };
}

export function matchPaste(raw: string, docs: PasteDoc[]): PasteResult {
  const cleaned = cleanPaste(raw);
  if (!cleaned) return { cleaned, wholeBlock: false, sentences: [], foundCount: 0 };

  const whole = findIn(cleaned, docs);
  if (whole.hit) return { cleaned, wholeBlock: true, sentences: [{ text: cleaned, hit: whole.hit }], foundCount: 1 };

  const sentences: PasteSentence[] = splitSentences(cleaned).map((text) => ({ text, ...findIn(text, docs) }));
  return { cleaned, wholeBlock: false, sentences, foundCount: sentences.filter((s) => s.hit).length };
}

export type PasteSource = 'notebooklm' | 'zotero' | 'other';

export const PASTE_SOURCES: ReadonlyArray<{ id: PasteSource; label: string; url: string }> = [
  { id: 'notebooklm', label: 'NotebookLM', url: 'https://notebooklm.google.com/' },
  { id: 'zotero', label: 'Zotero', url: 'https://www.zotero.org/' },
  { id: 'other', label: 'Somewhere else', url: 'about:blank' },
];

export interface NewClip {
  projectId: string;
  type: 'quote' | 'text' | 'note';
  title: string;
  content: { text: string; description?: string };
  metadata: Record<string, unknown>;
  tags: string[];
}

const short = (text: string) => (text.length > 50 ? `${text.slice(0, 50)}...` : text);

/** One Quote clip per found sentence, with the PDF's wording, page and document citation. */
export function quoteClips(result: PasteResult, projectId: string, docs: PasteDoc[]): NewClip[] {
  return result.sentences.flatMap((s) => {
    if (!s.hit) return [];
    const doc = docs.find((d) => d.id === s.hit!.docId);
    const n = s.hit.pageNumber;
    return [{
      projectId,
      type: 'quote' as const,
      title: `"${short(s.hit.text)}" — p. ${n}`,
      content: { text: s.hit.text, description: `From "${s.hit.docTitle}", Page ${n}` },
      metadata: {
        sourceUrl: `/reader?doc=${s.hit.docId}&page=${n}`,
        pageTitle: `${s.hit.docTitle} (Page ${n})`,
        documentType: 'pdf',
        documentName: doc?.filename,
        documentId: s.hit.docId,
        pageNumber: n,
        totalDocumentPages: doc?.totalPages,
        ...(doc?.citation ? { citation: doc.citation } : {}),
        evidenceKind: 'quote',
      },
      tags: ['pasted', 'pdf-clip'],
    }];
  });
}

/** The whole paste as one clip that is NOT a quote: an AI summary, or the researcher's own text. */
export function textClip(cleaned: string, kind: 'ai-summary' | 'mine', source: PasteSource, projectId: string): NewClip {
  const from = PASTE_SOURCES.find((s) => s.id === source) ?? PASTE_SOURCES[2];
  return {
    projectId,
    type: kind === 'mine' ? 'note' : 'text',
    title: short(cleaned),
    content: { text: cleaned, description: kind === 'ai-summary' ? `AI summary pasted from ${from.label}. Not the paper's own words.` : undefined },
    metadata: {
      sourceUrl: kind === 'mine' ? 'about:blank' : from.url,
      pageTitle: kind === 'mine' ? 'My own text' : `Pasted from ${from.label}`,
      evidenceKind: kind,
    },
    tags: ['pasted', kind === 'mine' ? 'own-text' : 'ai-summary'],
  };
}
