// The researcher's own text for a section, with citations typed into it. Pure: no DOM, no AI.
//   Text is plain paragraphs separated by a blank line. LaTeX maths works as in the rest of the preview.
//   A citation is a token with a short key: [@Lee2020] or, for several, [@Lee2020; @Abe2018].
//   The section keeps a map from each key to the clip it stands for (cites), so the text stays readable and a
//   key never changes meaning. Switching Harvard / numbered style re-renders the tokens; the text is untouched.
// What is checked: a token must point at a clip that exists and can be cited; a quotation in quotation marks
// must be word for word in a cited quote clip; words copied from a cited quote must be in quotation marks.
// Sentences that cite nothing are only counted: the researcher's own methods and results need no citation,
// but a background claim does, and the platform can not tell which is which.

import type { CitationRecord } from '../citations/types';
import type { DraftClip, SectionDraft } from './draft.ts';
import { classifySentence } from './draft.ts';
import { stripMath } from './math.ts';
import { splitSentences } from './pasteMatch.ts';
import type { ClipInfo } from './preview.ts';

/** [@key] or [@key1; @key2]. Keys are letters, digits, _, : and -. */
const CITE_RE = /\[@([A-Za-z0-9_:-]+(?:\s*;\s*@[A-Za-z0-9_:-]+)*)\]/g;

export type AuthoredPiece = { type: 'text'; value: string } | { type: 'cite'; keys: string[] };

export function keysOf(inner: string): string[] {
  return inner.split(';').map((k) => k.trim().replace(/^@/, '')).filter(Boolean);
}

/** The text cut into plain pieces and citation tokens, in order. */
export function splitCites(text: string): AuthoredPiece[] {
  const out: AuthoredPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(CITE_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({ type: 'cite', keys: keysOf(m[1]) });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

/** Paragraphs are separated by a blank line. Empty ones are dropped. */
export function paragraphsOf(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
}

// ───────────────────────────── keys ────────────────────────────

/** "Lee2020", or "clip" when the clip has no citation yet. A second "Lee2020" becomes "Lee2020b", then "Lee2020c". */
export function keyFor(info: { record?: CitationRecord }, taken: Set<string>): string {
  const family = (info.record?.authors[0]?.family ?? 'clip').replace(/[^A-Za-z0-9]/g, '') || 'clip';
  const base = `${family}${info.record?.year ?? ''}`;
  if (!taken.has(base)) return base;
  for (let i = 0; i < 26; i++) {
    const key = `${base}${String.fromCharCode(98 + i)}`;
    if (!taken.has(key)) return key;
  }
  return `${base}${taken.size}`;
}

/** The key for a clip: the one it already has in this section, or a new one. Returns the updated map. */
export function addCite(cites: Record<string, string>, clipId: string, info: { record?: CitationRecord }): { key: string; cites: Record<string, string> } {
  const existing = Object.entries(cites).find(([, id]) => id === clipId)?.[0];
  if (existing) return { key: existing, cites };
  const key = keyFor(info, new Set(Object.keys(cites)));
  return { key, cites: { ...cites, [key]: clipId } };
}

/** Drops keys the text no longer uses, so the map does not grow forever. */
export function pruneCites(text: string, cites: Record<string, string>): Record<string, string> {
  const used = new Set(splitCites(text).flatMap((p) => (p.type === 'cite' ? p.keys : [])));
  return Object.fromEntries(Object.entries(cites).filter(([key]) => used.has(key)));
}

// ──────────────────────────── checks ───────────────────────────

export interface AuthoredIssue {
  id: string;
  severity: 'block' | 'warn';
  message: string;
}

export interface AuthoredCheck {
  issues: AuthoredIssue[];
  citedClipIds: string[]; // clips the text cites, so the checklist can look at their retraction state
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function checkAuthored(text: string, cites: Record<string, string>, clips: Map<string, ClipInfo>): AuthoredCheck {
  const count = { badKey: 0, missing: 0, ai: 0, noRecord: 0, badQuote: 0, copied: 0, uncited: 0 };
  const cited = new Set<string>();
  const asDraft = new Map<string, DraftClip>();
  for (const c of clips.values()) asDraft.set(c.id, { id: c.id, kind: c.kind, text: c.text });

  for (const paragraph of paragraphsOf(text)) {
    for (const sentence of splitSentences(paragraph)) {
      const pieces = splitCites(sentence);
      const keys = pieces.flatMap((p) => (p.type === 'cite' ? p.keys : []));
      const plain = pieces.map((p) => (p.type === 'text' ? p.value : ' ')).join('');
      const ids: string[] = [];
      for (const key of keys) {
        const id = cites[key];
        if (!id) { count.badKey++; continue; }
        const clip = clips.get(id);
        if (!clip) { count.missing++; continue; }
        cited.add(id);
        ids.push(id);
        if (clip.kind === 'ai-summary') count.ai++;
        else if (clip.kind === 'quote' && !clip.record) count.noRecord++;
      }
      if (keys.length === 0) {
        if (stripMath(plain).split(/\s+/).filter(Boolean).length >= 6) count.uncited++;
        continue;
      }
      if (ids.length === 0) continue;
      const status = classifySentence(plain, ids, asDraft, [], { numbers: false, math: false, mixed: false });
      if (status === 'bad-quote') count.badQuote++;
      else if (status === 'copied') count.copied++;
    }
  }

  const issues: AuthoredIssue[] = [];
  const block = (id: string, message: string) => issues.push({ id, severity: 'block', message });
  if (count.badKey) block('authored-bad-key', `${plural(count.badKey, 'citation points', 'citations point')} at a key this section does not know. Insert it again from the list.`);
  if (count.missing) block('authored-missing-clip', `${plural(count.missing, 'citation points', 'citations point')} at a clip that was deleted. Remove it or put the clip back.`);
  if (count.ai) block('authored-ai-summary', `${plural(count.ai, 'citation points', 'citations point')} at an AI summary. An AI summary can not be cited: find the passage in the paper and clip it.`);
  if (count.noRecord) block('authored-no-record', `${plural(count.noRecord, 'citation points', 'citations point')} at a clip with no reference details. Attach a citation to the clip first.`);
  if (count.badQuote) block('authored-bad-quote', `${plural(count.badQuote, 'quotation is', 'quotations are')} not word for word in the clip it cites.`);
  if (count.copied) block('authored-copied', `${plural(count.copied, 'sentence copies', 'sentences copy')} words from a cited clip without quotation marks. Put them in quotes or rewrite them.`);
  if (count.uncited) issues.push({ id: 'authored-uncited', severity: 'warn', message: `${plural(count.uncited, 'sentence cites', 'sentences cite')} no source. That is fine for your own methods and results; a claim about earlier work needs one.` });
  return { issues, citedClipIds: [...cited] };
}

// ──────────────────────── from an AI draft ─────────────────────

/**
 * Turns an AI draft into the researcher's own editable text: one paragraph per part, each sentence keeping its
 * citation as a token before the full stop. Sentences that rest only on the researcher's own notes carry no token.
 */
export function draftToText(
  draft: SectionDraft,
  partIds: string[],
  clips: Map<string, ClipInfo>,
  startCites: Record<string, string> = {},
): { text: string; cites: Record<string, string> } {
  let cites = { ...startCites };
  const known = new Set(partIds);
  const groups: Array<DraftSentenceLike[]> = partIds.map((id) => draft.sentences.filter((s) => s.partId === id));
  groups.push(draft.sentences.filter((s) => !s.partId || !known.has(s.partId)));

  const paragraphs = groups
    .filter((g) => g.length > 0)
    .map((g) =>
      g
        .map((s) => {
          const keys: string[] = [];
          for (const id of s.clipIds) {
            const clip = clips.get(id);
            if (!clip || clip.kind !== 'quote' || !clip.record) continue;
            const added = addCite(cites, id, clip);
            cites = added.cites;
            if (!keys.includes(added.key)) keys.push(added.key);
          }
          const text = s.text.trim();
          if (keys.length === 0) return text;
          const token = `[@${keys.join('; @')}]`;
          const m = text.match(/^([\s\S]*?)([.!?]+["”')\]]*)$/);
          return m ? `${m[1]} ${token}${m[2]}` : `${text} ${token}`;
        })
        .join(' '),
    );
  return { text: paragraphs.join('\n\n'), cites };
}

interface DraftSentenceLike {
  text: string;
  clipIds: string[];
  partId?: string;
}
