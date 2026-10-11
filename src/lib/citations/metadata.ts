// Stores a citation record inside an atom's existing metadata JSON as
// metadata.citation. Reusing the metadata column avoids a schema migration.

import type { CitationRecord } from './types.ts';

const STATUSES = ['verified_doi', 'verified_pmid', 'page_tags', 'manual', 'incomplete', 'unreachable'];

// Shape check for a record sent by the client. It guards the fields the
// formatter depends on; it does not re-verify the citation itself.
export function isCitationRecord(value: unknown): value is CitationRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.status === 'string' &&
    STATUSES.includes(record.status) &&
    typeof record.sourceType === 'string' &&
    typeof record.resolvedFrom === 'string' &&
    Array.isArray(record.authors) &&
    Array.isArray(record.missingFields)
  );
}

export function withCitation<M extends object>(
  metadata: M | undefined,
  citation: CitationRecord,
): M & { citation: CitationRecord } {
  return { ...(metadata ?? ({} as M)), citation };
}
