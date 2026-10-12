// Pure helpers for the Document Assistant: turn an answer plus its verified
// citations into paragraphs with source-link icons. No network, no React.

export interface AnswerCitation {
  quote: string;
  pageNumber?: number;
  start?: number;
  end?: number;
  supported?: boolean;
}

export interface AnswerParagraph {
  text: string;
  /** Indexes into the citations array, in display order. */
  citationIndexes: number[];
}

// "[Page 5]", "[p. 5]", "(p.5)", "[Pages 3, 5]", "[pp. 3-5]", and the full-width
// forms models sometimes write: "【Page 1】", "（p. 2）", "〔Page 3〕"
const MARKER = /\s*[\[(（【〔]\s*(?:pages?|pp?\.?)\s*(\d+(?:\s*(?:,|-|–|and|&)\s*\d+)*)\s*[\])）】〕]/gi;

const STOP = new Set([
  'the', 'and', 'for', 'are', 'was', 'were', 'that', 'this', 'with', 'from', 'have', 'has', 'had',
  'not', 'but', 'its', 'their', 'they', 'them', 'which', 'what', 'when', 'where', 'into', 'than',
  'then', 'also', 'can', 'will', 'would', 'should', 'could', 'about', 'been', 'being', 'such',
  'these', 'those', 'there', 'here', 'more', 'most', 'some', 'any', 'each', 'other', 'only',
]);

export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of (text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length >= 3 && !STOP.has(w)) out.add(w);
  }
  return out;
}

/** Share of the quote's tokens that also appear in the paragraph (0 to 1). */
export function overlapScore(quote: string, paragraph: string): number {
  const q = tokenize(quote);
  if (q.size === 0) return 0;
  const p = tokenize(paragraph);
  let hit = 0;
  q.forEach((t) => { if (p.has(t)) hit++; });
  return hit / q.size;
}

export const MIN_OVERLAP = 0.3;

function pagesInMarker(raw: string): number[] {
  return (raw.match(/\d+/g) || []).map((n) => parseInt(n, 10));
}

/**
 * Split the answer into paragraphs, drop every raw page marker, and attach
 * supported citations. A marker whose page equals the page of a supported
 * citation attaches that citation to the paragraph holding the marker. Other
 * supported citations go to the paragraph with the best token overlap with
 * the quote, or the last paragraph when nothing matches. Unsupported
 * citations never get an icon.
 */
export function buildAnswerLinks(answer: string, citations: AnswerCitation[] = []): AnswerParagraph[] {
  const rawParagraphs = (answer || '').split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (rawParagraphs.length === 0) return [];

  const supported = citations
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && c.supported === true && typeof c.pageNumber === 'number');

  const assigned = new Set<number>();
  const paragraphs: AnswerParagraph[] = rawParagraphs.map((raw) => {
    const indexes: number[] = [];
    const text = raw
      .replace(MARKER, (_m, nums: string) => {
        for (const page of pagesInMarker(nums)) {
          const hit = supported.find(({ c, i }) => c.pageNumber === page && !assigned.has(i));
          if (hit) {
            assigned.add(hit.i);
            indexes.push(hit.i);
          }
        }
        return '';
      })
      .replace(/[ \t]+\n/g, '\n')
      .replace(/ {2,}/g, ' ')
      .trim();
    return { text, citationIndexes: indexes };
  });

  for (const { c, i } of supported) {
    if (assigned.has(i)) continue;
    let best = -1;
    let bestScore = 0;
    paragraphs.forEach((p, pi) => {
      const s = overlapScore(c.quote, p.text);
      if (s > bestScore) { bestScore = s; best = pi; }
    });
    const target = best >= 0 && bestScore >= MIN_OVERLAP ? best : paragraphs.length - 1;
    paragraphs[target].citationIndexes.push(i);
    assigned.add(i);
  }

  for (const p of paragraphs) p.citationIndexes.sort((a, b) => a - b);
  return paragraphs.filter((p) => p.text.length > 0 || p.citationIndexes.length > 0);
}

// Same rules as the server's locateQuote (src/lib/ai/passages.ts): letters and digits only,
// case and accents ignored, a word split across a line break joined.
function normalizeForMatch(s: string): string {
  return (s || '')
    .replace(/-\s*\n\s*/g, '')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Same rule as the server (src/lib/ai/passages.ts): a quote may be several sentences, joined
// by "..." or with a sentence left out. Sentences of 3+ words must be on the page, verbatim
// and in order, and must make up at least 80% of the quote's words.
const PIECE_BREAK = /\.{3,}|\u2026|(?<=[.!?])\s+(?=[A-Z0-9(])/;
const MIN_PIECE_WORDS = 3;
const MIN_COVERAGE = 0.8;

const wordCount = (s: string) => normalizeForMatch(s).split(' ').filter(Boolean).length;

/** The sentences of a quote that are long enough to check, or [] when there is only one. */
export function quoteFragments(quote: string): string[] {
  const all = (quote || '').split(PIECE_BREAK).map((p) => p.trim());
  if (all.length < 2) return [];
  const pieces = all.filter((p) => wordCount(p) >= MIN_PIECE_WORDS);
  const total = all.reduce((n, p) => n + wordCount(p), 0);
  const kept = pieces.reduce((n, p) => n + wordCount(p), 0);
  return total > 0 && kept / total >= MIN_COVERAGE ? pieces : [];
}

/** True when the quote is on the page: whole, or sentence by sentence in order. */
export function quoteIsOnPage(c: AnswerCitation, pageText: string | undefined): boolean {
  if (!pageText) return false;
  const page = ` ${normalizeForMatch(pageText)} `;
  const whole = normalizeForMatch(c.quote);
  if (!whole) return false;
  if (page.includes(` ${whole} `)) return true;

  const pieces = quoteFragments(c.quote).map(normalizeForMatch);
  if (pieces.length === 0) return false;
  let from = 0;
  for (const piece of pieces) {
    const at = page.indexOf(` ${piece} `, from);
    if (at < 0) return false;
    from = at + piece.length;
  }
  return true;
}

/** What to highlight in the PDF: the whole quote when it is all on the page, else its first sentence. */
export function quoteHighlightText(c: AnswerCitation, pageText: string | undefined): string {
  const quote = (c.quote || '').trim();
  const page = ` ${normalizeForMatch(pageText || '')} `;
  if (page.includes(` ${normalizeForMatch(quote)} `)) return quote;
  const pieces = quoteFragments(quote);
  return pieces.length > 0 ? pieces[0] : quote;
}

export function linkTitle(c: AnswerCitation): string {
  const q = (c.quote || '').replace(/\s+/g, ' ').trim();
  return `Page ${c.pageNumber}: ${q.length > 80 ? q.slice(0, 80) : q}`;
}
