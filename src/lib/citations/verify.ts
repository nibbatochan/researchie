// Checks a citation against the clip. Two kinds of result:
// - warnings: only when an identifier or title the user entered does not match the clip.
// - notes: plain facts about the source (missing fields, preprint, web page, retraction).
// A web page from a known URL is verified by its address, so it gets no warning.

import type { CitationRecord, Confidence } from './types.ts';

export function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Equal after normalising, or one title is almost all of the other (a short
// clip title against the full paper title).
export function titlesMatch(a: string, b: string): boolean {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return long.includes(short) && short.length >= 0.8 * long.length;
}

/** Shown in amber, apart from the verify warnings: the source itself is withdrawn. */
export const RETRACTED_MESSAGE = 'This paper has been retracted. Do not cite it as valid evidence.';

export function isRetracted(record: CitationRecord | null | undefined): boolean {
  return record?.retracted === true;
}

export function assessCitation(
  record: CitationRecord,
  expectedTitle?: string,
  options: { userEntered: boolean } = { userEntered: false },
): CitationRecord {
  const warnings: string[] = [];
  const notes: string[] = [];

  if (expectedTitle && record.title && record.resolvedFrom !== 'page_tags' && !titlesMatch(expectedTitle, record.title)) {
    if (options.userEntered) warnings.push('The identifier you entered points to a different title than the clip.');
    else notes.push('The title on the source differs from the clip.');
  }

  if (record.sourceType === 'web_page') {
    notes.push('Web page source, verified by its address.');
  }
  if (record.status === 'incomplete') notes.push(`Missing: ${record.missingFields.join(', ')}.`);
  else if (record.status === 'manual' && record.missingFields.length > 0) notes.push(`Missing: ${record.missingFields.join(', ')}.`);
  if (record.sourceType === 'preprint') notes.push('Preprint. A published version may differ.');
  if (record.sourceType === 'unknown') notes.push('The source type could not be identified.');
  if (record.resolvedFrom === 'pubmed' && record.retracted === undefined) notes.push('The retraction check did not run.');

  const confidence: Confidence = { warnings, notes };
  return { ...record, confidence, enteredByUser: options.userEntered };
}

// Citations saved before the warnings/notes split carry {level, reasons}. Read
// those as notes, so an old record never crashes the card. Refreshing re-checks it.
export function readConfidence(record: CitationRecord): Confidence {
  const legacy = record.confidence as unknown as { warnings?: string[]; notes?: string[]; reasons?: string[] } | undefined;
  return { warnings: legacy?.warnings ?? [], notes: legacy?.notes ?? legacy?.reasons ?? [] };
}
