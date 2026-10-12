// Passage-level chunking and retrieval for document Q&A.
// Each page is cut into passages of roughly 500-900 characters. A passage keeps
// start/end offsets into the page's ORIGINAL content, so
// content.slice(start, end) === passage.text always holds. Pure: no network.

import { extractKeywords, extractPhrases, detectTargetPage } from './pdfRetriever.ts';

export interface SourcePageInput {
  pageNumber: number;
  title?: string;
  content: string;
}

export interface Passage {
  id: string; // 'p{page}-{n}'
  pageNumber: number;
  start: number;
  end: number;
  text: string;
}

// Characters of passage text sent to the model. About 4,000 tokens, which leaves
// room for the prompt and the answer under Groq's ~7,000 token per-request limit.
// About 14,000 characters of passages (roughly 4,000 tokens). Groq's free tier allows about 8,000
// tokens per minute and 200,000 per day per model, so this is one to two questions a minute.
export const CONTEXT_BUDGET_CHARS = 14000;
export const PASSAGE_MIN_CHARS = 500;
export const PASSAGE_MAX_CHARS = 900;
// The question counts as answerable when at least this share of its keywords
// appears in the best passages.
export const MIN_KEYWORD_COVERAGE = 0.5;

interface Span {
  start: number;
  end: number;
}

function trimSpan(content: string, start: number, end: number): Span | null {
  while (start < end && /\s/.test(content[start])) start++;
  while (end > start && /\s/.test(content[end - 1])) end--;
  return end > start ? { start, end } : null;
}

// Cut a span that is longer than the maximum, at sentence ends first, then at spaces.
function splitLongSpan(content: string, span: Span, max: number): Span[] {
  const out: Span[] = [];
  let start = span.start;
  while (span.end - start > max) {
    const limit = start + max;
    const window = content.slice(start, limit);
    let cut = -1;
    const sentenceEnd = /[.!?]["')\]]?\s/g;
    let m: RegExpExecArray | null;
    while ((m = sentenceEnd.exec(window)) !== null) {
      cut = start + m.index + m[0].length;
    }
    if (cut < start + PASSAGE_MIN_CHARS / 2) {
      // No usable sentence end: cut at the last whitespace so no word is split.
      const ws = Math.max(window.lastIndexOf(' '), window.lastIndexOf('\n'));
      cut = ws > 0 ? start + ws + 1 : limit;
    }
    const piece = trimSpan(content, start, cut);
    if (piece) out.push(piece);
    start = cut;
  }
  const rest = trimSpan(content, start, span.end);
  if (rest) out.push(rest);
  return out;
}

export function splitPageIntoPassages(
  pageNumber: number,
  content: string,
  min = PASSAGE_MIN_CHARS,
  max = PASSAGE_MAX_CHARS
): Passage[] {
  const text = content || '';
  if (!text.trim()) return [];

  // 1. Paragraph spans on blank lines.
  const units: Span[] = [];
  const blank = /\n[ \t\r]*\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = blank.exec(text)) !== null) {
    const s = trimSpan(text, last, m.index);
    if (s) units.push(s);
    last = m.index + m[0].length;
  }
  const tail = trimSpan(text, last, text.length);
  if (tail) units.push(tail);

  // 2. Paragraphs over the maximum are cut at sentence boundaries.
  const pieces: Span[] = [];
  for (const u of units) {
    if (u.end - u.start > max) pieces.push(...splitLongSpan(text, u, max));
    else pieces.push(u);
  }

  // 3. Pack neighbouring pieces up to the maximum.
  const spans: Span[] = [];
  let cur: Span | null = null;
  for (const p of pieces) {
    if (!cur) {
      cur = { ...p };
      continue;
    }
    if (p.end - cur.start <= max) {
      cur.end = p.end;
    } else {
      spans.push(cur);
      cur = { ...p };
    }
  }
  if (cur) spans.push(cur);

  // A short last passage joins the one before it when it fits.
  if (spans.length >= 2) {
    const a = spans[spans.length - 2];
    const b = spans[spans.length - 1];
    if (b.end - b.start < min / 2 && b.end - a.start <= max) {
      a.end = b.end;
      spans.pop();
    }
  }

  return spans.map((s, i) => ({
    id: `p${pageNumber}-${i + 1}`,
    pageNumber,
    start: s.start,
    end: s.end,
    text: text.slice(s.start, s.end),
  }));
}

export function buildPassages(pages: SourcePageInput[]): Passage[] {
  const out: Passage[] = [];
  for (const page of pages) out.push(...splitPageIntoPassages(page.pageNumber, page.content || ''));
  return out;
}

// ---------- Quote location ----------

interface NormalizedText {
  text: string;
  map: number[]; // map[i] = index in the original string of normalised char i
}

function normalizeWithMap(original: string): NormalizedText {
  let text = '';
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < original.length; ) {
    const cp = original.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const width = ch.length;
    // A word split across a PDF line break ("experi-\nment") is one word: skip the hyphen and the break.
    if (ch === '-' && text.length > 0 && /\p{L}/u.test(original[i - 1] ?? '')) {
      const join = original.slice(i).match(/^-\s*\n\s*/);
      if (join) {
        i += join[0].length;
        continue;
      }
    }
    // A combining mark (the accent in "K̂n") belongs to the letter before it, so it is not a break.
    if (/\p{M}/u.test(ch)) {
      i += width;
      continue;
    }
    if (/[\p{L}\p{N}]/u.test(ch)) {
      if (pendingSpace && text.length > 0) {
        text += ' ';
        map.push(i - 1);
      }
      pendingSpace = false;
      const lower = ch.toLowerCase();
      for (let k = 0; k < lower.length; k++) map.push(i);
      text += lower;
    } else {
      pendingSpace = true;
    }
    i += width;
  }
  return { text, map };
}

// A quote may be several sentences, joined by "..." or with a sentence quietly left out.
const PIECE_BREAK = /\.{3,}|…|(?<=[.!?])\s+(?=[A-Z0-9(])/;
const MIN_PIECE_WORDS = 3;
const MIN_COVERAGE = 0.8;

const wordCount = (s: string) => normalizeWithMap(s).text.split(' ').filter(Boolean).length;

// When the whole quote is not in the text, each of its sentences must be, verbatim and in
// order, and those sentences must make up at least 80% of the quote's words. So a quote
// with a sentence skipped is supported, and a quote with invented text is not.
export function locateQuote(quote: string, content: string): { start: number; end: number } | null {
  const whole = locateOne(quote, content);
  if (whole) return whole;

  const all = (quote || '').split(PIECE_BREAK);
  const pieces = all.filter((p) => wordCount(p) >= MIN_PIECE_WORDS);
  if (all.length < 2 || pieces.length === 0) return null;
  const totalWords = all.reduce((n, p) => n + wordCount(p), 0);
  const keptWords = pieces.reduce((n, p) => n + wordCount(p), 0);
  if (totalWords === 0 || keptWords / totalWords < MIN_COVERAGE) return null;

  let offset = 0;
  let first: { start: number; end: number } | null = null;
  let last: { start: number; end: number } | null = null;
  for (const piece of pieces) {
    const hit = locateOne(piece, content.slice(offset));
    if (!hit) return null;
    const abs = { start: hit.start + offset, end: hit.end + offset };
    first = first ?? abs;
    last = abs;
    offset = abs.end;
  }
  return first && last ? { start: first.start, end: last.end } : null;
}

// Finds `quote` inside `content` ignoring case, punctuation and line breaks, and
// returns the exact [start, end) slice of the original content.
function locateOne(quote: string, content: string): { start: number; end: number } | null {
  const q = normalizeWithMap(quote || '').text;
  if (!q) return null;
  const norm = normalizeWithMap(content || '');
  const idx = norm.text.indexOf(q);
  if (idx === -1) return null;
  const start = norm.map[idx];
  const lastChar = norm.map[idx + q.length - 1];
  // Advance past the whole last character (it may be a surrogate pair).
  const lastCp = (content || '').codePointAt(lastChar)!;
  const end = lastChar + String.fromCodePoint(lastCp).length;
  return { start, end };
}

// ---------- Retrieval ----------

const SUMMARY_QUESTION =
  /\b(abstract|summar(?:y|ize|ise|ies)|overview|tl;?dr|main (?:point|idea|finding)s?|key (?:point|finding)s?|what is (?:this|the) (?:paper|document|article|study|report|pdf)|(?:paper|document|article|study|report|pdf) (?:is )?about)\b/i;

const SYNONYMS: Record<string, string[]> = {
  fast: ['speed', 'velocity'],
  quick: ['speed'],
  quickly: ['speed'],
  speed: ['velocity'],
  big: ['size'],
  large: ['size'],
  old: ['age'],
  many: ['number'],
};

export function isSummaryQuestion(question: string): boolean {
  return SUMMARY_QUESTION.test(question || '');
}

function stemOf(word: string): string {
  let w = word.toLowerCase();
  if (w.length < 5) return w;
  for (const suf of ['ing', 'edly', 'ed', 'es', 'ly', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// One regex per keyword: the stem at a word start, plus any synonym.
function keywordMatcher(keyword: string): RegExp {
  const variants = [keyword, ...(SYNONYMS[keyword] || [])];
  const parts = variants.map((v) => {
    const stem = stemOf(v);
    return /\d/.test(stem) ? `(?<![\\w.])${escapeRegex(stem)}(?![\\w])` : `\\b${escapeRegex(stem)}\\w*`;
  });
  return new RegExp(parts.join('|'), 'gi');
}

export interface PassageRetrieval {
  passages: Passage[]; // selected passages in document order
  context: string; // formatted for the model, with passage ids
  allPassages: Passage[];
  relevant: boolean; // false when the passages contain nothing relevant to the question
  coverage: number; // share of question keywords found in the best passages
  targetPage: number | null;
  bestPageNumber: number;
  contextChars: number;
  wholeDocument: boolean;
}

export function formatPassageContext(passages: Passage[], pages: SourcePageInput[]): string {
  const titles = new Map(pages.map((p) => [p.pageNumber, p.title || `Page ${p.pageNumber}`]));
  const blocks: string[] = [];
  let currentPage = -1;
  for (const p of passages) {
    if (p.pageNumber !== currentPage) {
      currentPage = p.pageNumber;
      blocks.push(`--- [PAGE ${p.pageNumber}: ${titles.get(p.pageNumber)}] ---`);
    }
    blocks.push(`[P${p.pageNumber}-${p.id.split('-')[1]} | page ${p.pageNumber}]\n${p.text}`);
  }
  return blocks.join('\n\n');
}

export function retrievePassages(
  pages: SourcePageInput[],
  question: string,
  options: { budget?: number; activeCurrentPage?: number } = {}
): PassageRetrieval {
  const budget = options.budget ?? CONTEXT_BUDGET_CHARS;
  const all = buildPassages(pages);
  const targetPage = detectTargetPage(question, Math.max(...pages.map((p) => p.pageNumber), 1));
  const keywords = Array.from(
    new Set(extractKeywords(question).filter((k) => k !== 'page' && k !== 'pg' && !/^\d{1,4}$/.test(k)))
  );
  const phrases = extractPhrases(question, 3).filter((p) => p.length >= 15);

  const matchers = keywords.map(keywordMatcher);
  const lowers = all.map((p) => p.text.toLowerCase());
  const df = matchers.map((re) => lowers.filter((t) => t.match(re) !== null).length);

  const scored = all.map((p, i) => {
    let score = 0;
    const matched = new Set<number>();
    matchers.forEach((re, k) => {
      const hits = p.text.match(re);
      if (hits && hits.length) {
        matched.add(k);
        const idf = Math.log(1 + all.length / Math.max(1, df[k]));
        score += idf * (1 + Math.log2(hits.length)) * Math.min(6, Math.max(2, keywords[k].length / 2));
      }
    });
    for (const phrase of phrases) {
      if (lowers[i].includes(phrase)) score += phrase.split(' ').length * 8;
    }
    return { passage: p, score, matched };
  });

  // Relevance: how many question keywords the best passages cover.
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3).filter((s) => s.score > 0);
  const covered = new Set<number>();
  top.forEach((s) => s.matched.forEach((k) => covered.add(k)));
  const coverage = keywords.length === 0 ? 1 : covered.size / keywords.length;
  const summary = isSummaryQuestion(question);
  const relevant = summary || targetPage !== null || keywords.length === 0 || (top.length > 0 && coverage >= MIN_KEYWORD_COVERAGE);

  const totalChars = all.reduce((n, p) => n + p.text.length, 0);
  const wholeDocument = totalChars <= budget;
  const selected = new Map<string, Passage>();
  let used = 0;
  const add = (p: Passage): boolean => {
    if (selected.has(p.id)) return true;
    if (used + p.text.length > budget) return false;
    selected.set(p.id, p);
    used += p.text.length;
    return true;
  };

  if (wholeDocument) {
    all.forEach(add);
  } else {
    // 1. Explicit page reference: that page first, then its neighbours.
    if (targetPage !== null) {
      for (const offset of [0, -1, 1]) {
        all.filter((p) => p.pageNumber === targetPage + offset).forEach(add);
      }
    }
    // 2. Abstract / summary questions: page-1 passages around "Abstract".
    if (summary) {
      const first = all.filter((p) => p.pageNumber === (pages[0]?.pageNumber ?? 1));
      let at = first.findIndex((p) => /\babstract\b/i.test(p.text));
      if (at === -1) at = 0;
      for (let i = Math.max(0, at - 1); i <= Math.min(first.length - 1, at + 3); i++) add(first[i]);
    }
    // 3. Highest scoring passages, then their immediate neighbours while room is left.
    for (const s of ranked) {
      if (s.score <= 0) break;
      add(s.passage);
    }
    const chosen = Array.from(selected.values());
    for (const p of chosen) {
      const idx = all.indexOf(p);
      for (const n of [all[idx + 1], all[idx - 1]]) {
        if (n && n.pageNumber === p.pageNumber && used + n.text.length <= budget * 0.9) add(n);
      }
    }
  }

  const passages = Array.from(selected.values()).sort((a, b) => {
    const ia = all.indexOf(a);
    const ib = all.indexOf(b);
    return ia - ib;
  });

  const best = targetPage ?? (top[0]?.passage.pageNumber ?? options.activeCurrentPage ?? pages[0]?.pageNumber ?? 1);

  return {
    passages,
    context: formatPassageContext(passages, pages),
    allPassages: all,
    relevant,
    coverage,
    targetPage,
    bestPageNumber: best,
    contextChars: used,
    wholeDocument,
  };
}
