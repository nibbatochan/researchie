// Turns the outline plus the project's clips into the content of the preview page. Pure: no DOM, no AI.
// The preview is for understanding the shape of a paper. It is NOT journal formatting.
// How each clip is shown follows what it is (see src/lib/atoms/evidence.ts):
//   quote with a citation  -> the words in quotation marks, with an in-text marker
//   quote without one      -> the words, flagged "no source"
//   AI summary             -> shown as a note to rewrite; never in quotation marks, never cited
//   mine                   -> plain text, no citation needed

import type { CitationRecord } from '../citations/types';
import { renderCitations, type CitedSource, type InTextStyle, type MarkerPart, type RenderedReference } from '../citations/inText.ts';
import type { EvidenceKind } from '../atoms/evidence.ts';
import type { PaperOutline } from './outline.ts';
import { needsAttention, type SentenceStatus } from './draft.ts';

export interface ClipInfo {
  id: string;
  text: string;
  kind: EvidenceKind;
  record?: CitationRecord;
  page?: string | number;
}

export type PreviewBlock =
  | { kind: 'quote'; clipId: string; text: string; marker: MarkerPart[] }
  | { kind: 'uncited'; clipId: string; text: string }
  | { kind: 'ai'; clipId: string; text: string }
  | { kind: 'own'; clipId: string; text: string }
  // A sentence from an AI draft. Its marker cites only quote clips that carry a reference.
  | { kind: 'sentence'; text: string; status: SentenceStatus; placeholder: boolean; marker: MarkerPart[] };

export interface PreviewPart {
  id: string;
  title: string;
  blocks: PreviewBlock[];
}

export interface PreviewSection {
  id: string;
  key: string;
  title: string;
  point: string;
  parts: PreviewPart[];
  isEmpty: boolean; // nothing written, no parts: shown as a grey placeholder
  isDraft: boolean; // the text is an AI draft, not the researcher's clips
}

export interface PreviewDoc {
  title: string;
  authors: string;
  abstract?: PreviewSection;
  sections: PreviewSection[]; // everything except the abstract, in order
  references: RenderedReference[];
  unsourcedCount: number; // quotes without a citation, AI summaries still to rewrite, and draft sentences that need a look
  hasAiDraft: boolean; // some text came from an AI draft: journals often require saying so
}

export function buildPreview(outline: PaperOutline, clips: Map<string, ClipInfo>, style: InTextStyle): PreviewDoc {
  // One citation group per cited quote (or per draft sentence), in document order, so numbers follow first use.
  const groups: CitedSource[][] = [];
  const keys: string[] = [];
  const citedFor = (ids: string[]): CitedSource[] =>
    ids.flatMap((id) => {
      const clip = clips.get(id);
      return clip && clip.kind === 'quote' && clip.record ? [{ sourceId: clip.id, record: clip.record, page: clip.page }] : [];
    });

  for (const section of outline.sections) {
    if (section.draft) {
      section.draft.sentences.forEach((sentence, i) => {
        const group = citedFor(sentence.clipIds);
        if (group.length > 0) { groups.push(group); keys.push(`${section.id}:s${i}`); }
      });
      continue;
    }
    for (const part of section.parts) {
      for (const id of part.clipIds) {
        const group = citedFor([id]);
        if (group.length > 0) { groups.push(group); keys.push(`${part.id}:${id}`); }
      }
    }
  }
  const rendered = renderCitations(style, groups);
  const markerOf = new Map<string, MarkerPart[]>();
  rendered.markers.forEach((m, i) => { if (!markerOf.has(keys[i])) markerOf.set(keys[i], m); });

  let unsourcedCount = 0;
  let hasAiDraft = false;
  const sections: PreviewSection[] = outline.sections.map((section) => {
    const base = { id: section.id, key: section.key, title: section.title, point: section.point.trim() };

    if (section.draft) {
      hasAiDraft = true;
      const byPart = new Map<string, PreviewBlock[]>();
      section.draft.sentences.forEach((sentence, i) => {
        const blocks = byPart.get(sentence.partId ?? '') ?? [];
        blocks.push({ kind: 'sentence', text: sentence.text, status: sentence.status, placeholder: sentence.placeholder, marker: markerOf.get(`${section.id}:s${i}`) ?? [] });
        byPart.set(sentence.partId ?? '', blocks);
        if (needsAttention(sentence)) unsourcedCount++;
      });
      const parts: PreviewPart[] = [];
      for (const part of section.parts) if (byPart.has(part.id)) parts.push({ id: part.id, title: part.title, blocks: byPart.get(part.id)! });
      if (byPart.has('')) parts.push({ id: '', title: '', blocks: byPart.get('')! });
      return { ...base, parts, isEmpty: false, isDraft: true };
    }

    const parts: PreviewPart[] = section.parts.map((part) => {
      const blocks: PreviewBlock[] = [];
      for (const id of part.clipIds) {
        const clip = clips.get(id);
        if (!clip) continue;
        if (clip.kind === 'mine') blocks.push({ kind: 'own', clipId: id, text: clip.text });
        else if (clip.kind === 'ai-summary') { blocks.push({ kind: 'ai', clipId: id, text: clip.text }); unsourcedCount++; }
        else if (clip.record) blocks.push({ kind: 'quote', clipId: id, text: clip.text, marker: markerOf.get(`${part.id}:${id}`) ?? [] });
        else { blocks.push({ kind: 'uncited', clipId: id, text: clip.text }); unsourcedCount++; }
      }
      return { id: part.id, title: part.title, blocks };
    });
    return { ...base, parts, isEmpty: !base.point && parts.length === 0, isDraft: false };
  });

  return {
    title: (outline.title ?? '').trim(),
    authors: (outline.authors ?? '').trim(),
    abstract: sections.find((s) => s.key === 'abstract'),
    sections: sections.filter((s) => s.key !== 'abstract'),
    references: rendered.references,
    unsourcedCount,
    hasAiDraft,
  };
}
