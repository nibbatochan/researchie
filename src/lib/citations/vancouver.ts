// Vancouver (ICMJE) formatter. Journal articles only for now; other source
// types return null until their field rules are verified (see
// docs/CITATION_API_RESEARCH.md, section 5).
// ICMJE: list up to six authors, then "et al.".

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

export function formatVancouver(record: CitationRecord): string | null {
  if (record.sourceType !== 'journal_article') return null;

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
