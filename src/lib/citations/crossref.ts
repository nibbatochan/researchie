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
  'publisher-location'?: string;
  editor?: { given?: string; family?: string; name?: string }[];
  institution?: { name?: string }[];
  'report-number'?: string | string[];
  issued?: CrossrefDate;
  'published-print'?: CrossrefDate;
  'published-online'?: CrossrefDate;
  'update-to'?: { DOI?: string; type?: string }[];
  // Set on the original paper when a notice (retraction, correction, ...) updates it.
  'updated-by'?: { DOI?: string; type?: string }[];
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

function people(list: CrossrefWork['author']): CitationAuthor[] {
  return (list ?? [])
    .filter((a) => a.family || a.name)
    .map((a) => (a.family ? { family: a.family, given: a.given } : { family: a.name! }));
}

const authorsOf = (work: CrossrefWork) => people(work.author);

export function mapCrossrefWork(work: CrossrefWork): CitationRecord {
  const sourceType = SOURCE_TYPES[work.type ?? ''] ?? 'unknown';
  // A preprint has no journal; the server (bioRxiv, arXiv) is named in institution.
  const journal = work['container-title']?.[0] ?? (sourceType === 'preprint' ? work.institution?.[0]?.name : undefined);

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
    // A report's agency is often only in institution; publisher is the fallback.
    publisher: work.publisher ?? (sourceType === 'report' ? work.institution?.[0]?.name : undefined),
    missingFields: [],
  };
  if (work['publisher-location']) record.publisherPlace = work['publisher-location'];
  const reportNumber = Array.isArray(work['report-number']) ? work['report-number'][0] : work['report-number'];
  if (sourceType === 'report' && reportNumber) record.reportNumber = reportNumber;
  if (work.editor?.length) record.editors = people(work.editor);

  // Retraction notices point at the retracted work via update-to.
  const retracted = (work['update-to'] ?? []).some((u) => u.type === 'retraction');
  if (work['update-to']) record.retracted = retracted;

  // The original paper lists its notices in updated-by. Verified live on the retracted
  // Lancet 1998 paper (10.1016/S0140-6736(97)11096-0): type "retraction".
  if (work['updated-by']) {
    record.retracted = record.retracted === true || work['updated-by'].some((u) => u.type === 'retraction' || u.type === 'withdrawal');
  }

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
