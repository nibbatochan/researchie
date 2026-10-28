// In-text citations and the reference list, in seven styles:
//   harvard: author-date, "(Smith and Lee, 2020)". The list is alphabetical.
//   apa:     author-date, "(Smith & Lee, 2020)"; three or more authors "Smith et al."; several sources alphabetical.
//   mla:     author and page, "(Lee and Patel 14)"; the list is the alphabetical works cited.
//   chicago: author-date without a comma, "(Lee and Patel 2020, 14)"; the list is alphabetical.
//   ieee:    numbered, "[1]". Numbers follow the order of first citation. The list is in that order.
//   vancouver: numbered in round brackets, "(1)", "(1,3)", "(1-3)": runs of three or more numbers collapse to a range.
//   ama:     numbered in superscript, "¹", "¹,³", "¹⁻³". Vancouver and AMA lists are numbered in order of first citation.
//            Several numbers read "[1], [2], [3]": the ieee.csl style (IEEE Reference Guide version 11.29.2023)
//            sets no range collapse, so none is made here. The Reference Guide itself may prefer "[1]–[3]";
//            it did not load when this was checked.
// Pure: one list of citation groups in, markers and a reference list out. Switching style re-renders from
// the same input; the document itself never changes. A marker is a list of parts so the screen can make
// each source a link to its entry in the reference list.

import type { CitationRecord } from './types';
import { formatHarvard, harvardInTextAuthors } from './harvard.ts';
import { formatIeee } from './ieee.ts';
import { formatApa } from './apa.ts';
import { formatVancouver } from './vancouver.ts';
import { formatAma } from './ama.ts';
import { formatMla, mlaInTextAuthors } from './mla.ts';
import { formatChicago, chicagoInTextAuthors } from './chicago.ts';

export type InTextStyle = 'harvard' | 'apa' | 'mla' | 'chicago' | 'ieee' | 'vancouver' | 'ama';

export const IN_TEXT_STYLES: ReadonlyArray<{ id: InTextStyle; label: string; hint: string }> = [
  { id: 'harvard', label: 'Harvard', hint: 'Author-date, for example (Smith, 2020)' },
  { id: 'apa', label: 'APA 7', hint: 'Author-date, for example (Smith & Lee, 2020)' },
  { id: 'mla', label: 'MLA 9', hint: 'Author and page, for example (Lee and Patel 14)' },
  { id: 'chicago', label: 'Chicago (author-date)', hint: 'Author and year, for example (Lee and Patel 2020, 14)' },
  { id: 'ieee', label: 'Numbered (IEEE)', hint: 'Numbers in order of first use, for example [1]' },
  { id: 'vancouver', label: 'Vancouver', hint: 'Numbers in round brackets, for example (1-3)' },
  { id: 'ama', label: 'AMA', hint: 'Superscript numbers, for example ¹' },
];

export interface CitedSource {
  sourceId: string; // the clip (or document) the reference comes from
  record: CitationRecord;
  page?: string | number; // page of the quote, shown for a direct quote: (Smith, 2020, p. 14)
}

export interface MarkerPart {
  text: string;
  sourceId?: string; // set when this part links to a reference
}

export interface RenderedReference {
  sourceId: string;
  label: string; // "[1]" for numbered, "" for author-date
  text: string;
  incomplete: boolean; // the source type has no formatter, or the record is missing fields
}

export interface RenderedCitations {
  markers: MarkerPart[][]; // one per input group, same order
  references: RenderedReference[];
}

/** APA names the authors in the text with "&" between two and "et al." from three. */
function apaInTextAuthors(authors: CitationRecord['authors']): string {
  const families = authors.map((a) => a.family);
  if (families.length === 0) return '';
  if (families.length === 1) return families[0];
  if (families.length === 2) return `${families[0]} & ${families[1]}`;
  return `${families[0]} et al.`;
}

function authorPartWith(record: CitationRecord, inText: (a: CitationRecord['authors']) => string): string {
  const authors = inText(record.authors);
  if (authors) return authors;
  if (record.publisher) return record.publisher;
  const words = (record.title ?? '').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  return words ? `${words}…` : 'Anon.';
}

const authorPart = (record: CitationRecord): string => authorPartWith(record, harvardInTextAuthors);

function firstSeen(groups: CitedSource[][]): CitedSource[] {
  const seen = new Map<string, CitedSource>();
  for (const group of groups) for (const item of group) if (!seen.has(item.sourceId)) seen.set(item.sourceId, item);
  return [...seen.values()];
}

/** "a", "b" for sources that share the same author part and year. */
function yearSuffixes(sources: CitedSource[], who: (r: CitationRecord) => string = authorPart): Map<string, string> {
  const byKey = new Map<string, CitedSource[]>();
  for (const s of sources) {
    const key = `${who(s.record).toLowerCase()}|${s.record.year ?? 'n.d.'}`;
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }
  const suffixes = new Map<string, string>();
  for (const same of byKey.values()) {
    if (same.length < 2) continue;
    [...same]
      .sort((a, b) => (a.record.title ?? '').localeCompare(b.record.title ?? ''))
      .forEach((s, i) => suffixes.set(s.sourceId, String.fromCharCode(97 + (i % 26))));
  }
  return suffixes;
}

interface AuthorDate {
  who: (r: CitationRecord) => string;
  /** The reference text for a source, with the year suffix ("a", "b") when two share author and year. */
  format: (r: CitationRecord, suffix: string | undefined) => string | null;
  /** How several sources in one bracket are ordered. */
  order: (a: CitedSource, b: CitedSource) => number;
  /** Between the author and the year: ", " (Lee, 2020) by default, " " in Chicago (Lee 2020). */
  afterAuthor?: string;
  /** The page part of a marker, with what comes before it: ", p. 14" by default. */
  locator?: (page: string | number | undefined) => string;
  /** MLA names no year in the text: (Lee 14). */
  noYear?: boolean;
}

const HARVARD: AuthorDate = {
  who: authorPart,
  format: (r, suffix) => formatHarvard(r, { yearSuffix: suffix }),
  // Oldest first, then by author, as Cite Them Right orders several sources in one bracket.
  order: (a, b) => (a.record.year ?? 0) - (b.record.year ?? 0) || authorPart(a.record).localeCompare(authorPart(b.record)),
};

const apaWho = (r: CitationRecord) => authorPartWith(r, apaInTextAuthors);
const APA: AuthorDate = {
  who: apaWho,
  format: (r, suffix) => {
    const text = formatApa(r);
    // APA puts the letter on the year in the list too: "(2020a)"
    return text && suffix && r.year ? text.replace(`(${r.year})`, `(${r.year}${suffix})`) : text;
  },
  // APA orders several sources in one bracket alphabetically by author, then by year.
  order: (a, b) => apaWho(a.record).localeCompare(apaWho(b.record)) || (a.record.year ?? 0) - (b.record.year ?? 0),
};

const chicagoWho = (r: CitationRecord) => authorPartWith(r, chicagoInTextAuthors);
const CHICAGO: AuthorDate = {
  who: chicagoWho,
  format: (r, suffix) => formatChicago(r, { yearSuffix: suffix }),
  order: (a, b) => chicagoWho(a.record).localeCompare(chicagoWho(b.record)) || (a.record.year ?? 0) - (b.record.year ?? 0),
  afterAuthor: ' ',
  locator: (page) => (page !== undefined && page !== '' ? `, ${page}` : ''),
};

const mlaWho = (r: CitationRecord) => authorPartWith(r, mlaInTextAuthors);
const MLA: AuthorDate = {
  who: mlaWho,
  format: (r) => formatMla(r),
  order: (a, b) => mlaWho(a.record).localeCompare(mlaWho(b.record)),
  locator: (page) => (page !== undefined && page !== '' ? ` ${page}` : ''),
  noYear: true,
};

function renderAuthorDate(groups: CitedSource[][], cfg: AuthorDate): RenderedCitations {
  const sources = firstSeen(groups);
  const suffixes = yearSuffixes(sources, cfg.who);
  const authorPart = cfg.who; // inside this renderer the author part is the style's own
  const year = (s: CitedSource) => `${s.record.year ?? 'n.d.'}${suffixes.get(s.sourceId) ?? ''}`;

  const markers = groups.map((group) => {
    const unique = group.filter((item, i) => group.findIndex((o) => o.sourceId === item.sourceId && o.page === item.page) === i);
    const ordered = [...unique].sort(cfg.order);
    const parts: MarkerPart[] = [{ text: '(' }];
    const locatorOf = (item: CitedSource) =>
      cfg.locator ? cfg.locator(item.page) : item.page !== undefined && item.page !== '' ? `, ${/[–,-]/.test(String(item.page)) ? 'pp.' : 'p.'} ${item.page}` : '';
    const afterAuthor = cfg.afterAuthor ?? ', ';
    // Several years of the same author with no page numbers read "Abe, 2018, 2019" (collapse="year" in the style).
    let i = 0;
    while (i < ordered.length) {
      let j = i;
      while (
        !cfg.noYear &&
        j + 1 < ordered.length &&
        locatorOf(ordered[j]) === '' && locatorOf(ordered[j + 1]) === '' &&
        authorPart(ordered[j + 1].record) === authorPart(ordered[i].record)
      ) j++;
      if (i > 0) parts.push({ text: '; ' });
      if (j === i) {
        const text = cfg.noYear ? `${authorPart(ordered[i].record)}${locatorOf(ordered[i])}` : `${authorPart(ordered[i].record)}${afterAuthor}${year(ordered[i])}${locatorOf(ordered[i])}`;
        parts.push({ text, sourceId: ordered[i].sourceId });
      } else {
        parts.push({ text: `${authorPart(ordered[i].record)}${afterAuthor}` });
        for (let k = i; k <= j; k++) {
          if (k > i) parts.push({ text: ', ' });
          parts.push({ text: year(ordered[k]), sourceId: ordered[k].sourceId });
        }
      }
      i = j + 1;
    }
    parts.push({ text: ')' });
    return parts;
  });

  const references = sources
    .map((s) => {
      const text = cfg.format(s.record, suffixes.get(s.sourceId));
      return {
        sourceId: s.sourceId,
        label: '',
        text: text ?? `[incomplete: ${s.record.title ?? 'this source'} has no formatter for its type]`,
        incomplete: text === null || s.record.missingFields.length > 0,
        sortKey: `${authorPart(s.record)} ${s.record.year ?? 9999}${suffixes.get(s.sourceId) ?? ''}`.toLowerCase(),
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ sortKey: _sortKey, ...ref }) => ref);

  return { markers, references };
}

const locatorText = (page: string | number | undefined): string =>
  page !== undefined && page !== '' ? `${/[–,-]/.test(String(page)) ? 'pp.' : 'p.'} ${page}` : '';

const SUPERSCRIPT: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const superscript = (text: string) => text.replace(/[0-9-]/g, (c) => SUPERSCRIPT[c]);

interface Numbered {
  format: (r: CitationRecord) => string | null;
  label: (n: number) => string;
  /** The marker of one in-text citation, from its numbered sources in number order. */
  marker: (items: Array<{ n: number; item: CitedSource }>) => MarkerPart[];
}

/** "1", "1,3" and "1-3": three or more in a row collapse to a range; two in a row stay "1,2". */
function collapsed(items: Array<{ n: number; item: CitedSource }>, sep: string, dash: string, text: (n: number, item: CitedSource) => string): MarkerPart[] {
  const parts: MarkerPart[] = [];
  let i = 0;
  while (i < items.length) {
    let j = i;
    while (j + 1 < items.length && items[j + 1].n === items[j].n + 1 && !locatorText(items[j].item.page) && !locatorText(items[j + 1].item.page)) j++;
    if (parts.length) parts.push({ text: sep });
    if (j - i >= 2) {
      parts.push({ text: text(items[i].n, items[i].item), sourceId: items[i].item.sourceId }, { text: dash }, { text: text(items[j].n, items[j].item), sourceId: items[j].item.sourceId });
      i = j + 1;
    } else {
      parts.push({ text: text(items[i].n, items[i].item), sourceId: items[i].item.sourceId });
      i++;
    }
  }
  return parts;
}

const IEEE: Numbered = {
  format: formatIeee,
  label: (n) => `[${n}]`,
  marker: (items) => {
    const parts: MarkerPart[] = [];
    items.forEach(({ n, item }, i) => {
      if (i > 0) parts.push({ text: ', ' });
      const loc = locatorText(item.page);
      parts.push({ text: `[${n}${loc ? `, ${loc}` : ''}]`, sourceId: item.sourceId });
    });
    return parts;
  },
};

const VANCOUVER: Numbered = {
  format: (r) => formatVancouver(r),
  label: (n) => `${n}.`,
  marker: (items) => [{ text: '(' }, ...collapsed(items, ',', '-', (n, item) => `${n}${locatorText(item.page) ? ` ${locatorText(item.page)}` : ''}`), { text: ')' }],
};

// AMA puts the numbers in superscript and leaves page numbers to the reference list.
const AMA: Numbered = {
  format: formatAma,
  label: (n) => `${n}.`,
  marker: (items) => collapsed(items.map((x) => ({ ...x, item: { ...x.item, page: undefined } })), ',', superscript('-'), (n) => superscript(String(n))),
};

function renderNumbered(groups: CitedSource[][], cfg: Numbered): RenderedCitations {
  const sources = firstSeen(groups);
  const number = new Map(sources.map((s, i) => [s.sourceId, i + 1]));

  const markers = groups.map((group) => {
    const unique = group.filter((item, i) => group.findIndex((o) => o.sourceId === item.sourceId && o.page === item.page) === i);
    const ordered = [...unique].sort((a, b) => number.get(a.sourceId)! - number.get(b.sourceId)!);
    return cfg.marker(ordered.map((item) => ({ n: number.get(item.sourceId)!, item })));
  });

  const references = sources.map((s) => {
    const text = cfg.format(s.record);
    return {
      sourceId: s.sourceId,
      label: cfg.label(number.get(s.sourceId)!),
      text: text ?? `[incomplete: ${s.record.title ?? 'this source'} has no formatter for its type]`,
      incomplete: text === null || s.record.missingFields.length > 0,
    };
  });

  return { markers, references };
}

/** groups: one entry per in-text citation, in document order. Each holds the sources cited together. */
/**
 * What makes two clips the same paper: DOI, title, year and first author all agree (DOI case and the doi.org prefix are
 * ignored). Empty when there is no title, so nothing is merged on thin data.
 */
export function sourceIdentity(record: CitationRecord): string {
  const title = (record.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!title) return '';
  const doi = (record.doi ?? '').trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
  return [doi, title, record.year ?? '', (record.authors[0]?.family ?? '').toLowerCase()].join('|');
}

/** Clips of one paper share one source id (the first seen), so the paper is listed and numbered once. */
function mergeSameSource(groups: CitedSource[][]): CitedSource[][] {
  const firstOf = new Map<string, string>();
  return groups.map((group) =>
    group.map((item) => {
      const identity = sourceIdentity(item.record);
      if (!identity) return item;
      const first = firstOf.get(identity);
      if (first === undefined) {
        firstOf.set(identity, item.sourceId);
        return item;
      }
      return first === item.sourceId ? item : { ...item, sourceId: first };
    })
  );
}

export function renderCitations(style: InTextStyle, groups: CitedSource[][]): RenderedCitations {
  const merged = mergeSameSource(groups);
  switch (style) {
    case 'ieee':
      return renderNumbered(merged, IEEE);
    case 'vancouver':
      return renderNumbered(merged, VANCOUVER);
    case 'ama':
      return renderNumbered(merged, AMA);
    case 'apa':
      return renderAuthorDate(merged, APA);
    case 'mla':
      return renderAuthorDate(merged, MLA);
    case 'chicago':
      return renderAuthorDate(merged, CHICAGO);
    default:
      return renderAuthorDate(merged, HARVARD);
  }
}

/** How a citation reads in the text: a number that points to the reference list, or the author and year. */
export type ContentCitation = 'numbered' | 'author-date';

export const isNumberedStyle = (style: InTextStyle): boolean => style === 'ieee' || style === 'vancouver' || style === 'ama';

/**
 * The in-text citation and the reference list can follow different styles. The text shows numbers ([1], numbered by first
 * use) or author-date markers; the list is written in the chosen reference style. With numbers, the list is in order of
 * first use and each row carries its number; with author-date, the list is alphabetical.
 */
export function renderCitationsSplit(content: ContentCitation, referenceStyle: InTextStyle, groups: CitedSource[][]): RenderedCitations {
  const markerStyle: InTextStyle = content === 'numbered' ? 'ieee' : isNumberedStyle(referenceStyle) ? 'apa' : referenceStyle;
  const base = renderCitations(markerStyle, groups);
  if (markerStyle === referenceStyle) return base;
  const written = new Map(renderCitations(referenceStyle, groups).references.map((r) => [r.sourceId, r]));
  return {
    markers: base.markers,
    references: base.references.map((r) => {
      const own = written.get(r.sourceId);
      return own ? { ...r, text: own.text, incomplete: own.incomplete } : r;
    }),
  };
}

export function markerText(parts: MarkerPart[]): string {
  return parts.map((p) => p.text).join('');
}
