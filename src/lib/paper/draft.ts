// Drafting a section from the clips placed under it. This file holds the parts that need no network:
// the prompt (small, so it fits a free Groq limit), the reading of the model's answer, and the checks.
// The model only ever sees the clips of one section. Every sentence it writes must name the clips it
// rests on; the checks below then catch what a model gets wrong without asking a model again:
//   - a clip id that does not exist (invented source)
//   - a quotation that is not word for word in a cited quote clip
//   - a number that is in none of the cited clips
//   - a run of words copied from a quote clip without quotation marks (passing a source's words off as the researcher's own)
//   - a sentence with no clip behind it
// A sentence that passes is still only "sourced", not "true": the researcher must read each one against its clip.

import type { EvidenceKind } from '../atoms/evidence.ts';
import { normalizeForMatch } from '../ai/claimSupport.ts';

export type SentenceStatus = 'sourced' | 'own' | 'ai-based' | 'unsourced' | 'bad-quote' | 'bad-number' | 'copied';

export interface DraftSentence {
  text: string;
  clipIds: string[]; // only ids that exist in the section
  partId?: string;
  status: SentenceStatus;
  placeholder: boolean; // contains [something?], a fact the researcher still has to supply
}

export interface SectionDraft {
  sentences: DraftSentence[];
  generatedAt: string; // ISO 8601
}

export interface DraftClip {
  id: string;
  kind: EvidenceKind;
  text: string;
}

export interface DraftInput {
  sectionTitle: string;
  sectionHint: string;
  point: string; // the researcher's one-sentence point for the section
  parts: Array<{ id: string; title: string; clips: DraftClip[] }>;
}

export const MAX_CLIPS_PER_DRAFT = 12;
const PROMPT_CHAR_BUDGET = 6000; // about 1,500 tokens of clip text, well inside a free per-minute limit
const MAX_CLIP_CHARS = 700;
const MIN_CLIP_CHARS = 200;

export const STATUS_MESSAGE: Record<SentenceStatus, string> = {
  sourced: 'Rests on a quote. Check it against the clip.',
  own: 'Rests on your own notes.',
  'ai-based': 'Rests only on an AI summary. Find the paper and clip the passage.',
  unsourced: 'No source. Add a clip or remove the sentence.',
  'bad-quote': 'A quotation here is not word for word in the cited clip.',
  'bad-number': 'A number here is not in the cited clips.',
  copied: 'Copied word for word without quotation marks. Rewrite it or put it in quotes.',
};

export function countClips(input: DraftInput): number {
  return input.parts.reduce((n, p) => n + p.clips.length, 0);
}

export interface DraftPrompt {
  system: string;
  user: string;
  aliasToId: Map<string, string>; // "c1" -> real clip id
}

const SYSTEM = [
  'You help a researcher write one section of a paper from their own clips.',
  'Use ONLY the clips given. Never add facts, numbers, names, methods, dates or sample sizes that are not in them.',
  'If a needed fact is missing, write a placeholder such as [sample size?] instead of guessing.',
  'Write plain, direct sentences in the order of the parts given: one short paragraph per part.',
  'Every sentence must list the clip ids it rests on in "clips". A sentence with no clip behind it must have "clips": [].',
  'Only text marked QUOTE may appear inside quotation marks, and it must be copied word for word.',
  'Text marked AI SUMMARY is a machine summary: do not quote it. Text marked MINE is the researcher\'s own words.',
  'Return JSON only: {"sentences":[{"p":1,"text":"...","clips":["c1"]}]} where p is the part number.',
].join('\n');

export function buildDraftPrompt(input: DraftInput): DraftPrompt {
  const aliasToId = new Map<string, string>();
  const total = countClips(input);
  const perClip = Math.max(MIN_CLIP_CHARS, Math.min(MAX_CLIP_CHARS, Math.floor(PROMPT_CHAR_BUDGET / Math.max(total, 1))));
  let n = 0;
  const label: Record<EvidenceKind, string> = { quote: 'QUOTE', 'ai-summary': 'AI SUMMARY', mine: 'MINE' };
  const blocks = input.parts.map((part, i) => {
    const lines = part.clips.map((clip) => {
      n += 1;
      const alias = `c${n}`;
      aliasToId.set(alias, clip.id);
      const text = clip.text.length > perClip ? `${clip.text.slice(0, perClip)}…` : clip.text;
      return `[${alias}] ${label[clip.kind]}: ${text.replace(/\s+/g, ' ').trim()}`;
    });
    return `PART ${i + 1}: ${part.title}\n${lines.join('\n') || '(no clips)'}`;
  });
  const user = [
    `Section: ${input.sectionTitle}. ${input.sectionHint}`,
    input.point.trim() ? `The researcher's point for this section: ${input.point.trim()}` : '',
    '',
    blocks.join('\n\n'),
  ].filter((l, i) => l !== '' || i === 2).join('\n');
  return { system: SYSTEM, user, aliasToId };
}

const QUOTED = /[“"]([^”"]{12,})[”"]/g;
const COPY_RUN_WORDS = 8;
const NUMBER = /\d+(?:[.,]\d+)?/g;

function words(text: string): string[] {
  return normalizeForMatch(text).split(' ').filter(Boolean);
}

/** Checks one sentence against the clips it names. Pure; also used after the researcher edits a sentence. */
export function classifySentence(text: string, clipIds: string[], clips: Map<string, DraftClip>): SentenceStatus {
  const cited = clipIds.map((id) => clips.get(id)).filter((c): c is DraftClip => !!c);
  if (cited.length === 0) return 'unsourced';

  const quoteTexts = cited.filter((c) => c.kind === 'quote').map((c) => ` ${normalizeForMatch(c.text)} `);
  for (const match of text.matchAll(QUOTED)) {
    const inner = normalizeForMatch(match[1]);
    if (inner.split(' ').length < 4) continue; // a scare-quoted word, not a quotation
    if (!quoteTexts.some((q) => q.includes(` ${inner} `))) return 'bad-quote';
  }

  const haystack = ` ${cited.map((c) => normalizeForMatch(c.text)).join(' ')} `;
  for (const match of text.matchAll(NUMBER)) {
    const token = normalizeForMatch(match[0]);
    if (!haystack.includes(` ${token} `)) return 'bad-number';
  }

  // Words copied from a quote clip, outside quotation marks, in a run of COPY_RUN_WORDS or more.
  const unquoted = words(text.replace(QUOTED, ' '));
  for (const q of quoteTexts) {
    for (let i = 0; i + COPY_RUN_WORDS <= unquoted.length; i++) {
      if (q.includes(` ${unquoted.slice(i, i + COPY_RUN_WORDS).join(' ')} `)) return 'copied';
    }
  }

  if (cited.every((c) => c.kind === 'ai-summary')) return 'ai-based';
  if (cited.some((c) => c.kind === 'quote')) return 'sourced';
  return 'own';
}

export function hasPlaceholder(text: string): boolean {
  return /\[[^\]]*\?\]/.test(text);
}

/**
 * Reads the model's answer. Returns undefined when it is not usable JSON with a sentences list.
 * Unknown clip ids are dropped, never trusted. A part number outside the list leaves the sentence without a part.
 */
export function parseDraftResponse(raw: string, input: DraftInput, aliasToId: Map<string, string>): DraftSentence[] | undefined {
  let data: unknown;
  try {
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    data = JSON.parse(clean);
  } catch {
    return undefined;
  }
  const list = (data as { sentences?: unknown })?.sentences;
  if (!Array.isArray(list)) return undefined;

  const clips = new Map<string, DraftClip>();
  for (const part of input.parts) for (const c of part.clips) clips.set(c.id, c);

  const out: DraftSentence[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const text = typeof (item as { text?: unknown }).text === 'string' ? (item as { text: string }).text.trim() : '';
    if (!text) continue;
    const rawIds = Array.isArray((item as { clips?: unknown }).clips) ? ((item as { clips: unknown[] }).clips) : [];
    const clipIds: string[] = [];
    for (const r of rawIds) {
      const id = typeof r === 'string' ? (aliasToId.get(r.trim().toLowerCase()) ?? (clips.has(r) ? r : undefined)) : undefined;
      if (id && !clipIds.includes(id)) clipIds.push(id);
    }
    const p = Number((item as { p?: unknown }).p);
    const partId = Number.isInteger(p) && p >= 1 && p <= input.parts.length ? input.parts[p - 1].id : undefined;
    out.push({ text, clipIds, partId, status: classifySentence(text, clipIds, clips), placeholder: hasPlaceholder(text) });
  }
  return out;
}

/** Sentences that still need the researcher's attention. */
export function needsAttention(sentence: DraftSentence): boolean {
  return sentence.status !== 'sourced' && sentence.status !== 'own' || sentence.placeholder;
}
