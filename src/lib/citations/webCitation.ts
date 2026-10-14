// Citation for a web page from a known URL. The page is verified by its address,
// so the status stays page_tags. Author or date missing from the page is a note
// (see verify.ts), not an incomplete citation.

import type { CitationRecord } from './types.ts';
import { assessCitation } from './verify.ts';

export interface PageInfo {
  url: string;
  title?: string;
  siteName?: string;
  author?: string;
  published?: string; // as the page gives it, usually ISO 8601
  updated?: string; // the page's last-update date, as the page gives it
}

// Keeps only a date the formatter can read: a leading YYYY-MM-DD. Anything else is dropped, not guessed.
function updatedDate(value?: string): string | undefined {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

export function buildWebCitation(info: PageInfo, accessedAt: string): CitationRecord {
  const missingFields: string[] = [];
  if (!info.title) missingFields.push('title');
  if (!info.author) missingFields.push('author');
  if (!info.published) missingFields.push('date');

  const yearMatch = info.published?.match(/\b(\d{4})\b/);
  return {
    status: 'page_tags',
    sourceType: 'web_page',
    resolvedFrom: 'page_tags',
    title: info.title,
    authors: info.author ? [{ family: info.author }] : [],
    publisher: info.siteName,
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    url: info.url,
    accessedAt,
    updatedAt: updatedDate(info.updated),
    missingFields,
  };
}

// Web citations saved before the status fix carry 'incomplete'. Rebuild their status
// and notes for display, so no saved record has to be rewritten.
export function refreshWebCitation(record: CitationRecord): CitationRecord {
  if (record.sourceType !== 'web_page') return record;
  return assessCitation({ ...record, status: 'page_tags' });
}
