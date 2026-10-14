// Vancouver (ICMJE / NLM) formatter for journal articles, preprints, datasets, book
// chapters, reports and web pages. Unknown sources return null. Patterns follow the
// NLM Samples of Formatted References (items 23, 34, 43; see docs/CITATION_API_RESEARCH.md,
// section 5). ICMJE: list up to six authors, then "et al.".

import type { CitationAuthor, CitationRecord } from './types';

const MAX_AUTHORS_BEFORE_ET_AL = 6;

function initials(given?: string): string {
  if (!given) return '';
  return given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function formatAuthor(author: CitationAuthor): string {
  return [author.family, initials(author.given)].filter(Boolean).join(' ');
}

function formatAuthors(authors: CitationAuthor[]): string {
  if (authors.length === 0) return '[incomplete: authors]';
  const shown = authors.slice(0, MAX_AUTHORS_BEFORE_ET_AL).map(formatAuthor).join(', ');
  return authors.length > MAX_AUTHORS_BEFORE_ET_AL ? `${shown}, et al` : shown;
}

function field(value: string | number | undefined, name: string): string {
  return value === undefined || value === '' ? `[incomplete: ${name}]` : String(value);
}

function sentence(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

export interface VancouverOptions {
  /** Date used for "[cited ...]". Defaults to the record's accessedAt, then today. */
  citedOn?: Date;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** NLM date form: "2017 Feb 9". */
export function nlmDate(date: Date): string {
  return `${date.getFullYear()} ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function citedDate(record: CitationRecord, options: VancouverOptions): string {
  const when = options.citedOn ?? (record.accessedAt ? new Date(record.accessedAt) : new Date());
  return nlmDate(Number.isNaN(when.getTime()) ? new Date() : when);
}

function availableFrom(record: CitationRecord): string {
  const link = record.doi ? `https://doi.org/${record.doi}` : record.url;
  return link ? `Available from: ${link}` : 'Available from: [incomplete: DOI or URL]';
}

function journalArticle(record: CitationRecord): string {
  const parts = [
    `${sentence(formatAuthors(record.authors))}`,
    `${sentence(field(record.title, 'title'))}`,
    `${sentence(field(record.journalAbbrev ?? record.journal, 'journal'))}`,
  ];

  const volume = field(record.volume, 'volume');
  const issue = record.issue ? `(${record.issue})` : '';
  const pages = field(record.pages, 'pages');
  parts.push(`${field(record.year, 'year')};${volume}${issue}:${pages}.`);

  if (record.doi) parts.push(`doi:${record.doi}`);
  return parts.join(' ');
}

// Authors. Title. Server [Preprint]. Year [cited date]. Available from: link
function preprint(record: CitationRecord, options: VancouverOptions): string {
  return [
    sentence(formatAuthors(record.authors)),
    sentence(field(record.title, 'title')),
    `${field(record.journal ?? record.publisher, 'server')} [Preprint].`,
    `${field(record.year, 'year')} [cited ${citedDate(record, options)}].`,
    availableFrom(record),
  ].join(' ');
}

// Authors. Title [dataset]. Year [cited date]. Repository. Available from: link
function dataset(record: CitationRecord, options: VancouverOptions): string {
  return [
    sentence(formatAuthors(record.authors)),
    `${field(record.title, 'title').replace(/[.?!]$/, '')} [dataset].`,
    `${field(record.year, 'year')} [cited ${citedDate(record, options)}].`,
    sentence(field(record.publisher, 'repository')),
    availableFrom(record),
  ].join(' ');
}

// Chapter authors. Chapter title. In: Editors, editors. Book title. Place: Publisher; Year. p. pages.
function bookChapter(record: CitationRecord): string {
  const editors = record.editors?.length ? `${formatAuthors(record.editors)}, editor${record.editors.length > 1 ? 's' : ''}. ` : '';
  const publisher = record.publisher
    ? `${record.publisherPlace ? `${record.publisherPlace}: ` : ''}${record.publisher}; `
    : '';
  const pages = record.pages ? ` p. ${record.pages}.` : '';
  const line = [
    sentence(formatAuthors(record.authors)),
    sentence(field(record.title, 'title')),
    `In: ${editors}${sentence(field(record.journal, 'book title'))}`,
    `${publisher}${field(record.year, 'year')}.${pages}`,
  ].join(' ');
  return record.doi ? `${line} doi:${record.doi}` : line;
}

// Authors. Title. Place: Agency; Year. Report No.: number. doi:10.xxxx
function report(record: CitationRecord): string {
  const line = [
    sentence(formatAuthors(record.authors)),
    sentence(field(record.title, 'title')),
    `${record.publisher ? `${record.publisherPlace ? `${record.publisherPlace}: ` : ''}${record.publisher}; ` : ''}${field(record.year, 'year')}.`,
    record.reportNumber ? `Report No.: ${record.reportNumber}.` : undefined,
  ].filter(Boolean).join(' ');
  return record.doi ? `${line} doi:${record.doi}` : line;
}

// The date a page says it was last updated. A bare YYYY-MM-DD is read as a local date,
// so a timezone never moves it to the day before.
function updatedOn(record: CitationRecord): Date | undefined {
  if (!record.updatedAt) return undefined;
  const day = record.updatedAt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const when = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(record.updatedAt);
  return Number.isNaN(when.getTime()) ? undefined : when;
}

function siteName(record: CitationRecord): string | undefined {
  if (record.publisher) return record.publisher;
  try {
    return record.url ? new URL(record.url).hostname.replace(/^www\./, '') : undefined;
  } catch {
    return undefined;
  }
}

// Part of a Web site (NLM Citing Medicine, chapter 25): Place: Site [Internet]. Part title; year [updated date; cited date]. Available from: URL
// The place is shown only when the record has one; the extension does not read it from the page.
function webPage(record: CitationRecord, options: VancouverOptions): string {
  const year = record.year ? `${record.year} ` : '';
  const updated = updatedOn(record);
  const dates = updated
    ? `[updated ${nlmDate(updated)}; cited ${citedDate(record, options)}].`
    : `[cited ${citedDate(record, options)}].`;
  return [
    `${record.publisherPlace ? `${record.publisherPlace}: ` : ''}${field(siteName(record), 'site name')} [Internet].`,
    `${field(record.title, 'title')};`,
    `${year}${dates}`,
    availableFrom(record),
  ].join(' ');
}

export function formatVancouver(record: CitationRecord, options: VancouverOptions = {}): string | null {
  switch (record.sourceType) {
    case 'journal_article':
      return journalArticle(record);
    case 'preprint':
      return preprint(record, options);
    case 'dataset':
      return dataset(record, options);
    case 'book_chapter':
      return bookChapter(record);
    case 'report':
      return report(record);
    case 'web_page':
      return webPage(record, options);
    default:
      return null;
  }
}
