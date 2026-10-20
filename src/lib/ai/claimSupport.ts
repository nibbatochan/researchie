// Checks whether a quote from an AI answer actually appears in the document it cites.
// A quote counts as supported when it appears word-for-word (after normalising case,
// punctuation and spacing), or when most of its words appear in one page.
// Pure: no network, no dependencies.

export interface SourcePage {
  pageNumber: number;
  content: string;
}

export interface QuoteCheck {
  supported: boolean;
  // Page where the quote was found. Never set when the quote was not found, so a near miss
  // can not be shown as a citation.
  pageNumber?: number;
  // True only for a word-for-word match. A loose-overlap match is supported but not exact,
  // so it can not be presented as a verbatim quote.
  exact?: boolean;
}

// Share of quote words that must appear in one page when the quote is not verbatim.
const MIN_TOKEN_OVERLAP = 0.8;
// Shorter quotes must match word-for-word; a few common words would match anything.
const MIN_TOKENS_FOR_OVERLAP = 4;

export function normalizeForMatch(text: string): string {
  return (text || '')
    // A word split across a line break ("experi-\nment") is one word in the PDF.
    .replace(/-\s*\n\s*/g, '')
    // A combining mark (the accent in "K̂n") is part of the letter before it.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function checkQuoteAgainstPages(quote: string, pages: SourcePage[]): QuoteCheck {
  const q = normalizeForMatch(quote);
  if (!q) return { supported: false };
  const quoteTokens = q.split(' ');

  let bestScore = 0;
  let bestPage: number | undefined;

  for (const page of pages) {
    const padded = ` ${normalizeForMatch(page.content)} `;
    if (padded.includes(` ${q} `)) {
      return { supported: true, exact: true, pageNumber: page.pageNumber };
    }
    const pageTokens = new Set(padded.trim().split(' '));
    const hits = quoteTokens.filter((t) => pageTokens.has(t)).length;
    const score = hits / quoteTokens.length;
    if (score > bestScore) {
      bestScore = score;
      bestPage = page.pageNumber;
    }
  }

  if (quoteTokens.length >= MIN_TOKENS_FOR_OVERLAP && bestScore >= MIN_TOKEN_OVERLAP) {
    return { supported: true, exact: false, pageNumber: bestPage };
  }
  return { supported: false };
}
