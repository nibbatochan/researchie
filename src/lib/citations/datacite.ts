// Maps a DataCite /dois/{doi} response to a CitationRecord. Pure.
// Used when the DOI agency reports the DOI is registered with DataCite.
// Fields verified against a live response (docs/CITATION_API_RESEARCH.md).

import type { CitationAuthor, CitationRecord, SourceType } from './types';

interface DataCiteCreator {
  name?: string;
  givenName?: string;
  familyName?: string;
}

interface DataCiteAttributes {
  doi?: string;
  url?: string;
  publisher?: string;
  publicationYear?: number;
  titles?: { title?: string }[];
  creators?: DataCiteCreator[];
  types?: { resourceTypeGeneral?: string };
}

const SOURCE_TYPES: Record<string, SourceType> = {
  JournalArticle: 'journal_article',
  Preprint: 'preprint',
  Report: 'report',
  Dataset: 'dataset',
  BookChapter: 'book_chapter',
};

function authorOf(creator: DataCiteCreator): CitationAuthor | null {
  if (creator.familyName) return { family: creator.familyName, given: creator.givenName };
  // Personal names come as "Family, Given"; organisations have no comma.
  const name = creator.name?.trim();
  if (!name) return null;
  const [family, given] = name.split(',').map((part) => part.trim());
  return given ? { family, given } : { family: name };
}

export function mapDataCiteDoi(body: unknown): CitationRecord | null {
  const attributes = (body as { data?: { attributes?: DataCiteAttributes } } | null)?.data?.attributes;
  if (!attributes) return null;

  const sourceType = SOURCE_TYPES[attributes.types?.resourceTypeGeneral ?? ''] ?? 'unknown';
  const authors = (attributes.creators ?? []).map(authorOf).filter((a): a is CitationAuthor => a !== null);

  const record: CitationRecord = {
    status: 'verified_doi',
    sourceType,
    resolvedFrom: 'datacite',
    doi: attributes.doi,
    title: attributes.titles?.[0]?.title,
    authors,
    publisher: attributes.publisher,
    year: attributes.publicationYear,
    url: attributes.url,
    missingFields: [],
  };

  if (!record.title) record.missingFields.push('title');
  if (authors.length === 0) record.missingFields.push('authors');
  if (!record.year) record.missingFields.push('year');
  if (record.missingFields.length > 0) record.status = 'incomplete';
  return record;
}
