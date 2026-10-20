// Reading reference files exported by Zotero, Mendeley, EndNote, Google Scholar and similar: RIS and BibTeX.
// Pure: text in, citation records out. Nothing is looked up and nothing is guessed: what the file says is kept,
// and what it leaves out is listed in missingFields. Every record is marked as entered by the user (status
// "manual"), because we did not verify it against Crossref.

import type { CitationAuthor, CitationRecord, SourceType } from './types';
import { assessCitation, normalizeTitle, titlesMatch } from './verify.ts';

export type RefFormat = 'ris' | 'bibtex';

export interface ImportedEntry {
  record: CitationRecord;
  key?: string; // the BibTeX citation key or RIS ID, for display
}

export interface ParseResult {
  format: RefFormat | 'unknown';
  entries: ImportedEntry[];
  skipped: number; // blocks that could not be read
}

/** Normalised DOI: lowercase, without the https://doi.org/ prefix. */
export function normalizeDoi(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '').toLowerCase();
  return /^10\.\d{4,9}\/\S+$/.test(cleaned) ? cleaned : undefined;
}

function doiFromText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const found = value.match(/10\.\d{4,9}\/[^\s"<>]+/);
  return normalizeDoi(found?.[0]?.replace(/[.,;)]+$/, ''));
}

/** "Smith, Jane A." or "Jane A. Smith" or a group name. */
export function parseAuthorName(raw: string): CitationAuthor | undefined {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  if (/^\{.*\}$/.test(text)) return { family: text.slice(1, -1).trim() };
  if (text.includes(',')) {
    const [family, ...rest] = text.split(',');
    const given = rest.join(',').trim();
    return given ? { family: family.trim(), given } : { family: family.trim() };
  }
  const parts = text.split(' ');
  if (parts.length === 1) return { family: parts[0] };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

function yearOf(value: string | undefined): number | undefined {
  const m = value?.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function finish(record: Omit<CitationRecord, 'missingFields' | 'status' | 'resolvedFrom'>): CitationRecord {
  const missing: string[] = [];
  if (!record.title) missing.push('title');
  if (record.authors.length === 0) missing.push('authors');
  if (!record.year) missing.push('year');
  if (record.sourceType === 'journal_article' && !record.journal) missing.push('journal');
  const base: CitationRecord = { ...record, status: 'manual', resolvedFrom: 'import', missingFields: missing, enteredByUser: true };
  return assessCitation(base, undefined, { userEntered: true });
}

// ───────────────────────────── RIS ─────────────────────────────

const RIS_TYPE: Record<string, SourceType> = {
  JOUR: 'journal_article', JFULL: 'journal_article', MGZN: 'journal_article', EJOUR: 'journal_article', CONF: 'journal_article', CPAPER: 'journal_article',
  CHAP: 'book_chapter', BOOK: 'book_chapter', ECHAP: 'book_chapter',
  RPRT: 'report', DATA: 'dataset', ELEC: 'web_page', WEB: 'web_page', BLOG: 'web_page', UNPB: 'preprint', INPR: 'preprint',
};

function parseRisBlock(lines: Array<[string, string]>): ImportedEntry | undefined {
  const get = (...tags: string[]) => lines.find(([t]) => tags.includes(t))?.[1];
  const all = (...tags: string[]) => lines.filter(([t]) => tags.includes(t)).map(([, v]) => v);
  const type = RIS_TYPE[get('TY') ?? ''] ?? 'unknown';
  const title = get('TI', 'T1', 'CT');
  const container = get('JO', 'JF', 'T2', 'BT');
  const start = get('SP');
  const end = get('EP');
  const pages = start ? (end && end !== start ? `${start}-${end}` : start) : undefined;
  const authors = all('AU', 'A1').map(parseAuthorName).filter((a): a is CitationAuthor => !!a);
  const editors = all('ED', 'A2').map(parseAuthorName).filter((a): a is CitationAuthor => !!a);
  const doi = normalizeDoi(get('DO', 'DOI')) ?? doiFromText(get('UR', 'L3', 'LK'));
  const url = get('UR', 'LK');
  if (!title && authors.length === 0 && !doi) return undefined;

  const record = finish({
    sourceType: type,
    doi,
    title: title?.trim(),
    authors,
    journal: container?.trim(),
    journalAbbrev: get('JA', 'J2')?.trim(),
    year: yearOf(get('PY', 'Y1', 'DA')),
    volume: get('VL'),
    issue: get('IS'),
    pages,
    publisher: get('PB'),
    publisherPlace: get('CY'),
    ...(type === 'book_chapter' && editors.length ? { editors } : {}),
    url: url && !/doi\.org/i.test(url) ? url : undefined,
  });
  return { record, key: get('ID') };
}

export function parseRis(text: string): ParseResult {
  const entries: ImportedEntry[] = [];
  let skipped = 0;
  let current: Array<[string, string]> | null = null;
  const flush = () => {
    if (!current) return;
    const entry = parseRisBlock(current);
    if (entry) entries.push(entry);
    else skipped++;
    current = null;
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
    if (!m) {
      // A continuation line belongs to the previous value (long abstracts, titles).
      if (current && current.length && line.trim() && !/^\s*$/.test(line)) current[current.length - 1][1] += ` ${line.trim()}`;
      continue;
    }
    const [, tag, value] = m;
    if (tag === 'TY') { flush(); current = []; }
    if (!current) continue;
    if (tag === 'ER') { flush(); continue; }
    current.push([tag, value.trim()]);
  }
  flush();
  return { format: 'ris', entries, skipped };
}

// ─────────────────────────── BibTeX ────────────────────────────

const LATEX_ACCENTS: Record<string, string> = {
  '"a': 'ä', '"o': 'ö', '"u': 'ü', '"A': 'Ä', '"O': 'Ö', '"U': 'Ü', "'e": 'é', "'a": 'á', "'i": 'í', "'o": 'ó', "'u": 'ú', "'E": 'É',
  '`e': 'è', '`a': 'à', '^e': 'ê', '^o': 'ô', '~n': 'ñ', '~a': 'ã', '~o': 'õ', 'cc': 'ç', 'cC': 'Ç', '"e': 'ë', '"i': 'ï', '^a': 'â', '^i': 'î', '^u': 'û',
};

/** Removes braces and turns common LaTeX accents and dashes into plain characters. */
export function cleanLatex(value: string): string {
  return value
    .replace(/\\([`'^"~])\s*\{?\\?([A-Za-z])\}?/g, (_, mark, letter) => LATEX_ACCENTS[`${mark}${letter}`] ?? letter)
    .replace(/\\c\s*\{?([cC])\}?/g, (_, c) => (c === 'c' ? 'ç' : 'Ç'))
    .replace(/\\ss\b/g, 'ß')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/---/g, '—')
    .replace(/--/g, '-')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const BIB_TYPE: Record<string, SourceType> = {
  article: 'journal_article', inproceedings: 'journal_article', conference: 'journal_article', proceedings: 'journal_article',
  incollection: 'book_chapter', inbook: 'book_chapter', book: 'book_chapter',
  techreport: 'report', report: 'report', dataset: 'dataset', online: 'web_page', electronic: 'web_page', www: 'web_page',
  unpublished: 'preprint',
};

/** Reads `{...}` or `"..."` starting at i; returns the value and the index after it. */
function readBibValue(src: string, i: number): { value: string; next: number } {
  if (src[i] === '{') {
    let depth = 0;
    let j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) break; }
    }
    return { value: src.slice(i + 1, j), next: j + 1 };
  }
  if (src[i] === '"') {
    let j = i + 1;
    let depth = 0;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      else if (src[j] === '"' && depth === 0) break;
    }
    return { value: src.slice(i + 1, j), next: j + 1 };
  }
  const m = src.slice(i).match(/^[^,}\s]+/);
  return { value: m ? m[0] : '', next: i + (m ? m[0].length : 0) };
}

function parseBibFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    const m = body.slice(i).match(/^[\s,]*([A-Za-z][\w:-]*)\s*=\s*/);
    if (!m) break;
    i += m[0].length;
    const { value, next } = readBibValue(body, i);
    fields[m[1].toLowerCase()] = value;
    i = next;
  }
  return fields;
}

/** Splits an author list at "and" outside braces. */
function splitBibAuthors(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  const tokens = value.split(/(\s+and\s+)/i);
  for (const token of tokens) {
    if (/^\s+and\s+$/i.test(token) && depth === 0) { parts.push(current); current = ''; continue; }
    for (const ch of token) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    current += token;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** A name in braces is a group author and stays whole; otherwise accents are cleaned and the name is split. */
function parseBibName(raw: string): CitationAuthor | undefined {
  return /^\{.*\}$/.test(raw.trim()) ? { family: cleanLatex(raw) } : parseAuthorName(cleanLatex(raw));
}

export function parseBibtex(text: string): ParseResult {
  const entries: ImportedEntry[] = [];
  let skipped = 0;
  const re = /@([A-Za-z]+)\s*[{(]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const type = m[1].toLowerCase();
    const open = m.index + m[0].length - 1;
    const { value: inner, next } = readBibValue(text, open);
    re.lastIndex = next;
    if (['comment', 'string', 'preamble'].includes(type)) continue;
    const comma = inner.indexOf(',');
    const key = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const f = parseBibFields(comma === -1 ? '' : inner.slice(comma + 1));
    const clean = (name: string) => (f[name] !== undefined ? cleanLatex(f[name]) : undefined);

    const eprintArxiv = /arxiv/i.test(f.archiveprefix ?? '') || /arxiv/i.test(f.eprinttype ?? '') || /arxiv/i.test(f.journal ?? '');
    const sourceType: SourceType = type === 'misc' && eprintArxiv ? 'preprint' : BIB_TYPE[type] ?? 'unknown';
    const authors = splitBibAuthors(f.author ?? '').map(parseBibName).filter((a): a is CitationAuthor => !!a);
    const editors = splitBibAuthors(f.editor ?? '').map(parseBibName).filter((a): a is CitationAuthor => !!a);
    const title = clean('title');
    const doi = normalizeDoi(clean('doi')) ?? doiFromText(clean('url'));
    if (!title && authors.length === 0 && !doi) { skipped++; continue; }
    const url = clean('url');

    const record = finish({
      sourceType,
      doi,
      title,
      authors,
      journal: clean('journal') ?? clean('journaltitle') ?? clean('booktitle'),
      year: yearOf(f.year ?? f.date),
      volume: clean('volume'),
      issue: clean('number') ?? clean('issue'),
      pages: clean('pages')?.replace(/\s*[-–—]+\s*/, '-'),
      publisher: clean('publisher') ?? clean('institution') ?? clean('organization'),
      publisherPlace: clean('address') ?? clean('location'),
      reportNumber: clean('number') && sourceType === 'report' ? clean('number') : undefined,
      ...(sourceType === 'book_chapter' && editors.length ? { editors } : {}),
      url: url && !/doi\.org/i.test(url) ? url : undefined,
    });
    entries.push({ record, key });
  }
  return { format: 'bibtex', entries, skipped };
}

/** Picks the parser from the text itself, not from the file name. */
export function detectFormat(text: string): RefFormat | 'unknown' {
  if (/^\s*TY\s{2}-/m.test(text)) return 'ris';
  if (/^\s*@[A-Za-z]+\s*[{(]/m.test(text)) return 'bibtex';
  return 'unknown';
}

export function parseReferences(text: string): ParseResult {
  const format = detectFormat(text);
  if (format === 'ris') return parseRis(text);
  if (format === 'bibtex') return parseBibtex(text);
  return { format: 'unknown', entries: [], skipped: 0 };
}

// ─────────────────────────── Matching ──────────────────────────

export interface MatchTarget {
  kind: 'doc' | 'clip';
  id: string;
  title: string; // PDF title or the clip's page title
  altTitles?: string[]; // other names for the same item, for example the file name
  doi?: string;
  hasCitation: boolean; // already has a citation that an import would replace
}

export type MatchHow = 'doi' | 'title';

export interface EntryMatch {
  index: number; // position in the imported list
  status: 'matched' | 'ambiguous' | 'unmatched';
  how?: MatchHow;
  candidates: MatchTarget[]; // matched: one; ambiguous: several; unmatched: none
}

/** Other names a PDF may be known by: the title without a trailing author part, and the file name. */
export function altTitlesFor(title: string, filename?: string): string[] {
  const names: string[] = [];
  const stripped = title.split(/\s+[—–-]\s+/)[0]?.trim();
  if (stripped && stripped !== title) names.push(stripped);
  const base = filename?.replace(/\.[A-Za-z0-9]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (base) names.push(base);
  return names;
}

/**
 * Matches each imported entry to the PDFs and clips of the project: by DOI first, then by title.
 * An entry that fits several targets is ambiguous and is left for the user to pick.
 */
export function matchEntries(entries: ImportedEntry[], targets: MatchTarget[]): EntryMatch[] {
  return entries.map((entry, index) => {
    const doi = normalizeDoi(entry.record.doi);
    if (doi) {
      const hits = targets.filter((t) => normalizeDoi(t.doi) === doi);
      if (hits.length === 1) return { index, status: 'matched', how: 'doi', candidates: hits };
      if (hits.length > 1) return { index, status: 'ambiguous', how: 'doi', candidates: hits };
    }
    const title = entry.record.title;
    if (title && normalizeTitle(title).length >= 8) {
      const hits = targets.filter((t) => [t.title, ...(t.altTitles ?? [])].some((name) => name && titlesMatch(title, name)));
      if (hits.length === 1) return { index, status: 'matched', how: 'title', candidates: hits };
      if (hits.length > 1) return { index, status: 'ambiguous', how: 'title', candidates: hits };
    }
    return { index, status: 'unmatched', candidates: [] };
  });
}
