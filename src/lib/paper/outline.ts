// The paper outline: a template's sections in order, parts inside each section (for example three
// methods), and the clips placed under each part. Pure functions over plain data, no AI, no network.
// The outline stores clip ids only; the clips themselves stay in the project.

import type { SectionDraft, DraftSentence } from './draft.ts';
import { pruneCites } from './authored.ts';

export type PaperTemplateId = 'imrad' | 'review';

export interface OutlinePart {
  id: string;
  title: string;
  clipIds: string[];
}

export interface OutlineSection {
  id: string;
  key: string; // stable template key, for example 'methods'
  title: string;
  hint: string; // one line: what goes here
  point: string; // the researcher's one-sentence point for this section
  text?: string; // the researcher's own text for the section, with [@key] citations; see authored.ts
  cites?: Record<string, string>; // key -> clip id for the citations in text
  aiAssisted?: boolean; // some of text began as an AI draft: shown in the preview notes, since journals often ask
  done?: boolean; // the researcher marked this section finished; only allowed while the checklist passes (checklist.ts)
  draft?: SectionDraft; // AI-written text for this section, every sentence tied to clips; see draft.ts
  parts: OutlinePart[];
}

export interface PaperOutline {
  templateId: PaperTemplateId;
  title?: string; // working title, shown on the preview's first page
  authors?: string; // as the researcher wants them printed, for example "J. Lee, R. Patel"
  sections: OutlineSection[];
}

interface TemplateSection {
  key: string;
  title: string;
  hint: string;
}

export const PAPER_TEMPLATES: Record<PaperTemplateId, { label: string; description: string; sections: TemplateSection[] }> = {
  imrad: {
    label: 'Research article',
    description: 'Introduction, Methods, Results, Discussion. For a study with your own data.',
    sections: [
      { key: 'abstract', title: 'Abstract', hint: 'A short summary of the whole paper. Write it last.' },
      { key: 'introduction', title: 'Introduction', hint: 'The problem, what is already known, and the gap your work fills.' },
      { key: 'methods', title: 'Methods', hint: 'What you did, in enough detail for someone to repeat it.' },
      { key: 'results', title: 'Results', hint: 'What you found. Facts and numbers, no interpretation.' },
      { key: 'discussion', title: 'Discussion', hint: 'What the results mean, how they compare to earlier work, and the limits.' },
      { key: 'conclusion', title: 'Conclusion', hint: 'The main answer to your question and what should happen next.' },
    ],
  },
  review: {
    label: 'Literature review',
    description: 'Summarise and compare existing papers on one topic.',
    sections: [
      { key: 'abstract', title: 'Abstract', hint: 'A short summary of the review. Write it last.' },
      { key: 'introduction', title: 'Introduction', hint: 'The topic, why it matters, and the question the review answers.' },
      { key: 'search', title: 'Search method', hint: 'Where and how you looked for papers, and what you included or left out.' },
      { key: 'findings', title: 'Findings', hint: 'What the papers say, grouped by theme.' },
      { key: 'discussion', title: 'Discussion', hint: 'Where papers agree and disagree, and what is missing.' },
      { key: 'conclusion', title: 'Conclusion', hint: 'What the field knows now and what to study next.' },
    ],
  },
};

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createOutline(templateId: PaperTemplateId): PaperOutline {
  const template = PAPER_TEMPLATES[templateId];
  return {
    templateId,
    sections: template.sections.map((s) => ({ id: newId('sec'), key: s.key, title: s.title, hint: s.hint, point: '', parts: [] })),
  };
}

function mapSection(outline: PaperOutline, sectionId: string, fn: (s: OutlineSection) => OutlineSection): PaperOutline {
  return { ...outline, sections: outline.sections.map((s) => (s.id === sectionId ? fn(s) : s)) };
}

export function setPaperMeta(outline: PaperOutline, meta: { title?: string; authors?: string }): PaperOutline {
  return { ...outline, ...meta };
}

export function setSectionPoint(outline: PaperOutline, sectionId: string, point: string): PaperOutline {
  return mapSection(outline, sectionId, (s) => ({ ...s, point }));
}

export function setSectionDraft(outline: PaperOutline, sectionId: string, draft: SectionDraft | undefined): PaperOutline {
  return mapSection(outline, sectionId, (s) => {
    const next = { ...s };
    if (draft) next.draft = draft;
    else delete next.draft;
    return next;
  });
}

/** Puts a new draft in, keeping the old one as `previous`. With no old draft, there is nothing to keep. */
export function replaceDraft(outline: PaperOutline, sectionId: string, next: SectionDraft): PaperOutline {
  return mapSection(outline, sectionId, (s) => {
    const old = s.draft ? { sentences: s.draft.sentences, generatedAt: s.draft.generatedAt } : undefined;
    return { ...s, done: undefined, draft: { sentences: next.sentences, generatedAt: next.generatedAt, ...(old ? { previous: old } : {}) } };
  });
}

/** Brings back the previous draft. The draft being replaced becomes the new `previous`, so it can be undone. */
export function restorePreviousDraft(outline: PaperOutline, sectionId: string): PaperOutline {
  if (!outline.sections.some((s) => s.id === sectionId && s.draft?.previous)) return outline;
  return mapSection(outline, sectionId, (s) => {
    const prev = s.draft?.previous;
    if (!s.draft || !prev) return s;
    return { ...s, done: undefined, draft: { sentences: prev.sentences, generatedAt: prev.generatedAt, previous: { sentences: s.draft.sentences, generatedAt: s.draft.generatedAt } } };
  });
}

/** Sets the researcher's own text. Keys the text no longer uses are dropped from the map. Empty text removes it. */
export function setSectionAuthored(outline: PaperOutline, sectionId: string, authored: { text: string; cites: Record<string, string>; aiAssisted?: boolean }): PaperOutline {
  return mapSection(outline, sectionId, (s) => {
    const next = { ...s };
    if (authored.text.trim()) {
      next.text = authored.text;
      next.cites = pruneCites(authored.text, authored.cites);
      if (authored.aiAssisted) next.aiAssisted = true;
      else delete next.aiAssisted;
    } else {
      delete next.text;
      delete next.cites;
      delete next.aiAssisted;
    }
    return next;
  });
}

export function setSectionDone(outline: PaperOutline, sectionId: string, done: boolean): PaperOutline {
  return mapSection(outline, sectionId, (s) => {
    const next = { ...s };
    if (done) next.done = true;
    else delete next.done;
    return next;
  });
}

export function addPart(outline: PaperOutline, sectionId: string, title: string): PaperOutline {
  const clean = title.trim();
  if (!clean) return outline;
  return mapSection(outline, sectionId, (s) => ({ ...s, parts: [...s.parts, { id: newId('part'), title: clean, clipIds: [] }] }));
}

export function renamePart(outline: PaperOutline, partId: string, title: string): PaperOutline {
  const clean = title.trim();
  if (!clean) return outline;
  return { ...outline, sections: outline.sections.map((s) => ({ ...s, parts: s.parts.map((p) => (p.id === partId ? { ...p, title: clean } : p)) })) };
}

export function removePart(outline: PaperOutline, partId: string): PaperOutline {
  return { ...outline, sections: outline.sections.map((s) => ({ ...s, parts: s.parts.filter((p) => p.id !== partId) })) };
}

/** Moves a part to a position inside a section (same or another section). Position is clamped. */
export function movePart(outline: PaperOutline, partId: string, toSectionId: string, toIndex: number): PaperOutline {
  let moving: OutlinePart | undefined;
  for (const s of outline.sections) {
    const found = s.parts.find((p) => p.id === partId);
    if (found) moving = found;
  }
  if (!moving || !outline.sections.some((s) => s.id === toSectionId)) return outline;
  const part = moving;
  const without = outline.sections.map((s) => ({ ...s, parts: s.parts.filter((p) => p.id !== partId) }));
  return {
    ...outline,
    sections: without.map((s) => {
      if (s.id !== toSectionId) return s;
      const at = Math.max(0, Math.min(toIndex, s.parts.length));
      return { ...s, parts: [...s.parts.slice(0, at), part, ...s.parts.slice(at)] };
    }),
  };
}

/** Places a clip under a part. A clip is placed at most once per part. */
export function assignClip(outline: PaperOutline, partId: string, clipId: string): PaperOutline {
  return {
    ...outline,
    sections: outline.sections.map((s) => ({
      ...s,
      parts: s.parts.map((p) => (p.id === partId && !p.clipIds.includes(clipId) ? { ...p, clipIds: [...p.clipIds, clipId] } : p)),
    })),
  };
}

export function unassignClip(outline: PaperOutline, partId: string, clipId: string): PaperOutline {
  return {
    ...outline,
    sections: outline.sections.map((s) => ({
      ...s,
      parts: s.parts.map((p) => (p.id === partId ? { ...p, clipIds: p.clipIds.filter((c) => c !== clipId) } : p)),
    })),
  };
}

/** Clip ids placed anywhere in the outline. */
export function placedClipIds(outline: PaperOutline): Set<string> {
  const ids = new Set<string>();
  for (const s of outline.sections) for (const p of s.parts) for (const c of p.clipIds) ids.add(c);
  return ids;
}

/** Drops clip ids that no longer exist in the project (for example after a delete). */
export function pruneMissingClips(outline: PaperOutline, existingIds: Set<string>): PaperOutline {
  let changed = false;
  const sections = outline.sections.map((s) => ({
    ...s,
    parts: s.parts.map((p) => {
      const kept = p.clipIds.filter((c) => existingIds.has(c));
      if (kept.length !== p.clipIds.length) changed = true;
      return kept.length === p.clipIds.length ? p : { ...p, clipIds: kept };
    }),
  }));
  return changed ? { ...outline, sections } : outline;
}

export type SectionStatus = 'empty' | 'framed' | 'has-evidence';

/** empty: nothing yet. framed: a point or parts, but no clips. has-evidence: at least one clip placed. */
export function sectionStatus(section: OutlineSection): SectionStatus {
  if (section.parts.some((p) => p.clipIds.length > 0) || Object.keys(section.cites ?? {}).length > 0) return 'has-evidence';
  if (section.point.trim() || section.parts.length > 0 || section.text?.trim()) return 'framed';
  return 'empty';
}

/** Sections the researcher has marked done. */
export function doneCount(outline: PaperOutline): number {
  return outline.sections.filter((s) => s.done).length;
}

/**
 * What to work on next, so the user always knows: the first section not yet started, or when every
 * section is started, the first one not yet marked done.
 */
export function nextSection(outline: PaperOutline): OutlineSection | undefined {
  return outline.sections.find((s) => !s.done && sectionStatus(s) === 'empty') ?? outline.sections.find((s) => !s.done);
}

function parseDraft(raw: unknown): SectionDraft | undefined {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as SectionDraft).sentences)) return undefined;
  const sentences: DraftSentence[] = [];
  for (const x of (raw as SectionDraft).sentences) {
    if (!x || typeof x.text !== 'string' || !Array.isArray(x.clipIds)) continue;
    sentences.push({
      text: x.text,
      clipIds: x.clipIds.filter((c) => typeof c === 'string'),
      ...(typeof x.partId === 'string' ? { partId: x.partId } : {}),
      status: x.status,
      placeholder: !!x.placeholder,
    });
  }
  const prev = (raw as SectionDraft).previous;
  const previous = prev && Array.isArray(prev.sentences) ? parseDraft({ sentences: prev.sentences, generatedAt: prev.generatedAt }) : undefined;
  return { sentences, generatedAt: String((raw as SectionDraft).generatedAt ?? ''), ...(previous ? { previous: { sentences: previous.sentences, generatedAt: previous.generatedAt } } : {}) };
}

/** Reads a stored outline defensively; returns undefined when it is not usable. */
export function parseOutline(raw: unknown): PaperOutline | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Partial<PaperOutline>;
  if (!o.templateId || !(o.templateId in PAPER_TEMPLATES) || !Array.isArray(o.sections)) return undefined;
  const sections: OutlineSection[] = [];
  for (const s of o.sections) {
    if (!s || typeof s.id !== 'string' || typeof s.title !== 'string' || !Array.isArray(s.parts)) return undefined;
    sections.push({
      id: s.id,
      key: String(s.key ?? ''),
      title: s.title,
      hint: String(s.hint ?? ''),
      point: String(s.point ?? ''),
      ...(parseDraft(s.draft) ? { draft: parseDraft(s.draft) } : {}),
      ...(s.done === true ? { done: true } : {}),
      ...(typeof s.text === 'string' && s.text.trim() ? { text: s.text } : {}),
      ...(s.text && s.cites && typeof s.cites === 'object' && !Array.isArray(s.cites)
        ? { cites: Object.fromEntries(Object.entries(s.cites).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')) }
        : {}),
      ...(s.text && s.aiAssisted === true ? { aiAssisted: true } : {}),
      parts: s.parts
        .filter((p) => p && typeof p.id === 'string')
        .map((p) => ({ id: p.id, title: String(p.title ?? ''), clipIds: Array.isArray(p.clipIds) ? p.clipIds.filter((c) => typeof c === 'string') : [] })),
    });
  }
  return {
    templateId: o.templateId,
    ...(typeof o.title === 'string' ? { title: o.title } : {}),
    ...(typeof o.authors === 'string' ? { authors: o.authors } : {}),
    sections,
  };
}
