// BibTeX and RIS output for a citation record. Pure: no network, no React.
// A missing field is left out, never guessed.

import type { CitationAuthor, CitationRecord } from './types';

// ─── BibTeX ───

const BIBTEX_SPECIALS: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

function bibEscape(text: string): string {
  return text.replace(/[\\&%$#_{}~^]/g, (ch) => BIBTEX_SPECIALS[ch]);
}

function bibAuthors(authors: CitationAuthor[]): string {
  return authors.map((a) => (a.given ? `${bibEscape(a.family)}, ${bibEscape(a.given)}` : `{${bibEscape(a.family)}}`)).join(' and ');
}

function bibKey(record: CitationRecord): string {
  const family = (record.authors[0]?.family ?? 'anon').normalize('NFKD').replace(/[^A-Za-z]/g, '').toLowerCase() || 'anon';
  const word = (record.title ?? '').toLowerCase().match(/[a-z]{4,}/)?.[0] ?? '';
  return `${family}${record.year ?? ''}${word}`;
}

const BIBTEX_TYPE: Record<string, string> = {
  journal_article: 'article',
  preprint: 'misc',
  dataset: 'misc',
  book_chapter: 'incollection',
  report: 'techreport',
  web_page: 'misc',
  unknown: 'misc',
};

export function toBibTeX(record: CitationRecord): string {
  const type = BIBTEX_TYPE[record.sourceType] ?? 'misc';
  const fields: Array<[string, string | undefined]> = [
    ['author', record.authors.length ? bibAuthors(record.authors) : undefined],
    ['title', record.title ? `{${bibEscape(record.title)}}` : undefined],
  ];

  if (record.sourceType === 'journal_article') {
    fields.push(['journal', record.journal ? bibEscape(record.journal) : undefined]);
  } else if (record.sourceType === 'book_chapter') {
    fields.push(['booktitle', record.journal ? bibEscape(record.journal) : undefined]);
    fields.push(['editor', record.editors?.length ? bibAuthors(record.editors) : undefined]);
  } else if (record.sourceType === 'preprint') {
    fields.push(['howpublished', record.journal ? `${bibEscape(record.journal)} (preprint)` : 'Preprint']);
  } else if (record.sourceType === 'dataset') {
    fields.push(['howpublished', 'Dataset']);
  }

  fields.push(
    ['year', record.year ? String(record.year) : undefined],
    ['volume', record.volume],
    ['number', record.issue],
    ['pages', record.pages ? record.pages.replace(/(\d)\s*[-–]\s*(\d)/, '$1--$2') : undefined],
    ['publisher', record.publisher ? bibEscape(record.publisher) : undefined],
    ['address', record.publisherPlace ? bibEscape(record.publisherPlace) : undefined],
    ['doi', record.doi],
    ['url', record.url ?? (record.doi ? `https://doi.org/${record.doi}` : undefined)],
    ['pmid', record.pmid],
    ['note', record.accessedAt ? `Accessed ${record.accessedAt.slice(0, 10)}` : undefined],
  );

  const body = fields
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([name, value]) => `  ${name} = {${value}}`)
    .join(',\n');
  return `@${type}{${bibKey(record)},\n${body}\n}`;
}

// ─── RIS ───

const RIS_TYPE: Record<string, string> = {
  journal_article: 'JOUR',
  preprint: 'UNPB',
  dataset: 'DATA',
  book_chapter: 'CHAP',
  report: 'RPRT',
  web_page: 'ELEC',
  unknown: 'GEN',
};

function risName(a: CitationAuthor): string {
  return a.given ? `${a.family}, ${a.given}` : a.family;
}

export function toRIS(record: CitationRecord): string {
  const lines: Array<[string, string | undefined]> = [['TY', RIS_TYPE[record.sourceType] ?? 'GEN']];
  for (const a of record.authors) lines.push(['AU', risName(a)]);
  for (const e of record.editors ?? []) lines.push(['A2', risName(e)]);
  lines.push(['TI', record.title]);
  // T2 is the container: journal, book, or preprint server.
  lines.push(['T2', record.journal]);
  lines.push(['PY', record.year ? String(record.year) : undefined]);
  lines.push(['VL', record.volume]);
  lines.push(['IS', record.issue]);
  if (record.pages) {
    const [start, end] = record.pages.split(/\s*[-–]\s*/);
    lines.push(['SP', start]);
    lines.push(['EP', end]);
  }
  lines.push(['PB', record.publisher]);
  lines.push(['CY', record.publisherPlace]);
  lines.push(['DO', record.doi]);
  lines.push(['UR', record.url ?? (record.doi ? `https://doi.org/${record.doi}` : undefined)]);
  lines.push(['AN', record.pmid]);
  if (record.accessedAt) lines.push(['Y2', record.accessedAt.slice(0, 10).replace(/-/g, '/')]);
  lines.push(['ER', '']);

  return lines
    .filter(([tag, value]) => tag === 'ER' || (value !== undefined && value !== ''))
    .map(([tag, value]) => `${tag}  - ${value}`.trimEnd())
    .join('\n');
}
