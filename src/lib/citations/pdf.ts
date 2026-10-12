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

// PDF metadata titles are often leftovers from the tool that made the file: "Microsoft Word - draft.docx",
// "untitled", a file name, or a publisher code like "PII: S0140-6736(97)11096-0". Comparing one of those with
// a paper's real title would raise a false "might not be the source" warning, so they count as no title.
const JUNK_TITLE = [
  /^(microsoft\s+)?(word|powerpoint|excel)\b/i,
  /^(untitled|title|document|presentation|slide|page)\s*\d*$/i,
  /\.(docx?|pdf|tex|pptx?|xlsx?|indd|rtf|txt|odt|qxd)\s*$/i,
  /^(pii|doi|isbn|issn)\s*[:.]/i,
  /^[\w.-]+$/, // one word with no spaces, such as a file name or an id
];

/** True when a metadata title looks like a real paper title, so it is safe to compare. */
export function isUsablePdfTitle(title: string | undefined): title is string {
  const t = (title ?? '').trim();
  if (t.length < 12) return false;
  return !JUNK_TITLE.some((re) => re.test(t));
}
