// AMA 11th edition formatter. Plain text, no italics (same convention as apa.ts): AMA italicises the
// journal name, which plain text cannot show, so none is added.
// Verified only against JAMA "Instructions for Authors", References section
// (https://jamanetwork.com/journals/jama/pages/instructions-for-authors), fetched 2026-10-13:
//  - author rule: "List all authors and/or editors up to 6; if more than 6, list the first 3 followed by et al."
//  - journal article: "Authors. Title. Journal. year;volume(issue):pages. doi:10.xxxx" (journal abbreviated per PubMed)
//  - web page: "Organisation. Title. URL. Accessed Month D, YYYY."
// Preprints, datasets, book chapters and reports had no example on that page, so they return null.
// Names are written surname then initials without periods, as in the examples.

import type { CitationAuthor, CitationRecord } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Jean-Pierre Marie" becomes "JPM" */
function initials(given?: string): string {
  if (!given) return '';
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function name(a: CitationAuthor): string {
  const init = initials(a.given);
  return init ? `${a.family} ${init}` : a.family;
}

function authorList(authors: CitationAuthor[]): string {
  if (authors.length === 0) return '';
  if (authors.length > 6) return `${authors.slice(0, 3).map(name).join(', ')}, et al`;
  return authors.map(name).join(', ');
}

/** Ends the text with one full stop, unless it already ends in sentence punctuation. */
function end(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

function join(parts: Array<string | undefined>): string {
  return parts.filter((p): p is string => !!p && p.length > 0).join(' ');
}

function journalArticle(record: CitationRecord): string {
  const issue = record.issue ? `(${record.issue})` : '';
  const volume = record.volume ? `${record.volume}${issue}` : '';
  const pages = record.pages ? `:${record.pages}` : '';
  const journal = record.journalAbbrev ?? record.journal;
  const date = [record.year ? String(record.year) : '', volume ? `${record.year ? ';' : ''}${volume}` : '', pages].join('');
  return join([
    record.authors.length ? end(authorList(record.authors)) : undefined,
    end(record.title ?? ''),
    journal ? end(journal) : undefined,
    date ? end(date) : undefined,
    record.doi ? `doi:${record.doi}` : undefined,
  ]);
}

function webPage(record: CitationRecord): string {
  const org = record.authors.length ? authorList(record.authors) : record.publisher;
  let accessed: string | undefined;
  if (record.accessedAt) {
    const d = new Date(record.accessedAt);
    if (!Number.isNaN(d.getTime())) accessed = `Accessed ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}.`;
  }
  return join([org ? end(org) : undefined, end(record.title ?? ''), record.url ? end(record.url) : undefined, accessed]);
}

export function formatAma(record: CitationRecord): string | null {
  switch (record.sourceType) {
    case 'journal_article':
      return journalArticle(record);
    case 'web_page':
      return webPage(record);
    default:
      return null;
  }
}
