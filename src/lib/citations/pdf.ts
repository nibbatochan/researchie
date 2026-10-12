// Finds DOIs in a PDF from its PDF metadata and the text of its first page.
// Pure: the caller reads the PDF (pdf.js) and passes the strings in.
// Every PDF clip keeps its page number (metadata.pageNumber).

export interface PdfInfo {
  title?: string;
  subject?: string;
  keywords?: string;
  [key: string]: unknown;
}

const DOI_ALL = /10\.\d{4,9}\/[^\s"'<>]+/g;

// All distinct DOIs, metadata first, then the first page. Later pages are not
// read: a DOI there is often a cited work, not this paper. The caller checks
// each DOI against the PDF's title, so a stray match is not trusted.
export function findPdfDois(info: PdfInfo, firstPageText: string): string[] {
  const metadataText = Object.values(info)
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  const found: string[] = [];
  for (const text of [metadataText, firstPageText]) {
    for (const match of text.matchAll(DOI_ALL)) {
      const doi = match[0].replace(/[.,;:]+$/, '');
      if (!found.includes(doi)) found.push(doi);
    }
  }
  return found;
}
