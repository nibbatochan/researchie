// The section checklist: what must be true before a section can be marked done. Pure, no AI.
// "No source, no claim": a section with an unsourced sentence, a fake quote, an invented number, an open
// placeholder or a retracted source can not be marked done. Some things only warn.
// Passing means "nothing the checks can see is wrong", not "this section is correct": the researcher still
// reads each sentence against its clip.

import type { OutlineSection } from './outline.ts';
import type { ClipInfo } from './preview.ts';
import { STATUS_MESSAGE, type SentenceStatus } from './draft.ts';
import { checkAuthored, splitCites } from './authored.ts';

export type ChecklistSeverity = 'block' | 'warn';

export interface ChecklistItem {
  id: string;
  severity: ChecklistSeverity;
  message: string;
}

export interface SectionChecklist {
  items: ChecklistItem[];
  canComplete: boolean; // no blocking item
}

// Publishers draw the line differently (checked 2026-10-20): NIHR Journals Library asks for permission above
// 50 words, Cambridge's thesis guidance allows under 100, APA sets block quotes at 40. 50 is the strictest of
// those, so it is the default. The target journal's own rules control.
export const LONG_QUOTE_WORDS = 50;

const BLOCKING_STATUSES: SentenceStatus[] = ['unsourced', 'bad-quote', 'bad-number', 'bad-math', 'copied', 'mixed', 'ai-based'];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Quoted passages in a sentence, in straight or curly quotation marks. */
function quotedSpans(text: string): string[] {
  return [...text.matchAll(/[“"]([^”"]{12,})[”"]/g)].map((m) => m[1]);
}

export function checkSection(section: OutlineSection, clips: Map<string, ClipInfo>): SectionChecklist {
  const items: ChecklistItem[] = [];
  const block = (id: string, message: string) => items.push({ id, severity: 'block', message });
  const warn = (id: string, message: string) => items.push({ id, severity: 'warn', message });

  // The clips whose text appears in the section: those cited by the draft, or all placed clips.
  let shown: ClipInfo[] = [];
  let longQuotes = 0;

  // The researcher's own text, when there is some, is what the preview shows: it is what gets checked.
  if (section.text?.trim()) {
    const result = checkAuthored(section.text, section.cites ?? {}, clips);
    items.push(...result.issues);
    shown = result.citedClipIds.map((id) => clips.get(id)).filter((c): c is ClipInfo => !!c);
    const plain = splitCites(section.text).map((p) => (p.type === 'text' ? p.value : ' ')).join('');
    longQuotes = quotedSpans(plain).filter((q) => wordCount(q) > LONG_QUOTE_WORDS).length;
  } else if (section.draft) {
    const sentences = section.draft.sentences;
    if (sentences.length === 0) block('empty-draft', 'The draft has no sentences. Draft again or clear it.');
    for (const status of BLOCKING_STATUSES) {
      const n = sentences.filter((s) => s.status === status).length;
      if (n > 0) block(`status-${status}`, `${plural(n, 'sentence', 'sentences')}: ${STATUS_MESSAGE[status]}`);
    }
    const placeholders = sentences.filter((s) => s.placeholder).length;
    if (placeholders > 0) block('placeholders', `${plural(placeholders, 'sentence has', 'sentences have')} a [ ? ] placeholder to fill in from your own records.`);
    const ids = new Set(sentences.flatMap((s) => s.clipIds));
    shown = [...ids].map((id) => clips.get(id)).filter((c): c is ClipInfo => !!c);
    longQuotes = sentences.flatMap((s) => quotedSpans(s.text)).filter((q) => wordCount(q) > LONG_QUOTE_WORDS).length;
  } else {
    const placed = section.parts.flatMap((p) => p.clipIds).map((id) => clips.get(id)).filter((c): c is ClipInfo => !!c);
    shown = placed;
    if (placed.length === 0 && !section.point.trim()) block('empty', 'Nothing here yet. Add a point, or place clips under a part.');
    const uncited = placed.filter((c) => c.kind === 'quote' && !c.record && !c.media).length;
    if (uncited > 0) block('uncited', `${plural(uncited, 'quote clip has', 'quote clips have')} no citation. No source, no claim.`);
    const ai = placed.filter((c) => c.kind === 'ai-summary').length;
    if (ai > 0) block('ai-summary', `${plural(ai, 'AI summary is', 'AI summaries are')} still to rewrite. Find the paper and clip the passage, or draft the section.`);
    longQuotes = placed.filter((c) => c.kind === 'quote' && wordCount(c.text) > LONG_QUOTE_WORDS).length;
  }

  // Figures and tables placed in the section, whether or not the section has a draft.
  const media = section.parts.flatMap((p) => p.clipIds).map((id) => clips.get(id)).filter((c): c is ClipInfo => !!c && !!c.media);
  const unsourcedMedia = media.filter((c) => c.kind !== 'mine' && !c.record).length;
  if (unsourcedMedia > 0) block('figure-source', `${plural(unsourcedMedia, 'figure or table has', 'figures and tables have')} no source. No source, no figure: attach a citation to the clip.`);
  const uncaptioned = media.filter((c) => !c.media?.caption.trim()).length;
  if (uncaptioned > 0) warn('figure-caption', `${plural(uncaptioned, 'figure or table has', 'figures and tables have')} no caption. A caption says what it shows.`);
  const borrowed = media.filter((c) => c.kind !== 'mine' && c.record).length;
  if (borrowed > 0) warn('figure-permission', `${plural(borrowed, 'figure or table comes', 'figures and tables come')} from another source. Most publishers want permission to reuse a figure or table, however small. Check the licence and the journal's rules.`);
  shown = [...shown, ...media.filter((c) => !shown.includes(c))];

  // Retraction: only sources a quote actually cites. The DOI lookup sets record.retracted only when Crossref
  // lists notices, so "no result" can mean "no notice" or "never checked": the wording says so.
  const cited = shown.filter((c) => c.kind === 'quote' && c.record);
  const isRetracted = (c: ClipInfo) => c.record?.retracted === true || c.retractionState === 'retracted' || c.retractionState === 'removed';
  for (const c of cited.filter(isRetracted)) block(`retracted-${c.id}`, `"${c.record?.title ?? 'A cited source'}" has been retracted. Do not cite it as valid evidence.`);
  const concerns = cited.filter((c) => !isRetracted(c) && c.retractionState === 'concern').length;
  if (concerns > 0) warn('retraction-concern', `${plural(concerns, 'cited source has', 'cited sources have')} an expression of concern from the publisher. Read the notice before you rely on it.`);
  const noResult = cited.filter((c) => c.record?.retracted === undefined && c.retractionState === undefined).length;
  if (noResult > 0) warn('retraction-unchecked', `${plural(noResult, 'cited source has', 'cited sources have')} no retraction result on record. A paper with no notice and a paper never checked look the same here, so check the journal page.`);

  if (longQuotes > 0) {
    warn('long-quote', `${plural(longQuotes, 'quote is', 'quotes are')} over ${LONG_QUOTE_WORDS} words. Shorten or paraphrase it, or check the journal's rules on quoting. Figures and tables need permission whatever their length.`);
  }

  return { items, canComplete: !items.some((i) => i.severity === 'block') };
}
