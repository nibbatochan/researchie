// Citation for an ordinary web page with no DOI or PMID. It is built from the
// page's own tags and marked as a page source, not a verified record.

import type { CitationRecord } from './types.ts';

export interface PageInfo {
  url: string;
  title?: string;
  siteName?: string;
  author?: string;
  published?: string; // as the page gives it, usually ISO 8601
}

export function buildWebCitation(info: PageInfo, accessedAt: string): CitationRecord {
  const missingFields: string[] = [];
  if (!info.title) missingFields.push('title');
  if (!info.author) missingFields.push('author');
  if (!info.published) missingFields.push('date');

  const yearMatch = info.published?.match(/\b(\d{4})\b/);
  return {
    status: missingFields.length > 0 ? 'incomplete' : 'page_tags',
    sourceType: 'web_page',
    resolvedFrom: 'page_tags',
    title: info.title,
    authors: info.author ? [{ family: info.author }] : [],
    publisher: info.siteName,
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    url: info.url,
    accessedAt,
    missingFields,
  };
}
