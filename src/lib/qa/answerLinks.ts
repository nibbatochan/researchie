// Pure helpers for the Document Assistant: turn an answer plus its verified
// citations into paragraphs with source-link icons. No network, no React.

export interface AnswerCitation {
  quote: string;
  pageNumber?: number;
  start?: number;
  end?: number;
  supported?: boolean;
}

export interface AnswerSegment {
  text: string;
  /** Indexes into the citations array, in display order. Icons go at the end of this text. */
  citationIndexes: number[];
}

export interface AnswerParagraph {
  /** The whole paragraph with page markers removed. */
  text: string;
  /** Every citation index attached anywhere in the paragraph. */
  citationIndexes: number[];
  /** The paragraph cut so each icon sits at the end of the sentence it supports. */
  segments: AnswerSegment[];
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

const ABBREVIATION = /(?:\b(?:al|fig|figs|eq|eqs|vs|etc|dr|no|approx|ca|cf)|\be\.g|\bi\.e)\.$/i;

interface Piece {
  text: string;
  /** Whitespace that followed this piece in the original. */
  after: string;
  indexes: number[];
}

/** Cut text after a sentence end that is followed by the start of a new sentence. */
function splitSentences(raw: string): Array<{ text: string; after: string }> {
  const breaks = /[.!?]["')\]]*\s+(?=[A-Z0-9("“*])|\n+/g;
  const out: Array<{ text: string; after: string }> = [];
  // Page markers like "[p. 3]" hold a full stop; hide them so they are never cut.
  const masked = raw.replace(MARKER, (mk) => 'x'.repeat(mk.length));
  let from = 0;
  let m: RegExpExecArray | null;
  while ((m = breaks.exec(masked)) !== null) {
    const whole = m[0];
    const sepMatch = whole.match(/\s+$/);
    const sep = sepMatch ? sepMatch[0] : '';
    const text = raw.slice(from, m.index + whole.length - sep.length);
    if (ABBREVIATION.test(text)) continue;
    out.push({ text, after: sep });
    from = m.index + whole.length;
  }
  out.push({ text: raw.slice(from), after: '' });
  return out.filter((p) => p.text.trim().length > 0);
}

const tidy = (t: string) => t.replace(/[ \t]+\n/g, '\n').replace(/ {2,}/g, ' ').trim();

/**
 * Split the answer into paragraphs and sentences, drop every raw page marker, and
 * attach supported citations. A marker whose page equals the page of a supported
 * citation attaches that citation to the sentence holding the marker. Other supported
 * citations go to the sentence with the best token overlap with the quote, or the
 * last sentence when nothing matches. Each icon ends the sentence it supports; the
 * sentences before it with no icon of their own stay in the same segment. Unsupported
 * citations never get an icon.
 */
export function buildAnswerLinks(answer: string, citations: AnswerCitation[] = []): AnswerParagraph[] {
  const rawParagraphs = (answer || '').split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (rawParagraphs.length === 0) return [];

  const supported = citations
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && c.supported === true && typeof c.pageNumber === 'number');

  const assigned = new Set<number>();
  const pieceLists: Piece[][] = rawParagraphs.map((rawPara) =>
    splitSentences(rawPara).map((p) => {
      const indexes: number[] = [];
      const text = p.text.replace(MARKER, (_m, nums: string) => {
        for (const page of pagesInMarker(nums)) {
          const hit = supported.find(({ c, i }) => c.pageNumber === page && !assigned.has(i));
          if (hit) {
            assigned.add(hit.i);
            indexes.push(hit.i);
          }
        }
        return '';
      });
      return { text, after: p.after, indexes };
    }),
  );

  const all: Array<{ piece: Piece; para: number }> = [];
  pieceLists.forEach((list, para) => list.forEach((piece) => all.push({ piece, para })));

  for (const { c, i } of supported) {
    if (assigned.has(i)) continue;
    let best = -1;
    let bestScore = 0;
    all.forEach(({ piece }, k) => {
      const score = overlapScore(c.quote, piece.text);
      if (score > bestScore) { bestScore = score; best = k; }
    });
    const target = best >= 0 && bestScore >= MIN_OVERLAP ? best : all.length - 1;
    if (target >= 0) all[target].piece.indexes.push(i);
    assigned.add(i);
  }

  const paragraphs: AnswerParagraph[] = pieceLists.map((pieces) => {
    const segments: AnswerSegment[] = [];
    let buffer = '';
    for (const piece of pieces) {
      buffer += piece.text + piece.after;
      if (piece.indexes.length > 0) {
        segments.push({ text: tidy(buffer), citationIndexes: [...piece.indexes].sort((a, b) => a - b) });
        buffer = '';
      }
    }
    if (tidy(buffer)) segments.push({ text: tidy(buffer), citationIndexes: [] });
    const cleaned = segments.filter((seg) => seg.text.length > 0 || seg.citationIndexes.length > 0);
    return {
      text: tidy(pieces.map((p) => p.text + p.after).join('')),
      citationIndexes: cleaned.flatMap((seg) => seg.citationIndexes).sort((a, b) => a - b),
      segments: cleaned,
    };
  });

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
