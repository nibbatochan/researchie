// MLA 9 formatter (works-cited entry) and in-text authors. Core elements in MLA order:
//   Author. "Title." Container, Number, Publisher, Date, Location.
// Written from the MLA 9 core-element rules as the author knows them; NOT checked against the MLA Handbook itself
// (it is paid) or a CSL file. Plain text cannot show italics, so none is added. Missing fields show as
// "[incomplete: field]", never guessed. Unknown source types return null.

import type { CitationAuthor, CitationRecord } from './types';

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

const fullName = (a: CitationAuthor) => (a.given ? `${a.given} ${a.family}` : a.family);
const invertedName = (a: CitationAuthor) => (a.given ? `${a.family}, ${a.given}` : a.family);

/** "Lee, Jane A.", "Lee, Jane A., and Raj Patel", "Lee, Jane A., et al." (three or more). */
export function mlaAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return invertedName(authors[0]);
  if (authors.length === 2) return `${invertedName(authors[0])}, and ${fullName(authors[1])}`;
  return `${invertedName(authors[0])}, et al.`;
}

/** The author part of an in-text citation: "Lee", "Lee and Patel", "Lee et al." */
export function mlaInTextAuthors(authors: CitationAuthor[]): string {
  const f = authors.map((a) => a.family);
  if (f.length === 0) return '';
  if (f.length === 1) return f[0];
  if (f.length === 2) return `${f[0]} and ${f[1]}`;
  return `${f[0]} et al.`;
}

const end = (text: string) => (/[.?!]$/.test(text) ? text : `${text}.`);
const quoted = (title: string) => `"${end(title.replace(/"/g, "'"))}"`;
const field = (value: string | number | undefined, name: string) => (value === undefined || value === '' ? `[incomplete: ${name}]` : String(value));
const pages = (p: string) => `${/[–,-]/.test(p) ? 'pp.' : 'p.'} ${p.replace(/\s*[–—]\s*/, '-')}`;
const link = (r: CitationRecord) => (r.doi ? `https://doi.org/${r.doi}` : r.url);

function dayMonthYear(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** The pieces after the author and title, joined with commas and closed with a full stop. */
const tail = (parts: Array<string | undefined>) => {
  const kept = parts.filter((p): p is string => !!p);
  return kept.length ? `${kept.join(', ')}.` : undefined;
};

const lead = (r: CitationRecord) => {
  const authors = mlaAuthors(r.authors);
  return authors ? end(authors) : undefined;
};

const join = (parts: Array<string | undefined>) => parts.filter((p): p is string => !!p).join(' ');

function journalArticle(r: CitationRecord): string {
  const container = tail([
    field(r.journal, 'journal'),
    r.volume ? `vol. ${r.volume}` : undefined,
    r.issue ? `no. ${r.issue}` : undefined,
    r.year ? String(r.year) : '[incomplete: year]',
    r.pages ? pages(r.pages) : undefined,
    link(r),
  ]);
  return join([lead(r), quoted(field(r.title, 'title')), container]);
}

function bookChapter(r: CitationRecord): string {
  const editors = r.editors?.length ? `edited by ${r.editors.map(fullName).join(r.editors.length > 2 ? ', ' : ' and ')}` : undefined;
  const container = tail([field(r.journal, 'book title'), editors, r.publisher, r.year ? String(r.year) : '[incomplete: year]', r.pages ? pages(r.pages) : undefined, link(r)]);
  return join([lead(r), quoted(field(r.title, 'chapter title')), container]);
}

function report(r: CitationRecord): string {
  return join([lead(r), end(field(r.title, 'title')), tail([r.publisher, r.year ? String(r.year) : '[incomplete: year]', r.reportNumber ? `Report No. ${r.reportNumber}` : undefined, link(r)])]);
}

function preprint(r: CitationRecord): string {
  return join([lead(r), quoted(field(r.title, 'title')), tail([r.journal ?? r.publisher ?? '[incomplete: server]', r.year ? String(r.year) : '[incomplete: year]', link(r)])]);
}

function dataset(r: CitationRecord): string {
  return join([lead(r), end(field(r.title, 'title')), tail([field(r.publisher, 'repository'), r.year ? String(r.year) : '[incomplete: year]', link(r)])]);
}

function webPage(r: CitationRecord): string {
  const site = r.publisher && !(r.authors.length === 1 && r.authors[0].family === r.publisher) ? r.publisher : undefined;
  const published = dayMonthYear(r.updatedAt) ?? (r.year ? String(r.year) : undefined);
  const accessed = dayMonthYear(r.accessedAt);
  return join([lead(r), quoted(field(r.title, 'title')), tail([site, published, link(r)]), accessed ? `Accessed ${accessed}.` : undefined]);
}

export function formatMla(record: CitationRecord): string | null {
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
