// Turns the outline plus the project's clips into the content of the preview page. Pure: no DOM, no AI.
// The preview is for understanding the shape of a paper. It is NOT journal formatting.
// How each clip is shown follows what it is (see src/lib/atoms/evidence.ts):
//   quote with a citation  -> the words in quotation marks, with an in-text marker
//   quote without one      -> the words, flagged "no source"
//   AI summary             -> shown as a note to rewrite; never in quotation marks, never cited
//   mine                   -> plain text, no citation needed
//   image clip             -> a figure with a caption, numbered "Figure 1." in order of appearance
//   table clip             -> a table with a caption, numbered "Table 1."
//   the researcher's own text (section.text) -> paragraphs with [@key] citations drawn as in-text markers; it replaces
//                                               the AI draft and the loose clips of the section when there is some
// The researcher's own text (notes, draft sentences, a section's point) may hold LaTeX maths ($x^2$, $$...$$);
// display equations are numbered (1), (2)... in order of appearance. See math.ts.

import type { CitationRecord } from '../citations/types';
import { renderCitations, type CitedSource, type InTextStyle, type MarkerPart, type RenderedReference } from '../citations/inText.ts';
import type { EvidenceKind } from '../atoms/evidence.ts';
import type { OutlineSection, PaperOutline } from './outline.ts';
import { needsAttention, type SentenceStatus } from './draft.ts';
import { splitMath, type MathSegment } from './math.ts';
import { paragraphsOf, splitCites } from './authored.ts';
import type { ParsedTable } from './tableParse.ts';

export type ClipMedia =
  | { kind: 'image'; src: string; caption: string }
  | { kind: 'table'; table: ParsedTable; caption: string };

export interface ClipInfo {
  id: string;
  text: string;
  kind: EvidenceKind;
  record?: CitationRecord;
  webFallback?: boolean; // the record is a web page built from the clip's address, not a checked citation: numbered, but not listed on the Citations tab
  page?: string | number;
  retractionState?: string; // metadata.health.retraction.state when a source-health check has run
  media?: ClipMedia; // set for an image clip or a clip that holds a table
  sourceIds?: string[]; // a note written in Researchie AI: the clips it cites
}

/** A piece of text: plain, or LaTeX maths. A display equation carries its number. */
export type PreviewSegment = (MathSegment & { number?: number }) | { type: 'cite'; marker: MarkerPart[] };

export type PreviewBlock =
  | { kind: 'quote'; clipId: string; text: string; marker: MarkerPart[] }
  | { kind: 'uncited'; clipId: string; text: string }
  | { kind: 'ai'; clipId: string; text: string }
  | { kind: 'own'; clipId: string; text: string; segments: PreviewSegment[] }
  // A sentence from an AI draft. Its marker cites only quote clips that carry a reference.
  | { kind: 'authored'; segments: PreviewSegment[] }
  | { kind: 'sentence'; text: string; segments: PreviewSegment[]; status: SentenceStatus; placeholder: boolean; marker: MarkerPart[] }
  // A figure or table. "source" is the in-text citation of where it comes from; noSource flags a third-party one with none.
  | { kind: 'figure'; clipId: string; src: string; caption: string; number: number; marker: MarkerPart[]; noSource: boolean }
  | { kind: 'table'; clipId: string; table: ParsedTable; caption: string; number: number; marker: MarkerPart[]; noSource: boolean };

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
  pointSegments: PreviewSegment[];
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
  unsourcedCount: number; // quotes without a citation, AI summaries still to rewrite, draft sentences that need a look, figures with no source
  hasAiDraft: boolean; // some text came from an AI draft: journals often require saying so
}

type Item = { t: 'sentence'; index: number } | { t: 'clip'; id: string } | { t: 'paragraph'; index: number };
interface PartItems {
  partId: string; // '' for draft sentences that belong to no part
  title: string;
  items: Item[];
}

/** What each part shows, in the order the preview draws it, so numbering and citations follow the text. */
function partItems(section: OutlineSection, clips: Map<string, ClipInfo>): PartItems[] {
  if (section.text?.trim()) {
    // The researcher's own text, then the figures and tables placed in any part.
    return [{
      partId: '',
      title: '',
      items: [
        ...paragraphsOf(section.text).map((_, index) => ({ t: 'paragraph' as const, index })),
        ...section.parts.flatMap((p) => p.clipIds).filter((id) => clips.get(id)?.media).map((id) => ({ t: 'clip' as const, id })),
      ],
    }];
  }
  if (!section.draft) {
    return section.parts.map((p) => ({ partId: p.id, title: p.title, items: p.clipIds.map((id) => ({ t: 'clip' as const, id })) }));
  }
  const known = new Set(section.parts.map((p) => p.id));
  const sentences = section.draft.sentences;
  const out: PartItems[] = section.parts.map((p) => ({
    partId: p.id,
    title: p.title,
    items: [
      ...sentences.flatMap((s, index) => (s.partId === p.id ? [{ t: 'sentence' as const, index }] : [])),
      // Figures and tables placed under the part come after its text.
      ...p.clipIds.filter((id) => clips.get(id)?.media).map((id) => ({ t: 'clip' as const, id })),
    ],
  }));
  const loose = sentences.flatMap((s, index) => (!s.partId || !known.has(s.partId) ? [{ t: 'sentence' as const, index }] : []));
  if (loose.length > 0) out.push({ partId: '', title: '', items: loose });
  return out.filter((p) => p.items.length > 0);
}

export function buildPreview(outline: PaperOutline, clips: Map<string, ClipInfo>, style: InTextStyle): PreviewDoc {
  const citedFor = (ids: string[]): CitedSource[] =>
    ids.flatMap((id) => {
      const clip = clips.get(id);
      return clip && clip.kind === 'quote' && clip.record ? [{ sourceId: clip.id, record: clip.record, page: clip.page }] : [];
    });

  // Pass 1: one citation group per cited quote, figure, table or draft sentence, in drawing order.
  const groups: CitedSource[][] = [];
  const keys: string[] = [];
  for (const section of outline.sections) {
    for (const part of partItems(section, clips)) {
      for (const item of part.items) {
        if (item.t === 'paragraph') {
          // One group per citation token, in reading order. A page number is shown only after a direct quotation.
          let tail = '';
          paragraphsOf(section.text!)[item.index] && splitCites(paragraphsOf(section.text!)[item.index]).forEach((piece, n) => {
            if (piece.type === 'text') { tail += piece.value; return; }
            const sentenceSoFar = tail.split(/[.!?]\s/).pop() ?? '';
            const quoted = /["“”]/.test(sentenceSoFar);
            const group = piece.keys.flatMap((key) => {
              const clip = clips.get(section.cites?.[key] ?? '');
              return clip && clip.kind === 'quote' && clip.record ? [{ sourceId: clip.id, record: clip.record, page: quoted ? clip.page : undefined }] : [];
            });
            if (group.length > 0) { groups.push(group); keys.push(`${section.id}:p${item.index}:c${n}`); }
            tail += ' ';
          });
          continue;
        }
        const ids = item.t === 'sentence' ? section.draft!.sentences[item.index].clipIds : [item.id];
        const group = citedFor(ids);
        if (group.length > 0) {
          groups.push(group);
          keys.push(item.t === 'sentence' ? `${section.id}:s${item.index}` : `${part.partId}:${item.id}`);
        }
      }
    }
  }
  const rendered = renderCitations(style, groups);
  const markerOf = new Map<string, MarkerPart[]>();
  rendered.markers.forEach((m, i) => { if (!markerOf.has(keys[i])) markerOf.set(keys[i], m); });

  // Pass 2: the blocks, numbering figures, tables and display equations as they appear.
  let unsourcedCount = 0;
  let hasAiDraft = false;
  let figureNo = 0;
  let tableNo = 0;
  let equationNo = 0;
  const segmentsOf = (text: string): PreviewSegment[] => splitMath(text).map((s) => (s.type === 'display' ? { ...s, number: ++equationNo } : s));

  const sections: PreviewSection[] = outline.sections.map((section) => {
    const point = section.point.trim();
    const base = { id: section.id, key: section.key, title: section.title, point, pointSegments: point ? segmentsOf(point) : [] };
    if (section.text?.trim() ? section.aiAssisted : section.draft) hasAiDraft = true;

    const parts: PreviewPart[] = partItems(section, clips).map((part) => {
      const blocks: PreviewBlock[] = [];
      for (const item of part.items) {
        if (item.t === 'paragraph') {
          const segments: PreviewSegment[] = [];
          let dropSpace = false; // a citation that draws nothing must not leave a double space behind
          splitCites(paragraphsOf(section.text!)[item.index]).forEach((piece, n) => {
            if (piece.type === 'text') {
              segments.push(...segmentsOf(dropSpace ? piece.value.replace(/^ /, '') : piece.value));
              dropSpace = false;
              return;
            }
            const resolved = piece.keys.map((key) => clips.get(section.cites?.[key] ?? ''));
            const unresolved = resolved.some((c) => !c || (c.kind !== 'mine' && !(c.kind === 'quote' && c.record)));
            const marker = markerOf.get(`${section.id}:p${item.index}:c${n}`) ?? [];
            if (unresolved) {
              unsourcedCount++;
              segments.push({ type: 'cite', marker: [...marker, { text: marker.length > 0 ? ' ' : '' }, { text: '(source?)' }] });
            } else if (marker.length > 0) segments.push({ type: 'cite', marker });
            else {
              const last = segments[segments.length - 1];
              dropSpace = !!last && last.type === 'text' && last.value.endsWith(' ');
            }
          });
          blocks.push({ kind: 'authored', segments });
          continue;
        }
        if (item.t !== 'clip') {
          const sentence = section.draft!.sentences[item.index];
          blocks.push({ kind: 'sentence', text: sentence.text, segments: segmentsOf(sentence.text), status: sentence.status, placeholder: sentence.placeholder, marker: markerOf.get(`${section.id}:s${item.index}`) ?? [] });
          if (needsAttention(sentence)) unsourcedCount++;
          continue;
        }
        const clip = clips.get(item.id);
        if (!clip) continue;
        const marker = markerOf.get(`${part.partId}:${item.id}`) ?? [];
        if (clip.media) {
          const noSource = clip.kind !== 'mine' && !clip.record;
          if (noSource) unsourcedCount++;
          if (clip.media.kind === 'image') blocks.push({ kind: 'figure', clipId: clip.id, src: clip.media.src, caption: clip.media.caption, number: ++figureNo, marker, noSource });
          else blocks.push({ kind: 'table', clipId: clip.id, table: clip.media.table, caption: clip.media.caption, number: ++tableNo, marker, noSource });
        } else if (clip.kind === 'mine') blocks.push({ kind: 'own', clipId: clip.id, text: clip.text, segments: segmentsOf(clip.text) });
        else if (clip.kind === 'ai-summary') { blocks.push({ kind: 'ai', clipId: clip.id, text: clip.text }); unsourcedCount++; }
        else if (clip.record) blocks.push({ kind: 'quote', clipId: clip.id, text: clip.text, marker });
        else { blocks.push({ kind: 'uncited', clipId: clip.id, text: clip.text }); unsourcedCount++; }
      }
      return { id: part.partId, title: part.title, blocks };
    });
    return { ...base, parts, isEmpty: !section.draft && !section.text?.trim() && !point && parts.length === 0, isDraft: !!section.draft && !section.text?.trim() };
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
