// Finds a DOI in a PDF from its PDF metadata and the text of its first page.
// Pure: the caller reads the PDF (pdf.js) and passes the strings in.
// When no DOI is found, the caller asks the user to confirm title, author
// and year. Every PDF clip keeps its page number (metadata.pageNumber).

import { normalizeDoi } from './identify.ts';

export interface PdfInfo {
  title?: string;
  subject?: string;
  keywords?: string;
  [key: string]: unknown;
}

export interface PdfDoiResult {
  doi?: string;
  source?: 'pdf_metadata' | 'first_page';
}

// Metadata first: it's the most explicit. Then the first page, which is where
// journals print the DOI. Later pages are not read, since a DOI there is often
// a cited work, not this paper.
export function findPdfDoi(info: PdfInfo, firstPageText: string): PdfDoiResult {
  const metadataText = Object.values(info)
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  const fromMetadata = normalizeDoi(metadataText);
  if (fromMetadata) return { doi: fromMetadata, source: 'pdf_metadata' };

  const fromPage = normalizeDoi(firstPageText);
  if (fromPage) return { doi: fromPage, source: 'first_page' };

  return {};
}
