// Browser-side helpers for the citation UI. Network calls go through the
// app's own routes; no keys or contact details are sent from the browser.

import type { CitationRecord } from './types.ts';
import { normalizeDoi } from './identify.ts';
import { formatVancouver } from './vancouver.ts';
import { toBibTeX, toRIS } from './export.ts';
import { formatApa } from './apa.ts';

export interface ResolveResponse {
  record: CitationRecord | null;
  reason: 'budget_exhausted' | 'unreachable' | 'not_found' | null;
  lookupsUsed: number;
  lookupCap: number;
}

// Accepts a DOI (or a DOI URL) or a numeric PMID. Returns null for anything else.
export function parseIdentifier(input: string): { doi?: string; pmid?: string } | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return { pmid: trimmed };
  const doi = normalizeDoi(trimmed);
  return doi ? { doi } : null;
}

export async function resolveCitation(ids: { doi?: string; pmid?: string }): Promise<ResolveResponse> {
  const res = await fetch('/api/citations/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Citation lookup failed.');
  return body as ResolveResponse;
}

export async function saveCitation(atomId: string, citation: CitationRecord): Promise<void> {
  const res = await fetch('/api/atoms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: atomId, citation }),
  });
  if (!res.ok) throw new Error('Could not save the citation.');
}

// Plain-language messages for each reason a record was not found.
export function reasonMessage(reason: ResolveResponse['reason']): string {
  switch (reason) {
    case 'budget_exhausted':
      return 'Too many lookups for one request. Try again in a moment.';
    case 'unreachable':
      return 'The citation service could not be reached. Try again later.';
    case 'not_found':
    default:
      return 'No record found for that identifier. Check it and try again.';
  }
}

export function formatCitationLine(record: CitationRecord): string {
  const vancouver = formatVancouver(record);
  if (vancouver) return vancouver;
  // No verified style rule for web pages or unknown sources yet, so show the fields in plain order.
  if (record.sourceType === 'web_page' || record.sourceType === 'unknown') {
    const parts = [
      record.authors.map((a) => a.family).join(', '),
      record.title,
      record.publisher,
      record.year,
      record.url && `Available from: ${record.url}`,
      record.accessedAt && `accessed ${record.accessedAt.slice(0, 10)}`,
    ];
    return `${parts.filter(Boolean).join('. ')}. (Plain format, not a style-guide format yet.)`;
  }
  return `[${record.sourceType.replace('_', ' ')}: style not yet supported]`;
}

export type CitationCopyKind = 'line' | 'apa' | 'bibtex' | 'ris';

/** The text to put on the clipboard: the formatted line, or a BibTeX or RIS entry. */
export function citationText(record: CitationRecord, kind: CitationCopyKind): string {
  if (kind === 'bibtex') return toBibTeX(record);
  if (kind === 'ris') return toRIS(record);
  if (kind === 'apa') return formatApa(record) ?? formatCitationLine(record);
  return formatCitationLine(record);
}

export interface SearchResponse {
  candidates: CitationRecord[];
  reason: ResolveResponse['reason'];
}

export async function searchCitations(query: string): Promise<SearchResponse> {
  const res = await fetch('/api/citations/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Title search failed.');
  return body as SearchResponse;
}

// One line per candidate, so the user can tell a preprint from the journal version.
export function candidateLabel(record: CitationRecord): string {
  const kind = record.sourceType === 'preprint' ? 'Preprint' : record.sourceType === 'journal_article' ? 'Journal article' : 'Source';
  const author = record.authors[0]?.family ?? 'Unknown author';
  const journal = record.journal ? `, ${record.journal}` : '';
  return `${kind}: ${record.title ?? 'Untitled'} (${author}${record.authors.length > 1 ? ' et al.' : ''}, ${record.year ?? 'year unknown'}${journal})`;
}
