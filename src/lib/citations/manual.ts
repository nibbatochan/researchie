// Builds a citation record from the form the user fills in after a PDF with no DOI.
// Pure: no network, no DOM. The user typed every field, so nothing is guessed:
// empty fields stay empty and are listed in missingFields.

import type { CitationAuthor, CitationRecord, SourceType } from './types.ts';
import { assessCitation } from './verify.ts';

export interface ManualCitationInput {
  title: string;
  author: string; // comma-separated family names, e.g. "Smith, Jones"
  year: string; // four digits, or empty
  sourceType: 'unknown' | 'journal_article';
}

// Empty is allowed (the field is optional). Otherwise exactly four digits.
export function isValidManualYear(text: string): boolean {
  const trimmed = text.trim();
  return trimmed === '' || /^\d{4}$/.test(trimmed);
}

// "Smith, Jones" -> [{family: 'Smith'}, {family: 'Jones'}]. Empty parts are dropped.
export function parseManualAuthors(text: string): CitationAuthor[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((family) => ({ family }));
}

// Returns undefined for an empty or invalid year, so the field is listed as missing.
export function parseManualYear(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d{4}$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

export function buildManualCitation(input: ManualCitationInput): CitationRecord {
  const title = input.title.trim();
  const authors = parseManualAuthors(input.author);
  const year = parseManualYear(input.year);

  const missingFields: string[] = [];
  if (!title) missingFields.push('title');
  if (authors.length === 0) missingFields.push('authors');
  if (year === undefined) missingFields.push('year');

  const record: CitationRecord = {
    status: 'manual',
    sourceType: input.sourceType as SourceType,
    resolvedFrom: 'manual',
    title: title || undefined,
    authors,
    year,
    missingFields,
  };

  // userEntered: true, and no expected title is passed: the title is the user's own,
  // so the check can only add notes (for example, missing fields), never a mismatch warning.
  return assessCitation(record, undefined, { userEntered: true });
}
