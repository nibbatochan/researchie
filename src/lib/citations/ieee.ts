// IEEE (numbered) reference formatter: A. B. Smith, C. Lee, and D. Kim, "Title," J. Abbrev., vol. 12, no. 3,
// pp. 45–67, 2020, doi: 10.x. The number itself ([1]) is added by the caller, because it depends on the
// order of first citation in the document.
// Checked 2026-10-20 against the CSL style ieee.csl ("IEEE Reference Guide version 11.29.2023", updated
// 2024-03-27), read through a summarising tool: initials first, seven or more authors -> "first et al.",
// quoted title, SHORT (abbreviated) journal title, "vol." / "no." / "pp.", "doi:" at the end, web pages as
// "Accessed: date. [Online]. Available: URL"; preprints and datasets have no layout of their own in that file
// and take the general one. NOT checked against the IEEE Reference Guide itself (it did not load).
// Plain text cannot show italics, so none is added. Unknown sources return null.

import type { CitationAuthor, CitationRecord } from './types';

const MONTHS_SHORT = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
const MAX_AUTHORS = 6;

/** "Jane Alice" becomes "J. A."; "Jean-Pierre" becomes "J.-P." */
function initials(given?: string): string {
  if (!given) return '';
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.split('-').filter(Boolean).map((p) => `${p[0].toUpperCase()}.`).join('-'))
    .join(' ');
}

function authorName(a: CitationAuthor): string {
  const init = initials(a.given);
  return init ? `${init} ${a.family}` : a.family;
}

/** "A. Smith", "A. Smith and B. Lee", "A. Smith, B. Lee, and C. Kim"; over six: "A. Smith et al." */
export function ieeeAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return '';
  if (authors.length > MAX_AUTHORS) return `${authorName(authors[0])} et al.`;
  const names = authors.map(authorName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function field(value: string | number | undefined, name: string): string {
  return value === undefined || value === '' ? `[incomplete: ${name}]` : String(value);
}

function pageRange(pages: string): string {
  const p = pages.replace(/\s*[-–—]\s*/, '–');
  return `${/[–,]/.test(p) ? 'pp.' : 'p.'} ${p}`;
}

function accessed(record: CitationRecord): string {
  const when = record.accessedAt ? new Date(record.accessedAt) : new Date();
  const d = Number.isNaN(when.getTime()) ? new Date() : when;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function link(record: CitationRecord): string | undefined {
  return record.doi ? `https://doi.org/${record.doi}` : record.url;
}

function who(record: CitationRecord): string {
  return ieeeAuthors(record.authors) || record.publisher || '[incomplete: authors]';
}

function journalArticle(record: CitationRecord): string {
  const parts = [
    `${who(record)}, "${field(record.title, 'title')},"`,
    `${field(record.journalAbbrev ?? record.journal, 'journal')}`,
    record.volume ? `vol. ${record.volume}` : '',
    record.issue ? `no. ${record.issue}` : '',
    record.pages ? pageRange(record.pages) : '',
    field(record.year, 'year'),
  ].filter(Boolean);
  const line = `${parts.slice(0, 1).join('')} ${parts.slice(1).join(', ')}`;
  return record.doi ? `${line}, doi: ${record.doi}.` : `${line}.`;
}

// The style file has no layout for preprints or datasets; they take the general one:
// authors, "Title," Server or repository, year, doi: or URL.
function generic(record: CitationRecord, container: string, containerName: string): string {
  const line = `${who(record)}, "${field(record.title, 'title')}," ${field(container, containerName)}, ${field(record.year, 'year')}`;
  if (record.doi) return `${line}, doi: ${record.doi}.`;
  return record.url ? `${line}. [Online]. Available: ${record.url}` : `${line}.`;
}

function preprint(record: CitationRecord): string {
  return generic(record, record.journal ?? record.publisher ?? '', 'server');
}

function dataset(record: CitationRecord): string {
  return generic(record, record.publisher ?? '', 'repository');
}

function bookChapter(record: CitationRecord): string {
  const editors = record.editors?.length ? `, ${ieeeAuthors(record.editors)}, Ed${record.editors.length > 1 ? 's' : ''}.` : '';
  const place = record.publisherPlace ? `${record.publisherPlace}: ` : '';
  const publisher = record.publisher ? `${place}${record.publisher}` : '[incomplete: publisher]';
  const pages = record.pages ? `, ${pageRange(record.pages)}` : '';
  return `${who(record)}, "${field(record.title, 'chapter title')}," in ${field(record.journal, 'book title')}${editors} ${publisher}, ${field(record.year, 'year')}${pages}.`;
}

function report(record: CitationRecord): string {
  const place = record.publisherPlace ? `, ${record.publisherPlace}` : '';
  const number = record.reportNumber ? `, Rep. ${record.reportNumber}` : '';
  return `${who(record)}, "${field(record.title, 'title')}," ${field(record.publisher, 'publisher')}${place}${number}, ${field(record.year, 'year')}.`;
}

function webPage(record: CitationRecord): string {
  const site = record.publisher ? ` ${record.publisher}.` : '';
  const url = link(record);
  return `${who(record)}, "${field(record.title, 'title')},"${site} Accessed: ${accessed(record)}. [Online]. Available: ${url ?? '[incomplete: URL]'}`;
}

export function formatIeee(record: CitationRecord): string | null {
  switch (record.sourceType) {
    case 'journal_article':
      return journalArticle(record);
    case 'preprint':
      return preprint(record);
    case 'dataset':
      return dataset(record);
    case 'book_chapter':
      return bookChapter(record);
    case 'report':
      return report(record);
    case 'web_page':
      return webPage(record);
    default:
      return null;
  }
}
