// PubMed mappers. Pure: the caller does the HTTP requests.
// - mapPubmedSummary maps an esummary (retmode=json) entry.
// - detectRetraction reads an efetch (retmode=xml) record for retraction
//   publication types. Type IDs are from the MeSH tree (NLM):
//   D016441 "Retracted Publication", D016440 "Retraction of Publication".

import type { CitationAuthor, CitationRecord } from './types';

export const RETRACTION_TYPE_IDS = ['D016441', 'D016440'];

interface PubmedSummaryEntry {
  error?: string;
  title?: string;
  source?: string;
  pubdate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  pubtype?: string[];
  authors?: { name?: string }[];
  articleids?: { idtype?: string; value?: string }[];
}

// esummary author names look like "Kucsko G": last token is the initials.
function authorOf(name: string): CitationAuthor {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { family: parts[0] };
  return { family: parts.slice(0, -1).join(' '), given: parts[parts.length - 1] };
}

export function mapPubmedSummary(body: unknown, pmid: string): CitationRecord | null {
  const entry = (body as { result?: Record<string, PubmedSummaryEntry> } | null)?.result?.[pmid];
  if (!entry || entry.error) return null;

  const doi = entry.articleids?.find((id) => id.idtype === 'doi')?.value;
  const yearMatch = entry.pubdate?.match(/\b(\d{4})\b/);
  const isArticle = (entry.pubtype ?? []).includes('Journal Article');

  const record: CitationRecord = {
    status: 'verified_pmid',
    sourceType: isArticle ? 'journal_article' : 'unknown',
    resolvedFrom: 'pubmed',
    pmid,
    doi,
    title: entry.title?.replace(/\.$/, ''),
    authors: (entry.authors ?? []).map((a) => authorOf(a.name ?? '')).filter((a) => a.family),
    journal: entry.source,
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    volume: entry.volume || undefined,
    issue: entry.issue || undefined,
    pages: entry.pages || undefined,
    missingFields: [],
  };

  if (!record.title) record.missingFields.push('title');
  if (record.authors.length === 0) record.missingFields.push('authors');
  if (!record.journal) record.missingFields.push('journal');
  if (!record.year) record.missingFields.push('year');
  if (isArticle && !record.volume) record.missingFields.push('volume');
  if (isArticle && !record.pages) record.missingFields.push('pages');
  if (record.missingFields.length > 0) record.status = 'incomplete';
  return record;
}

export function detectRetraction(efetchXml: string): boolean {
  const types = [...efetchXml.matchAll(/<PublicationType UI="([^"]+)"/g)].map((m) => m[1]);
  return types.some((id) => RETRACTION_TYPE_IDS.includes(id));
}
