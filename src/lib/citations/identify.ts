// Finds citation identifiers in a page's metadata. Pure: the caller parses the
// page and passes meta tags in. Bibliography tags (citation_reference) are
// skipped on purpose: they are secondary sources and must never be cited.

export interface MetaTag {
  name: string;
  content: string;
}

export interface PageIdentifiers {
  doi?: string;
  pmid?: string;
}

const DOI_PATTERN = /10\.\d{4,9}\/[^\s"'<>]+/;

export function normalizeDoi(raw: string): string | undefined {
  const match = raw.match(DOI_PATTERN);
  if (!match) return undefined;
  // Trailing punctuation from prose is not part of the DOI.
  return match[0].replace(/[.,;:]+$/, '');
}

export function isBibliographyTag(name: string): boolean {
  return name.trim().toLowerCase().startsWith('citation_reference');
}

export function extractIdentifiers(tags: MetaTag[]): PageIdentifiers {
  const usable = tags.filter((tag) => !isBibliographyTag(tag.name));
  const byName = (wanted: string[]) =>
    usable.filter((tag) => wanted.includes(tag.name.trim().toLowerCase()));

  let doi: string | undefined;
  for (const tag of byName(['citation_doi', 'dc.identifier', 'dc.identifier.doi'])) {
    doi = normalizeDoi(tag.content);
    if (doi) break;
  }

  let pmid: string | undefined;
  for (const tag of byName(['citation_pmid'])) {
    const digits = tag.content.trim();
    if (/^\d+$/.test(digits)) {
      pmid = digits;
      break;
    }
  }

  return { doi, pmid };
}
