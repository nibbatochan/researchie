// Maps a Crossref /works/{doi} response to a CitationRecord. Pure: the caller
// does the HTTP request and passes the parsed JSON in.
// Field paths verified against a live response (docs/CITATION_API_RESEARCH.md).

import type { CitationAuthor, CitationRecord, SourceType } from './types';

interface CrossrefDate {
  'date-parts'?: number[][];
}

interface CrossrefWork {
  type?: string;
  DOI?: string;
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  'container-title'?: string[];
  'short-container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  publisher?: string;
  issued?: CrossrefDate;
  'published-print'?: CrossrefDate;
  'published-online'?: CrossrefDate;
  'update-to'?: { DOI?: string; type?: string }[];
}

const SOURCE_TYPES: Record<string, SourceType> = {
  'journal-article': 'journal_article',
  'posted-content': 'preprint',
  report: 'report',
  dataset: 'dataset',
  'book-chapter': 'book_chapter',
};

function yearOf(work: CrossrefWork): number | undefined {
  // "issued" is the earliest of the two publication dates.
  for (const date of [work.issued, work['published-print'], work['published-online']]) {
    const year = date?.['date-parts']?.[0]?.[0];
    if (typeof year === 'number') return year;
  }
  return undefined;
}

function authorsOf(work: CrossrefWork): CitationAuthor[] {
  return (work.author ?? [])
    .filter((a) => a.family || a.name)
    .map((a) => (a.family ? { family: a.family, given: a.given } : { family: a.name! }));
}

export function mapCrossrefWork(work: CrossrefWork): CitationRecord {
  const sourceType = SOURCE_TYPES[work.type ?? ''] ?? 'unknown';
  const journal = work['container-title']?.[0];

  const record: CitationRecord = {
    status: 'verified_doi',
    sourceType,
    resolvedFrom: 'crossref',
    doi: work.DOI,
    title: work.title?.[0],
    authors: authorsOf(work),
    journal,
    journalAbbrev: work['short-container-title']?.[0],
    year: yearOf(work),
    volume: work.volume,
    issue: work.issue,
    pages: work.page,
    publisher: work.publisher,
    missingFields: [],
  };

  // Retraction notices point at the retracted work via update-to.
  const retracted = (work['update-to'] ?? []).some((u) => u.type === 'retraction');
  if (work['update-to']) record.retracted = retracted;

  if (!record.title) record.missingFields.push('title');
  if (record.authors.length === 0) record.missingFields.push('authors');
  if (!journal && sourceType === 'journal_article') record.missingFields.push('journal');
  if (!record.year) record.missingFields.push('year');
  if (sourceType === 'journal_article' && !record.volume) record.missingFields.push('volume');
  if (sourceType === 'journal_article' && !record.pages) record.missingFields.push('pages');

  if (record.missingFields.length > 0) record.status = 'incomplete';
  return record;
}

export function parseCrossrefResponse(body: unknown): CitationRecord | null {
  const message = (body as { message?: CrossrefWork } | null)?.message;
  return message ? mapCrossrefWork(message) : null;
}
