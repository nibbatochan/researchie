/**
 * Generates a robust W3C Scroll-to-Text Fragment anchor compliant with Chrome, Edge, Safari, and Firefox.
 * Format: #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
 */

function encodeFragmentComponent(str: string): string {
  // Strip leading/trailing non-word punctuation that browsers fail to match
  const sanitized = str
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9]+$/, '')
    .trim();

  const target = sanitized || str;
  return encodeURIComponent(target)
    .replace(/-/g, '%2D')
    .replace(/,/g, '%2C')
    .replace(/&/g, '%26')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

export function stripMarkdownAndFormatting(text: string): string {
  if (!text) return '';
  return text
    // Strip markdown images and links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Strip markdown headers, blockquotes, bullets
    .replace(/^[#>\-\*\+\d\.\s]+/gm, ' ')
    // Strip HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Normalize quotes and dashes
    .replace(/[“”"«»]/g, '')
    .replace(/[‘’']/g, '')
    .replace(/[—–]/g, '-')
    // Collapse whitespace and newlines
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes text by removing markdown, quotes, em-dashes, and excessive punctuation.
 */
function normalizeTextForMatching(text: string): string {
  return stripMarkdownAndFormatting(text);
}

export function generateTextFragment(
  text: string,
  contextPrefix?: string,
  contextSuffix?: string
): string {
  if (!text) return '';

  const clean = normalizeTextForMatching(text);
  if (!clean) return '';

  // Use the first sentence or chunk to avoid crossing block-level DOM elements
  const firstSentence = clean.split(/[.!?]\s+/)[0] || clean;
  const sentenceWords = firstSentence
    .split(' ')
    .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter(Boolean);

  const allWords = clean
    .split(' ')
    .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter(Boolean);

  const words = sentenceWords.length >= 3 ? sentenceWords : allWords;
  if (words.length === 0) return '';

  let textMatch = '';
  if (words.length <= 6) {
    textMatch = encodeFragmentComponent(words.join(' '));
  } else {
    // 3-4 clean start words and 3-4 clean end words from the same sentence
    const startWords = words.slice(0, 4).join(' ');
    const endWords = words.slice(-3).join(' ');
    textMatch = `${encodeFragmentComponent(startWords)},${encodeFragmentComponent(endWords)}`;
  }

  let fragment = `#:~:text=`;
  if (contextPrefix && contextPrefix.trim()) {
    const cleanPrefix = normalizeTextForMatching(contextPrefix);
    const prefixWords = cleanPrefix
      .split(' ')
      .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
      .filter(Boolean)
      .slice(-3)
      .join(' ');
    if (prefixWords) {
      fragment += `${encodeFragmentComponent(prefixWords)}-,`;
    }
  }
  fragment += textMatch;
  if (contextSuffix && contextSuffix.trim()) {
    const cleanSuffix = normalizeTextForMatching(contextSuffix);
    const suffixWords = cleanSuffix
      .split(' ')
      .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
      .filter(Boolean)
      .slice(0, 3)
      .join(' ');
    if (suffixWords) {
      fragment += `,-${encodeFragmentComponent(suffixWords)}`;
    }
  }

  return fragment;
}

/**
 * Builds a deep URL link with the W3C text fragment attached.
 */
export function buildDeepLink(sourceUrl?: string, textFragment?: string, fallbackText?: string): string {
  if (!sourceUrl) return '';
  if (sourceUrl.startsWith('data:')) return sourceUrl;

  // If sourceUrl already contains a text fragment directive, preserve it
  if (sourceUrl.includes('#:~:text=')) {
    return sourceUrl;
  }

  // Remove any standard anchor hash before attaching the text fragment
  const baseUrl = sourceUrl.split('#')[0];

  let fragment = textFragment;
  if (!fragment && fallbackText) {
    fragment = generateTextFragment(fallbackText);
  }

  if (!fragment) return baseUrl;

  const cleanFragment = fragment.startsWith('#') ? fragment : `#${fragment}`;
  return `${baseUrl}${cleanFragment}`;
}
