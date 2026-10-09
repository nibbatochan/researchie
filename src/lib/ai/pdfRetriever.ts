export interface PDFDocumentPage {
  pageNumber: number;
  title?: string;
  content: string;
  highlights?: any[];
}

export interface RetrievalResult {
  retrievedPages: Array<{
    pageNumber: number;
    title: string;
    content: string;
    score: number;
    isExplicitTarget?: boolean;
  }>;
  formattedContext: string;
  targetPageMentioned: number | null;
  bestMatchingPageNumber: number;
  topCitationSnippet?: string;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by',
  'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
  'now', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is',
  'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
  'does', 'did', 'doing', 'would', 'could', 'how', 'why', 'tell', 'me', 'explain',
  'describe', 'summarize', 'find', 'show', 'give', 'list', 'please'
]);

/**
 * Detect explicit page references in a user question (e.g. "page 135", "p. 135", "table on page 42", "p135", "pg. 12")
 */
export function detectTargetPage(question: string, totalPages = 1000): number | null {
  if (!question) return null;
  const q = question.toLowerCase();

  // Patterns: "page 135", "page: 135", "p. 135", "p 135", "pg. 135", "pg 135", "p135", "page# 135", "table on 135"
  const patterns = [
    /\b(?:page|pg\.?|p\.?|p)\s*[:#]?\s*(\d{1,4})\b/i,
    /\b(?:table|figure|section|diagram|chart|graph)\s+(?:on\s+)?(?:page\s+)?(\d{1,4})\b/i,
    /\b(?:on|at)\s+page\s+(\d{1,4})\b/i,
  ];

  for (const regex of patterns) {
    const match = q.match(regex);
    if (match && match[1]) {
      const pageNum = parseInt(match[1], 10);
      if (pageNum >= 1 && pageNum <= totalPages) {
        return pageNum;
      }
    }
  }

  return null;
}

/**
 * Clean & tokenize text into significant keywords (length >= 2, non-stopwords)
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s\d$%.-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Extract multi-word n-grams (2-4 words) for copy-pasted phrase detection
 */
export function extractPhrases(text: string, minLength = 3): string[] {
  if (!text) return [];
  const words = text
    .replace(/[^\w\s\d$%.-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const phrases: string[] = [];
  for (let len = minLength; len <= Math.min(8, words.length); len++) {
    for (let i = 0; i <= words.length - len; i++) {
      phrases.push(words.slice(i, i + len).join(' ').toLowerCase());
    }
  }
  return phrases;
}

/**
 * Multi-factor relevance scoring for a single PDF page against a user query
 */
export function scorePage(
  page: PDFDocumentPage,
  question: string,
  keywords: string[],
  phrases: string[],
  targetPageNum: number | null,
  activeCurrentPage?: number
): { score: number; isExplicitTarget: boolean; bestSnippet: string } {
  const content = page.content || '';
  const lowerContent = content.toLowerCase();
  let score = 0;
  let isExplicitTarget = false;
  let bestSnippet = '';

  // 1. Explicit target page boost (e.g. user asks "table on page 135")
  if (targetPageNum !== null) {
    if (page.pageNumber === targetPageNum) {
      score += 10000;
      isExplicitTarget = true;
    } else if (Math.abs(page.pageNumber - targetPageNum) === 1) {
      // Immediate neighbor (+-1 page)
      score += 2500;
    } else if (Math.abs(page.pageNumber - targetPageNum) === 2) {
      // 2 pages away
      score += 500;
    }
  }

  // 2. Exact Long-Phrase Matching (handles direct copy-pasting of text from PDF)
  for (const phrase of phrases) {
    if (phrase.length >= 15 && lowerContent.includes(phrase)) {
      const phraseWordCount = phrase.split(' ').length;
      score += phraseWordCount * 120; // Massive boost for verbatim multi-word matches
      if (!bestSnippet) {
        const idx = lowerContent.indexOf(phrase);
        bestSnippet = content.slice(Math.max(0, idx - 40), Math.min(content.length, idx + phrase.length + 80)).trim();
      }
    }
  }

  // 3. Keyword / Term frequency matching with rare term weighting
  for (const kw of keywords) {
    if (!kw) continue;

    // Exact word boundary match
    const kwRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowerContent.match(kwRegex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      // Give higher weight to numbers, percentages, metrics, and longer technical terms
      const isMetricOrNumeric = /\d/.test(kw) || kw.includes('%') || kw.includes('$');
      const termWeight = isMetricOrNumeric ? 25 : Math.min(18, kw.length * 2.5);
      // Sublinear term frequency (log-scaled) to prevent single-keyword spam
      score += termWeight * Math.log2(1 + count);
    }
  }

  // 4. Boost for active page currently visible in viewport if relevant
  if (activeCurrentPage && page.pageNumber === activeCurrentPage && score > 0) {
    score += 50;
  }

  // Find a fallback best snippet if none found
  if (!bestSnippet && content.trim()) {
    const sentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 25);
    let topSentence = sentences[0] || content.slice(0, 160);
    let topMatchCount = 0;

    for (const s of sentences) {
      const sLower = s.toLowerCase();
      const matchCount = keywords.filter((k) => sLower.includes(k)).length;
      if (matchCount > topMatchCount) {
        topMatchCount = matchCount;
        topSentence = s;
      }
    }
    bestSnippet = topSentence.trim();
  }

  return { score, isExplicitTarget, bestSnippet };
}

/**
 * Intelligent Document Retrieval across ALL pages of a document
 */
export function retrieveRelevantDocumentContext(
  pages: PDFDocumentPage[],
  question: string,
  activeCurrentPage?: number,
  maxContextChars = 90000
): RetrievalResult {
  if (!pages || pages.length === 0) {
    return {
      retrievedPages: [],
      formattedContext: 'No document pages available.',
      targetPageMentioned: null,
      bestMatchingPageNumber: 1,
    };
  }

  const targetPageMentioned = detectTargetPage(question, pages.length);
  const keywords = extractKeywords(question);
  const phrases = extractPhrases(question, 3);

  // Score all pages
  const scoredPages = pages.map((page) => {
    const { score, isExplicitTarget, bestSnippet } = scorePage(
      page,
      question,
      keywords,
      phrases,
      targetPageMentioned,
      activeCurrentPage
    );
    return {
      pageNumber: page.pageNumber,
      title: page.title || `Page ${page.pageNumber}`,
      content: page.content || '',
      score,
      isExplicitTarget,
      bestSnippet,
    };
  });

  // Sort pages descending by score
  scoredPages.sort((a, b) => b.score - a.score);

  // Top matching page number
  const bestMatchingPageNumber = targetPageMentioned !== null
    ? targetPageMentioned
    : scoredPages[0]?.score > 0
    ? scoredPages[0].pageNumber
    : (activeCurrentPage || 1);

  // Select candidate pages up to max character budget
  const selectedPagesMap = new Map<number, typeof scoredPages[0]>();

  // 1. If explicit target page was mentioned, always include target + surrounding context
  if (targetPageMentioned !== null) {
    const targetIdx = pages.findIndex((p) => p.pageNumber === targetPageMentioned);
    if (targetIdx !== -1) {
      // Include target page and adjacent pages (before and after)
      const start = Math.max(0, targetIdx - 1);
      const end = Math.min(pages.length - 1, targetIdx + 1);
      for (let i = start; i <= end; i++) {
        const p = pages[i];
        const scored = scoredPages.find((sp) => sp.pageNumber === p.pageNumber);
        if (scored) {
          selectedPagesMap.set(p.pageNumber, scored);
        }
      }
    }
  }

  // 2. Add highest scoring search results until budget reached
  let currentLength = Array.from(selectedPagesMap.values()).reduce((acc, p) => acc + p.content.length, 0);

  for (const sp of scoredPages) {
    if (selectedPagesMap.has(sp.pageNumber)) continue;
    if (currentLength + sp.content.length > maxContextChars && selectedPagesMap.size >= 4) {
      break;
    }
    selectedPagesMap.set(sp.pageNumber, sp);
    currentLength += sp.content.length;
    if (selectedPagesMap.size >= 12) break;
  }

  // If entire document is small (< 60,000 chars), include all pages in sequential order
  const totalDocChars = pages.reduce((acc, p) => acc + (p.content?.length || 0), 0);
  if (totalDocChars <= maxContextChars) {
    pages.forEach((p) => {
      if (!selectedPagesMap.has(p.pageNumber)) {
        const scored = scoredPages.find((sp) => sp.pageNumber === p.pageNumber);
        if (scored) selectedPagesMap.set(p.pageNumber, scored);
      }
    });
  }

  // Sort selected pages in natural sequential page order (Page 1, 2, 3...)
  const finalPages = Array.from(selectedPagesMap.values()).sort((a, b) => a.pageNumber - b.pageNumber);

  // Build formatted context
  const formattedContext = finalPages
    .map((p) => `--- [PAGE ${p.pageNumber}: ${p.title}] ---\n${p.content}`)
    .join('\n\n');

  const topCitationSnippet = scoredPages.find((p) => p.pageNumber === bestMatchingPageNumber)?.bestSnippet || scoredPages[0]?.bestSnippet;

  return {
    retrievedPages: finalPages,
    formattedContext,
    targetPageMentioned,
    bestMatchingPageNumber,
    topCitationSnippet,
  };
}
