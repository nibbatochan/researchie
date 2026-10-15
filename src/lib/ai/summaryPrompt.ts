// Prompts and the offline fallback for page summaries. A summary is written from the page's own text:
// no fixed template, no advice or implications the page does not state. The mode only sets the shape.

export type SummaryMode = 'auto' | 'bullets' | 'detailed' | 'tables';

export const SUMMARY_MODES: SummaryMode[] = ['auto', 'bullets', 'detailed', 'tables'];

/** The most page text sent to the model. Longer pages are cut, and the summary says so. */
export const SUMMARY_TEXT_LIMIT = 15000;

export const NO_TABLES_MESSAGE = 'No tables or comparable data found on this page.';

export function parseSummaryMode(value: unknown): SummaryMode {
  return SUMMARY_MODES.includes(value as SummaryMode) ? (value as SummaryMode) : 'auto';
}

export const SUMMARY_SYSTEM_PROMPT =
  'You summarize web pages for a researcher. Use ONLY the page text you are given. Do not add facts, opinions, advice or implications that the page does not state. ' +
  'Keep names, numbers and units exactly as written. Choose the shape the content calls for, with no fixed template and no filler headings. ' +
  'If the text is mostly navigation, cookie notices or boilerplate, say that in one line and summarize only what real content there is. Reply in Markdown.';

const MODE_INSTRUCTIONS: Record<SummaryMode, string> = {
  auto:
    'Write a summary whose shape fits this page: short prose for a simple page, or a few headed sections only if the page has distinct parts. ' +
    'Let the length follow the content: at least 2 sentences, at most about 350 words.',
  bullets: 'Write exactly 3 Markdown bullets. Each is one sentence and states one of the three most important points of the page.',
  detailed:
    'Write a detailed breakdown that follows the page\'s own order. Use headings taken from the page\'s own sections. ' +
    'Include the key numbers, definitions and conclusions. At most about 700 words.',
  tables:
    'Extract every table and every comparison of items found in the text as Markdown tables, one per topic. Never invent a value. ' +
    `If the text has no tabular or comparable data, reply with exactly: ${NO_TABLES_MESSAGE}`,
};

export function buildSummaryPrompt(mode: SummaryMode, pageTitle: string, pageText: string): string {
  const cut = pageText.length > SUMMARY_TEXT_LIMIT;
  return `${MODE_INSTRUCTIONS[mode]}\n\nPage title: ${pageTitle}\nPage text:\n${pageText.slice(0, SUMMARY_TEXT_LIMIT)}${cut ? '\n[Page text cut here.]' : ''}`;
}

/** Appended to the summary when the page was longer than the model saw. */
export function truncationNote(pageText: string): string {
  return pageText.length > SUMMARY_TEXT_LIMIT
    ? `\n\n_This summary covers the first ${SUMMARY_TEXT_LIMIT.toLocaleString('en-US')} characters of the page._`
    : '';
}

/**
 * Used when no model can answer. It quotes the page's own sentences, in order, and says so.
 * It never writes advice, implications or anything the page does not contain.
 */
export function extractiveSummary(pageText: string, pageTitle: string, mode: SummaryMode = 'auto'): string {
  const sentences = pageText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 40 && s.length < 300 && !/cookie|terms of service|privacy policy|sign in|subscribe/i.test(s));
  const unique: string[] = [];
  for (const s of sentences) {
    if (!unique.some((u) => u.slice(0, 30) === s.slice(0, 30))) unique.push(s);
  }
  const count = mode === 'bullets' ? 3 : mode === 'detailed' ? 10 : 5;
  const picked = unique.slice(0, count);
  const note = '_The AI model could not be reached, so these are the first sentences of the page, not a written summary._';
  if (mode === 'tables') return `${NO_TABLES_MESSAGE}\n\n${note}`;
  if (picked.length === 0) return `Not enough readable text on "${pageTitle}" to summarize.\n\n${note}`;
  return `${picked.map((s) => `- ${s}`).join('\n')}\n\n${note}`;
}
