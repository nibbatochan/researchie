// Citation record stored on a ResearchAtom (Decision 7).
// Missing fields are listed in missingFields and rendered as "incomplete", never guessed.

export type CitationStatus =
  | 'verified_doi'
  | 'verified_pmid'
  | 'page_tags'
  | 'manual'
  | 'incomplete'
  | 'unreachable';

export type SourceType =
  | 'journal_article'
  | 'preprint'
  | 'web_page'
  | 'report'
  | 'dataset'
  | 'book_chapter'
  | 'unknown';

export interface CitationAuthor {
  family: string;
  given?: string;
}

export interface CitationRecord {
  status: CitationStatus;
  sourceType: SourceType;
  resolvedFrom: string; // e.g. 'crossref', 'datacite', 'pubmed', 'page_tags', 'manual'
  doi?: string;
  pmid?: string;
  title?: string;
  authors: CitationAuthor[];
  journal?: string;
  journalAbbrev?: string;
  year?: number;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  url?: string;
  accessedAt?: string; // ISO 8601, web sources only
  missingFields: string[];
  retracted?: boolean; // undefined = retraction check not run
}
