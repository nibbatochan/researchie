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
  publisherPlace?: string; // books and chapters, when the source gives it
  editors?: CitationAuthor[]; // book chapters: the editors of the book
  url?: string;
  accessedAt?: string; // ISO 8601, web sources only
  missingFields: string[];
  retracted?: boolean; // undefined = retraction check not run
  confidence?: Confidence; // set by assessCitation in verify.ts
  enteredByUser?: boolean; // true when the DOI, PMID or title came from the user, so a refresh keeps the same check
}

// warnings: the identifier or title the user entered does not match the clip.
// notes: plain facts about the source (missing fields, preprint, web page, retraction).
export interface Confidence {
  warnings: string[];
  notes: string[];
}
