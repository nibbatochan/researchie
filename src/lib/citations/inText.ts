// In-text citations and the reference list, in two families:
//   harvard: author-date, "(Smith and Lee, 2020)". The list is alphabetical.
//   ieee:    numbered, "[1]". Numbers follow the order of first citation. The list is in that order.
// Pure: one list of citation groups in, markers and a reference list out. Switching style re-renders from
// the same input; the document itself never changes. A marker is a list of parts so the screen can make
// each source a link to its entry in the reference list.

import type { CitationRecord } from './types';
import { formatHarvard, harvardInTextAuthors } from './harvard.ts';
import { formatIeee } from './ieee.ts';

export type InTextStyle = 'harvard' | 'ieee';

export const IN_TEXT_STYLES: ReadonlyArray<{ id: InTextStyle; label: string; hint: string }> = [
  { id: 'harvard', label: 'Harvard', hint: 'Author-date, for example (Smith, 2020)' },
  { id: 'ieee', label: 'Numbered (IEEE)', hint: 'Numbers in order of first use, for example [1]' },
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

function authorPart(record: CitationRecord): string {
  const authors = harvardInTextAuthors(record.authors);
  if (authors) return authors;
  if (record.publisher) return record.publisher;
  const words = (record.title ?? '').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  return words ? `${words}…` : 'Anon.';
}

function firstSeen(groups: CitedSource[][]): CitedSource[] {
  const seen = new Map<string, CitedSource>();
  for (const group of groups) for (const item of group) if (!seen.has(item.sourceId)) seen.set(item.sourceId, item);
  return [...seen.values()];
}

/** "a", "b" for sources that share the same author part and year. */
function yearSuffixes(sources: CitedSource[]): Map<string, string> {
  const byKey = new Map<string, CitedSource[]>();
  for (const s of sources) {
    const key = `${authorPart(s.record).toLowerCase()}|${s.record.year ?? 'n.d.'}`;
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

function renderHarvard(groups: CitedSource[][]): RenderedCitations {
  const sources = firstSeen(groups);
  const suffixes = yearSuffixes(sources);
  const year = (s: CitedSource) => `${s.record.year ?? 'n.d.'}${suffixes.get(s.sourceId) ?? ''}`;

  const markers = groups.map((group) => {
    const unique = group.filter((item, i) => group.findIndex((o) => o.sourceId === item.sourceId && o.page === item.page) === i);
    // Oldest first, then by author, as Cite Them Right orders several sources in one bracket.
    const ordered = [...unique].sort(
      (a, b) => (a.record.year ?? 0) - (b.record.year ?? 0) || authorPart(a.record).localeCompare(authorPart(b.record)),
    );
    const parts: MarkerPart[] = [{ text: '(' }];
    ordered.forEach((item, i) => {
      if (i > 0) parts.push({ text: '; ' });
      const locator = item.page !== undefined && item.page !== '' ? `, ${/[–,-]/.test(String(item.page)) ? 'pp.' : 'p.'} ${item.page}` : '';
      parts.push({ text: `${authorPart(item.record)}, ${year(item)}${locator}`, sourceId: item.sourceId });
    });
    parts.push({ text: ')' });
    return parts;
  });

  const references = sources
    .map((s) => {
      const text = formatHarvard(s.record, { yearSuffix: suffixes.get(s.sourceId) });
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

function renderIeee(groups: CitedSource[][]): RenderedCitations {
  const sources = firstSeen(groups);
  const number = new Map(sources.map((s, i) => [s.sourceId, i + 1]));

  const markers = groups.map((group) => {
    const unique = group.filter((item, i) => group.findIndex((o) => o.sourceId === item.sourceId && o.page === item.page) === i);
    const ordered = [...unique].sort((a, b) => number.get(a.sourceId)! - number.get(b.sourceId)!);
    const hasLocator = ordered.some((i) => i.page !== undefined && i.page !== '');
    const parts: MarkerPart[] = [];

    if (!hasLocator) {
      // Runs of three or more numbers become a range: [1]–[3]. Two stay separate: [1], [2].
      let i = 0;
      while (i < ordered.length) {
        let j = i;
        while (j + 1 < ordered.length && number.get(ordered[j + 1].sourceId)! === number.get(ordered[j].sourceId)! + 1) j++;
        if (parts.length > 0) parts.push({ text: ', ' });
        if (j - i >= 2) {
          parts.push({ text: `[${number.get(ordered[i].sourceId)}]`, sourceId: ordered[i].sourceId });
          parts.push({ text: '–' });
          parts.push({ text: `[${number.get(ordered[j].sourceId)}]`, sourceId: ordered[j].sourceId });
          i = j + 1;
        } else {
          parts.push({ text: `[${number.get(ordered[i].sourceId)}]`, sourceId: ordered[i].sourceId });
          i++;
        }
      }
      return parts;
    }

    ordered.forEach((item, i) => {
      if (i > 0) parts.push({ text: ', ' });
      const locator = item.page !== undefined && item.page !== '' ? `, ${/[–,-]/.test(String(item.page)) ? 'pp.' : 'p.'} ${item.page}` : '';
      parts.push({ text: `[${number.get(item.sourceId)}${locator}]`, sourceId: item.sourceId });
    });
    return parts;
  });

  const references = sources.map((s) => {
    const text = formatIeee(s.record);
    return {
      sourceId: s.sourceId,
      label: `[${number.get(s.sourceId)}]`,
      text: text ?? `[incomplete: ${s.record.title ?? 'this source'} has no formatter for its type]`,
      incomplete: text === null || s.record.missingFields.length > 0,
    };
  });

  return { markers, references };
}

/** groups: one entry per in-text citation, in document order. Each holds the sources cited together. */
export function renderCitations(style: InTextStyle, groups: CitedSource[][]): RenderedCitations {
  return style === 'ieee' ? renderIeee(groups) : renderHarvard(groups);
}

export function markerText(parts: MarkerPart[]): string {
  return parts.map((p) => p.text).join('');
}
