// Harvard (author-date) formatter. "Harvard" is a family of styles, not one standard; this follows the
// Cite Them Right layout: Author, A.B. (Year) 'Title', Journal, vol(issue), pp. pages. Plain text cannot
// show italics, so none is added. Written from the pattern as known, NOT checked against the Cite Them
// Right book (it is paid): verify the layout and the "four or more authors" in-text rule there, or against
// the CSL style "harvard-cite-them-right" (https://github.com/citation-style-language/styles).
// Unknown sources return null. Missing fields are shown as "[incomplete: field]", never guessed.

import type { CitationAuthor, CitationRecord } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Jane Alice" becomes "J.A."; "Jean-Pierre" becomes "J.-P." */
function initials(given?: string): string {
  if (!given) return '';
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.split('-').filter(Boolean).map((p) => `${p[0].toUpperCase()}.`).join('-'))
    .join('');
}

function referenceName(a: CitationAuthor): string {
  const init = initials(a.given);
  return init ? `${a.family}, ${init}` : a.family;
}

/** "Smith, J., Lee, C. and Kim, D." Group authors have no given name and stay whole. */
export function harvardAuthors(authors: CitationAuthor[]): string {
  const names = authors.map(referenceName);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The author part of an in-text citation: "Smith", "Smith and Lee", "Smith, Lee and Kim", "Smith et al." (four or more). */
export function harvardInTextAuthors(authors: CitationAuthor[]): string {
  const families = authors.map((a) => a.family);
  if (families.length === 0) return '';
  if (families.length === 1) return families[0];
  if (families.length >= 4) return `${families[0]} et al.`;
  return `${families.slice(0, -1).join(', ')} and ${families[families.length - 1]}`;
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
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function availableAt(record: CitationRecord): string {
  const link = record.doi ? `https://doi.org/${record.doi}` : record.url;
  return link ? `Available at: ${link}` : 'Available at: [incomplete: DOI or URL]';
}

export interface HarvardOptions {
  /** "a", "b"... added to the year when two sources share author and year. */
  yearSuffix?: string;
}

function yearOf(record: CitationRecord, options: HarvardOptions): string {
  return `${record.year ?? 'n.d.'}${options.yearSuffix ?? ''}`;
}

function lead(record: CitationRecord, options: HarvardOptions): string {
  const who = harvardAuthors(record.authors) || record.publisher || '[incomplete: authors]';
  return `${who} (${yearOf(record, options)})`;
}

function journalArticle(record: CitationRecord, options: HarvardOptions): string {
  const volume = record.volume ? `${record.volume}${record.issue ? `(${record.issue})` : ''}` : '';
  const tail = [field(record.journal, 'journal'), volume, record.pages ? pageRange(record.pages) : '']
    .filter(Boolean)
    .join(', ');
  const doi = record.doi ? ` doi:${record.doi}` : '';
  return `${lead(record, options)} '${field(record.title, 'title')}', ${tail}.${doi}`;
}

function preprint(record: CitationRecord, options: HarvardOptions): string {
  return `${lead(record, options)} '${field(record.title, 'title')}', ${field(record.journal ?? record.publisher, 'server')} [Preprint]. ${availableAt(record)}`;
}

function dataset(record: CitationRecord, options: HarvardOptions): string {
  return `${lead(record, options)} ${field(record.title, 'title')} [Dataset]. ${field(record.publisher, 'repository')}. ${availableAt(record)}`;
}

function bookChapter(record: CitationRecord, options: HarvardOptions): string {
  const editors = record.editors?.length
    ? `${record.editors.map((e) => [initials(e.given), e.family].filter(Boolean).join(' ')).join(' and ')} (${record.editors.length > 1 ? 'eds.' : 'ed.'}) `
    : '';
  const place = record.publisherPlace ? `${record.publisherPlace}: ` : '';
  const publisher = record.publisher ? `${place}${record.publisher}` : '[incomplete: publisher]';
  const pages = record.pages ? `, ${pageRange(record.pages)}` : '';
  const doi = record.doi ? ` doi:${record.doi}` : '';
  return `${lead(record, options)} '${field(record.title, 'chapter title')}', in ${editors}${field(record.journal, 'book title')}. ${publisher}${pages}.${doi}`;
}

function report(record: CitationRecord, options: HarvardOptions): string {
  const place = record.publisherPlace ? `${record.publisherPlace}: ` : '';
  const publisher = record.publisher ? ` ${place}${record.publisher}` : '';
  const number = record.reportNumber ? ` (${record.reportNumber})` : '';
  return `${lead(record, options)} ${field(record.title, 'title')}.${publisher}${number}.${record.doi ? ` doi:${record.doi}` : ''}`;
}

function webPage(record: CitationRecord, options: HarvardOptions): string {
  return `${lead(record, options)} ${field(record.title, 'title')}. ${availableAt(record)} (Accessed: ${accessed(record)}).`;
}

export function formatHarvard(record: CitationRecord, options: HarvardOptions = {}): string | null {
  switch (record.sourceType) {
    case 'journal_article':
      return journalArticle(record, options);
    case 'preprint':
      return preprint(record, options);
    case 'dataset':
      return dataset(record, options);
    case 'book_chapter':
      return bookChapter(record, options);
    case 'report':
      return report(record, options);
    case 'web_page':
      return webPage(record, options);
    default:
      return null;
  }
}
