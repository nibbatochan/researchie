// APA 7 formatter. Patterns come from the APA "Common Reference Examples" handout
// (https://apastyle.apa.org/instructional-aids/reference-examples.pdf, sections 10.1, 10.3,
// 10.4, 10.8, 10.9, 10.16), fetched 2026-10-12. The handout italicises journal names, book
// titles and volumes; plain text cannot show that, so none is added.
// Not in the handout: the 21+ author rule (first 19, ". . .", last), taken from the
// Publication Manual, and sentence-case conversion, which is left to the source's own case.

import type { CitationAuthor, CitationRecord } from './types';

const MAX_AUTHORS = 20;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Jean-Pierre Marie" becomes "J.-P. M." */
function initials(given?: string): string {
  if (!given) return '';
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((name) =>
      name
        .split('-')
        .filter(Boolean)
        .map((part) => `${part[0].toUpperCase()}.`)
        .join('-'),
    )
    .join(' ');
}

/** Last name first: "Niepel, C." Group authors have no given name and stay whole. */
function referenceName(a: CitationAuthor): string {
  const init = initials(a.given);
  return init ? `${a.family}, ${init}` : a.family;
}

/** Initials first, used for book editors: "C. Maykel". */
function editorName(a: CitationAuthor): string {
  const init = initials(a.given);
  return init ? `${init} ${a.family}` : a.family;
}

function authorList(authors: CitationAuthor[]): string {
  const names = authors.map(referenceName);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length > MAX_AUTHORS) {
    return `${names.slice(0, MAX_AUTHORS - 1).join(', ')}, . . . ${names[names.length - 1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
}

function editorList(editors: CitationAuthor[]): string {
  const names = editors.map(editorName);
  const joined = names.length <= 2 ? names.join(' & ') : `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
  return `${joined} (${editors.length > 1 ? 'Eds.' : 'Ed.'})`;
}

/** Ends the text with one full stop, unless it already ends in sentence punctuation. */
function end(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

function link(record: CitationRecord): string | undefined {
  return record.doi ? `https://doi.org/${record.doi}` : record.url;
}

function pageRange(pages?: string): string | undefined {
  return pages?.replace(/(\w)\s*-\s*(\w)/, '$1–$2');
}

function join(parts: Array<string | undefined>): string {
  return parts.filter((p): p is string => !!p && p.length > 0).join(' ');
}

function retrieved(record: CitationRecord): string | undefined {
  if (!record.accessedAt || record.year) return undefined;
  const d = new Date(record.accessedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return `Retrieved ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, from`;
}

const year = (record: CitationRecord) => `(${record.year ?? 'n.d.'}).`;

function journalArticle(record: CitationRecord): string {
  const volume = record.volume ? `${record.volume}${record.issue ? `(${record.issue})` : ''}` : '';
  const source = [record.journal, volume, pageRange(record.pages)].filter(Boolean).join(', ');
  return join([
    end(authorList(record.authors)),
    year(record),
    end(record.title ?? ''),
    source ? `${source}.` : undefined,
    link(record),
  ]);
}

function bookChapter(record: CitationRecord): string {
  const pages = pageRange(record.pages);
  const book = `${record.journal ?? ''}${pages ? ` (pp. ${pages})` : ''}`;
  const inPart = record.editors?.length ? `In ${editorList(record.editors)}, ${book}.` : book ? `In ${book}.` : undefined;
  return join([end(authorList(record.authors)), year(record), end(record.title ?? ''), inPart, record.publisher ? end(record.publisher) : undefined, link(record)]);
}

function report(record: CitationRecord): string {
  return join([end(authorList(record.authors)), year(record), end(record.title ?? ''), record.publisher ? end(record.publisher) : undefined, link(record)]);
}

function preprint(record: CitationRecord): string {
  const server = record.journal ?? record.publisher;
  return join([end(authorList(record.authors)), year(record), end(record.title ?? ''), server ? end(server) : undefined, link(record)]);
}

function dataset(record: CitationRecord): string {
  return join([
    end(authorList(record.authors)),
    year(record),
    `${(record.title ?? '').replace(/[.?!]$/, '')} [Data set].`,
    record.publisher ? end(record.publisher) : undefined,
    link(record),
  ]);
}

function webPage(record: CitationRecord): string {
  const siteSameAsAuthor = record.authors.length === 1 && record.authors[0].family === record.publisher;
  const site = record.publisher && !siteSameAsAuthor ? end(record.publisher) : undefined;
  const lead = record.authors.length > 0 ? [end(authorList(record.authors)), year(record), end(record.title ?? '')] : [end(record.title ?? ''), year(record)];
  return join([...lead, site, retrieved(record), link(record)]);
}

export function formatApa(record: CitationRecord): string | null {
  switch (record.sourceType) {
    case 'journal_article':
      return journalArticle(record);
    case 'book_chapter':
      return bookChapter(record);
    case 'report':
      return report(record);
    case 'preprint':
      return preprint(record);
    case 'dataset':
      return dataset(record);
    case 'web_page':
      return webPage(record);
    default:
      return null;
  }
}
