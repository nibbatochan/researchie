// What a clip is as evidence in a paper. Stored in the atom's metadata JSON as metadata.evidenceKind,
// so no database change is needed. Only a 'quote' may be put in quotation marks in a draft.
//   quote       - words copied from the source itself (web page or PDF), with their location
//   ai-summary  - text written by an AI (for example a NotebookLM answer); never cite it as the paper's words
//   mine        - the researcher's own words or observations; needs no citation

export type EvidenceKind = 'quote' | 'ai-summary' | 'mine';

interface HasEvidence {
  type?: string;
  metadata?: { evidenceKind?: string; sourceUrl?: string; documentId?: string; pdfDocId?: string; docId?: string } | null;
}

const KINDS: readonly string[] = ['quote', 'ai-summary', 'mine'];

export function isEvidenceKind(value: unknown): value is EvidenceKind {
  return typeof value === 'string' && KINDS.includes(value);
}

/**
 * The clip's evidence kind. An explicit choice wins. Otherwise: notes are the researcher's own words;
 * everything captured from a page or PDF is a quote, because the extension copies the selected text as is.
 */
export function getEvidenceKind(atom: HasEvidence): EvidenceKind {
  const explicit = atom.metadata?.evidenceKind;
  if (isEvidenceKind(explicit)) return explicit;
  if (atom.type === 'note') return 'mine';
  return 'quote';
}

/** Returns metadata with the evidence kind set. Everything else in metadata is kept. */
export function withEvidenceKind<M extends object>(metadata: M | undefined | null, kind: EvidenceKind): M & { evidenceKind: EvidenceKind } {
  return { ...(metadata ?? ({} as M)), evidenceKind: kind };
}

/** Only a quote may appear in quotation marks, and only a quote may be cited as the source's own words. */
export function canBeQuoted(atom: HasEvidence): boolean {
  return getEvidenceKind(atom) === 'quote';
}

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  quote: 'Quote',
  'ai-summary': 'AI summary',
  mine: 'Mine',
};
