// Chicago author-date (17th edition) formatter and in-text authors. Reference entry:
//   Author. Year. "Title." Journal volume (issue): pages. DOI.
// Written from the Chicago Manual of Style author-date rules as the author knows them; NOT checked against the Manual
// itself (it is paid) or a CSL file. Plain text cannot show italics, so none is added. Missing fields show as
// "[incomplete: field]", never guessed. Unknown source types return null. The notes-bibliography variant is not built.

import type { CitationAuthor, CitationRecord } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const fullName = (a: CitationAuthor) => (a.given ? `${a.given} ${a.family}` : a.family);
const invertedName = (a: CitationAuthor) => (a.given ? `${a.family}, ${a.given}` : a.family);

/** First author inverted: "Lee, Jane A., and Raj Patel"; up to ten are listed, more than ten give the first seven and "et al." */
export function chicagoAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return invertedName(authors[0]);
  if (authors.length > 10) return `${[invertedName(authors[0]), ...authors.slice(1, 7).map(fullName)].join(', ')}, et al.`;
  if (authors.length === 2) return `${invertedName(authors[0])}, and ${fullName(authors[1])}`;
  return `${[invertedName(authors[0]), ...authors.slice(1, -1).map(fullName)].join(', ')}, and ${fullName(authors[authors.length - 1])}`;
}

/** The author part of an in-text citation: "Lee", "Lee and Patel", "Lee, Patel, and Kim", "Lee et al." (four or more). */
export function chicagoInTextAuthors(authors: CitationAuthor[]): string {
  const f = authors.map((a) => a.family);
  if (f.length === 0) return '';
  if (f.length === 1) return f[0];
  if (f.length === 2) return `${f[0]} and ${f[1]}`;
  if (f.length === 3) return `${f[0]}, ${f[1]}, and ${f[2]}`;
  return `${f[0]} et al.`;
}

export interface ChicagoOptions {
  /** "a", "b"... added to the year when two sources share author and year. */
  yearSuffix?: string;
}

const end = (text: string) => (/[.?!]$/.test(text) ? text : `${text}.`);
const quoted = (title: string) => `"${end(title.replace(/"/g, "'"))}"`;
const field = (value: string | number | undefined, name: string) => (value === undefined || value === '' ? `[incomplete: ${name}]` : String(value));
const range = (p: string) => p.replace(/\s*[-–—]\s*/, '–');
const link = (r: CitationRecord) => (r.doi ? `https://doi.org/${r.doi}` : r.url);
const join = (parts: Array<string | undefined>) => parts.filter((p): p is string => !!p).join(' ');
const yearOf = (r: CitationRecord, o: ChicagoOptions) => `${r.year ?? 'n.d.'}${o.yearSuffix ?? ''}`;

function lead(r: CitationRecord, o: ChicagoOptions): Array<string | undefined> {
  const authors = chicagoAuthors(r.authors);
  return [authors ? end(authors) : undefined, `${yearOf(r, o)}.`];
}

function journalArticle(r: CitationRecord, o: ChicagoOptions): string {
  const volume = r.volume ? ` ${r.volume}${r.issue ? ` (${r.issue})` : ''}` : '';
  const pages = r.pages ? `: ${range(r.pages)}` : '';
  return join([...lead(r, o), quoted(field(r.title, 'title')), `${field(r.journal, 'journal')}${volume}${pages}.`, link(r) ? end(link(r)!) : undefined]);
}

function bookChapter(r: CitationRecord, o: ChicagoOptions): string {
  const editors = r.editors?.length ? `, edited by ${r.editors.map(fullName).join(r.editors.length > 2 ? ', ' : ' and ')}` : '';
  const pages = r.pages ? `, ${range(r.pages)}` : '';
  const place = r.publisherPlace ? `${r.publisherPlace}: ` : '';
  return join([...lead(r, o), quoted(field(r.title, 'chapter title')), `In ${field(r.journal, 'book title')}${editors}${pages}.`, `${place}${field(r.publisher, 'publisher')}.`, link(r) ? end(link(r)!) : undefined]);
}

function report(r: CitationRecord, o: ChicagoOptions): string {
  const place = r.publisherPlace ? `${r.publisherPlace}: ` : '';
  const number = r.reportNumber ? ` Report No. ${r.reportNumber}.` : '';
  return join([...lead(r, o), end(field(r.title, 'title')), `${place}${field(r.publisher, 'publisher')}.${number}`.trim(), link(r) ? end(link(r)!) : undefined]);
}

function preprint(r: CitationRecord, o: ChicagoOptions): string {
  return join([...lead(r, o), quoted(field(r.title, 'title')), end(r.journal ?? r.publisher ?? '[incomplete: server]'), link(r) ? end(link(r)!) : undefined]);
}

function dataset(r: CitationRecord, o: ChicagoOptions): string {
  return join([...lead(r, o), end(field(r.title, 'title')), 'Dataset.', end(field(r.publisher, 'repository')), link(r) ? end(link(r)!) : undefined]);
}

function webPage(r: CitationRecord, o: ChicagoOptions): string {
  const site = r.publisher && !(r.authors.length === 1 && r.authors[0].family === r.publisher) ? end(r.publisher) : undefined;
  const d = r.updatedAt ? new Date(r.updatedAt) : null;
  const published = d && !Number.isNaN(d.getTime()) ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}.` : undefined;
  const a = r.accessedAt ? new Date(r.accessedAt) : null;
  const accessed = a && !Number.isNaN(a.getTime()) && !published ? `Accessed ${MONTHS[a.getMonth()]} ${a.getDate()}, ${a.getFullYear()}.` : undefined;
  return join([...lead(r, o), quoted(field(r.title, 'title')), site, published, accessed, link(r) ? end(link(r)!) : undefined]);
}

export function formatChicago(record: CitationRecord, options: ChicagoOptions = {}): string | null {
  switch (record.sourceType) {
    case 'journal_article':
      return journalArticle(record, options);
    case 'book_chapter':
      return bookChapter(record, options);
    case 'report':
      return report(record, options);
    case 'preprint':
      return preprint(record, options);
    case 'dataset':
      return dataset(record, options);
    case 'web_page':
      return webPage(record, options);
    default:
      return null;
  }
}
