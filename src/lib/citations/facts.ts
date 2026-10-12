// The three facts shown under every citation: where it came from (page), who wrote
// it (author) and when (date). Anything the record lacks is shown as "not shown".

import type { CitationRecord } from './types.ts';

const NOT_SHOWN = 'not shown';

function pageOf(record: CitationRecord): string {
  if (record.url) {
    try {
      return new URL(record.url).hostname.replace(/^www\./, '');
    } catch {
      return record.url;
    }
  }
  if (record.doi) return `doi.org/${record.doi}`;
  return record.publisher ?? NOT_SHOWN;
}

function authorOf(record: CitationRecord): string {
  const [first] = record.authors;
  if (!first) return NOT_SHOWN;
  return record.authors.length > 1 ? `${first.family} et al.` : first.family;
}

export function citationFacts(record: CitationRecord): { page: string; author: string; date: string } {
  return {
    page: pageOf(record),
    author: authorOf(record),
    date: record.year ? String(record.year) : NOT_SHOWN,
  };
}

export function formatCitationFacts(record: CitationRecord): string {
  const { page, author, date } = citationFacts(record);
  return `Page: ${page} · Author: ${author} · Date: ${date}`;
}
