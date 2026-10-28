// The paper editor's document model (S-150, docs/PAPER_EDITOR_DESIGN.md sections 2 and 3). Pure: no DOM, no editor.
// A paper is two JSON values: `doc` (the body, ProseMirror JSON) and `meta` (everything that is not body text).
// This file builds them from a template, brings old ones up to date, measures them, and reads citations out of them.
// The body stores clip ids and citation KEYS, never clip text or image data. Switching citation style re-renders
// markers from the cite map; the document is untouched.

import type { CitationRecord } from '../citations/types';
import type { CitedSource } from '../citations/inText.ts';
import type { PaperTemplate } from './templates.ts';
import type { ClipInfo } from './preview.ts';
import { addCite } from './authored.ts';
import type { ParsedTable } from './tableParse.ts';

// ─────────────────────────────── types ───────────────────────────────

export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface PaperDoc {
  v: 1;
  pm: PmNode;
}

export interface Author {
  id: string;
  name: string;
  affiliationIds: string[];
  orcid: string;
  email: string;
  corresponding: boolean;
}

export interface Affiliation {
  id: string;
  name: string;
  city: string;
  country: string;
}

export type Abstract = { text: string } | { parts: Array<{ label: string; text: string }> };

export interface Statements {
  funding: string;
  competingInterests: string;
  dataAvailability: string;
  ethics: string;
  acknowledgements: string;
  aiUse: string;
}

export interface HeaderFooter {
  left: string;
  center: string;
  right: string;
}

export type HideKey = 'title' | 'authors' | 'affiliations' | 'abstract' | 'keywords' | 'statements' | 'references' | 'header' | 'footer';

export const HIDE_LABELS: Record<HideKey, string> = {
  title: 'Title',
  authors: 'Authors',
  affiliations: 'Affiliations',
  abstract: 'Abstract',
  keywords: 'Keywords',
  statements: 'End-matter statements',
  references: 'Reference list',
  header: 'Header',
  footer: 'Footer',
};

export interface PaperMeta {
  v: 1;
  venue: string;
  wordLimit: number | null;
  front: {
    title: string;
    shortTitle: string;
    authors: Author[];
    affiliations: Affiliation[];
    abstract: Abstract;
    keywords: string[];
    statements: Statements;
  };
  page: {
    size: 'a4' | 'letter';
    header: HeaderFooter;
    footer: HeaderFooter;
    differentFirstPage: boolean;
    /** Different odd and even pages (Word): when on, even displayed numbers use headerEven / footerEven. */
    oddEven: boolean;
    headerEven: HeaderFooter;
    footerEven: HeaderFooter;
    /** Body columns. One column is the submission look; two is a printed journal. */
    columns: 1 | 2;
    /** Page margins: narrow 0.5 in, normal 1 in, wide 1.25 in. */
    margin: 'narrow' | 'normal' | 'wide';
    /** A margin set from the ruler, in px at 96 dpi. It wins over `margin` when set; null uses the preset. */
    marginPx: number | null;
    /** Typeface of the whole paper. */
    font: 'sans' | 'serif';
    /** The number the first page shows (Start numbering at). */
    startAt: number;
  };
  /** Blocks of the page structure the person has taken away. Nothing is deleted from the data, only not drawn. */
  hide: Partial<Record<HideKey, boolean>>;
  /** citation key -> clip id, or "manual:<id>" for an entry typed in by hand */
  cites: Record<string, string>;
  manualRefs: Array<{ id: string; record: CitationRecord }>;
  /** Clip ids on the References list without being cited in the text (added from the Citations tab). */
  listed: string[];
  importedFrom?: { projectId: string; at: string };
}

// ───────────────────────────── building ──────────────────────────────

const FRONT_ONLY = new Set(['Abstract', 'Keywords', 'References']);

const ABSTRACT_PARTS: Record<string, string[]> = {
  'case-report': ['Introduction', 'Case presentation', 'Conclusion'],
};
const DEFAULT_ABSTRACT_PARTS = ['Background', 'Methods', 'Results', 'Conclusions'];

export const slug = (title: string): string => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';

export type IdMaker = () => string;
const randomId: IdMaker = () => Math.random().toString(36).slice(2, 10);

const emptyParagraph = (): PmNode => ({ type: 'paragraph' });

/** The first document of a paper made from a template. Abstract, Keywords and References are not in the body. */
export function templateToDoc(template: PaperTemplate, makeId: IdMaker = randomId): PaperDoc {
  if (template.sections.length === 0) {
    return { v: 1, pm: { type: 'doc', content: [section('custom', 'Introduction', false, [emptyParagraph()], makeId)] } };
  }
  const sections: PmNode[] = [];
  let current: { title: string; blocks: PmNode[] } | null = null;
  const flush = () => {
    if (!current) return;
    if (current.blocks.length === 0) current.blocks.push(emptyParagraph());
    sections.push(section(slug(current.title), current.title, true, current.blocks, makeId));
    current = null;
  };
  for (const s of template.sections) {
    if (s.level === 1) {
      flush();
      if (FRONT_ONLY.has(s.title)) continue;
      current = { title: s.title, blocks: [] };
    } else if (current) {
      current.blocks.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: s.title }] }, emptyParagraph());
    }
  }
  flush();
  return { v: 1, pm: { type: 'doc', content: sections } };
}

function section(key: string, title: string, locked: boolean, blocks: PmNode[], makeId: IdMaker): PmNode {
  const id = makeId();
  return {
    type: 'section',
    // `locked` is kept in the data for old papers but nothing reads it: every section can be changed or deleted.
    attrs: { id, key: locked ? key : `custom-${id}`, locked: false, point: '', done: false, aiAssisted: false },
    content: [{ type: 'sectionHeading', content: [{ type: 'text', text: title }] }, ...blocks],
  };
}

/** Left and right swapped: the mirror layout Word uses for even pages. */
const mirror = (hf: HeaderFooter): HeaderFooter => ({ left: hf.right, center: hf.center, right: hf.left });

export const EMPTY_STATEMENTS: Statements = { funding: '', competingInterests: '', dataAvailability: '', ethics: '', acknowledgements: '', aiUse: '' };

/** The starting meta for a new paper. `title` is the printed title; the wizard's venue and word limit carry over. */
export function defaultMeta(template: PaperTemplate, title: string, wizard: { venue?: string; wordLimit?: number | null } = {}): PaperMeta {
  const parts = ABSTRACT_PARTS[template.id] ?? DEFAULT_ABSTRACT_PARTS;
  const conference = template.id === 'conference';
  return {
    v: 1,
    venue: wizard.venue ?? '',
    wordLimit: wizard.wordLimit ?? null,
    front: {
      title,
      shortTitle: '',
      authors: [],
      affiliations: [],
      abstract: template.abstract === 'structured' ? { parts: parts.map((label) => ({ label, text: '' })) } : { text: '' },
      keywords: [],
      statements: { ...EMPTY_STATEMENTS },
    },
    page: {
      size: 'a4',
      header: conference ? { left: '', center: '', right: '' } : { left: '{shortTitle}', center: '', right: '{page}' },
      footer: conference ? { left: '', center: '{page}', right: '' } : { left: '', center: '', right: '' },
      headerEven: mirror(conference ? { left: '', center: '', right: '' } : { left: '{shortTitle}', center: '', right: '{page}' }),
      footerEven: mirror(conference ? { left: '', center: '{page}', right: '' } : { left: '', center: '', right: '' }),
      oddEven: false,
      differentFirstPage: conference,
      columns: conference ? 2 : 1,
      margin: 'normal',
      marginPx: null,
      font: 'sans',
      startAt: 1,
    },
    hide: {},
    cites: {},
    manualRefs: [],
    listed: [],
  };
}

// ─────────────────────────── loading old rows ────────────────────────

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** A stored `doc` brought up to the current version. A paper with no document yet (made before the editor) gets one built from its template. */
export function upgradeDoc(raw: unknown, template: PaperTemplate, makeId?: IdMaker): PaperDoc {
  if (isObject(raw) && raw.v === 1 && isObject(raw.pm) && raw.pm.type === 'doc' && Array.isArray(raw.pm.content)) return raw as unknown as PaperDoc;
  return templateToDoc(template, makeId);
}

/** A stored `meta` brought up to the current version. Anything missing takes its default; what the wizard stored is kept. */
export function upgradeMeta(raw: unknown, template: PaperTemplate, title: string): PaperMeta {
  const base = defaultMeta(template, title);
  if (!isObject(raw)) return base;
  const r = raw as Partial<PaperMeta> & Record<string, unknown>;
  const front = isObject(r.front) ? (r.front as Partial<PaperMeta['front']>) : {};
  const page = isObject(r.page) ? (r.page as Partial<PaperMeta['page']>) : {};
  return {
    ...base,
    venue: typeof r.venue === 'string' ? r.venue : base.venue,
    wordLimit: typeof r.wordLimit === 'number' ? r.wordLimit : base.wordLimit,
    front: {
      ...base.front,
      ...front,
      statements: { ...base.front.statements, ...(isObject(front.statements) ? front.statements : {}) },
    },
    page: {
      ...base.page,
      ...page,
      header: { ...base.page.header, ...(isObject(page.header) ? page.header : {}) },
      footer: { ...base.page.footer, ...(isObject(page.footer) ? page.footer : {}) },
      headerEven: { ...base.page.headerEven, ...(isObject(page.headerEven) ? page.headerEven : {}) },
      footerEven: { ...base.page.footerEven, ...(isObject(page.footerEven) ? page.footerEven : {}) },
      oddEven: typeof page.oddEven === 'boolean' ? page.oddEven : base.page.oddEven,
    },
    hide: isObject(r.hide) ? (r.hide as PaperMeta['hide']) : {},
    cites: isObject(r.cites) ? (r.cites as Record<string, string>) : {},
    manualRefs: Array.isArray(r.manualRefs) ? (r.manualRefs as PaperMeta['manualRefs']) : [],
    listed: Array.isArray(r.listed) ? (r.listed as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    importedFrom: isObject(r.importedFrom) ? (r.importedFrom as PaperMeta['importedFrom']) : undefined,
  };
}

// ───────────────────────────── measuring ─────────────────────────────

/** Bytes the paper takes when saved (doc and meta together), for the 2 MB limit in src/lib/data/papers.ts. */
export function docBytes(doc: unknown, meta: unknown): number {
  return new TextEncoder().encode(JSON.stringify({ d: doc ?? null, m: meta ?? null })).length;
}

function textOf(node: PmNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'inlineMath') return ' ';
  return (node.content ?? []).map((c) => textOf(c)).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ');
}

/** Words in the body that count against a journal's limit: section text, not headings or sub-headings, the Unplaced bin, abstract or references. */
export function wordCount(pm: PmNode): number {
  let n = 0;
  for (const s of pm.content ?? []) {
    if (s.type !== 'section') continue;
    for (const block of s.content ?? []) {
      if (block.type === 'sectionHeading' || block.type === 'heading' || block.type === 'clipNote') continue;
      n += textOf(block).split(/\s+/).filter(Boolean).length;
    }
  }
  return n;
}

// ───────────────────────────── citations ─────────────────────────────

/** One thing in the body that carries a source, in document order. The Unplaced bin is skipped. */
export interface Citable {
  type: 'citation' | 'quote' | 'figure' | 'tableFigure';
  attrs: Record<string, unknown>;
}

export function citableNodes(pm: PmNode): Citable[] {
  const out: Citable[] = [];
  const walk = (node: PmNode) => {
    if (node.type === 'citation' || node.type === 'quote' || node.type === 'figure' || node.type === 'tableFigure') {
      out.push({ type: node.type, attrs: node.attrs ?? {} });
    }
    for (const c of node.content ?? []) walk(c);
  };
  for (const s of pm.content ?? []) if (s.type === 'section') walk(s);
  return out;
}

export interface CiteSources {
  clips: Map<string, ClipInfo>;
  manual: Array<{ id: string; record: CitationRecord }>;
}

/** The source a map value points at: a clip id, or "manual:<id>". Null when it can not be cited (gone, or no record). */
function sourceFor(target: string | undefined, cites: CiteSources): CitedSource | null {
  if (!target) return null;
  if (target.startsWith('manual:')) {
    const entry = cites.manual.find((m) => `manual:${m.id}` === target);
    return entry ? { sourceId: target, record: entry.record } : null;
  }
  const clip = cites.clips.get(target);
  return clip?.record ? { sourceId: clip.id, record: clip.record, page: clip.page } : null;
}

/**
 * One group per citable node, in document order, for renderCitations (src/lib/citations/inText.ts).
 * A node whose sources can not be found still gets its (empty) group, so groups line up with citableNodes().
 */
export function collectCitations(pm: PmNode, cites: Record<string, string>, sources: CiteSources): CitedSource[][] {
  return citableNodes(pm).map((node) => {
    if (node.type === 'citation') {
      const keys = Array.isArray(node.attrs.keys) ? (node.attrs.keys as string[]) : [];
      const group: CitedSource[] = [];
      for (const key of keys) {
        const source = sourceFor(cites[key], sources);
        if (!source) continue;
        const locator = typeof node.attrs.locator === 'string' && node.attrs.locator ? node.attrs.locator : undefined;
        group.push(locator && keys.length === 1 ? { ...source, page: locator } : source);
      }
      return group;
    }
    const clipId = typeof node.attrs.clipId === 'string' ? node.attrs.clipId : '';
    const source = sourceFor(clipId, sources);
    if (!source) return [];
    return [node.type === 'quote' && node.attrs.page ? { ...source, page: String(node.attrs.page) } : source];
  });
}

/** Drops cite-map entries no citation node uses, so the map does not grow forever. Run on save, not per keystroke. */
export function pruneCiteMap(pm: PmNode, cites: Record<string, string>): Record<string, string> {
  const used = new Set<string>();
  for (const node of citableNodes(pm)) {
    if (node.type === 'citation' && Array.isArray(node.attrs.keys)) for (const k of node.attrs.keys as string[]) used.add(k);
    // a quote, figure or table has no key of its own in the text, so keep the key that points at its clip
    const clipId = node.attrs.clipId;
    if (typeof clipId === 'string') for (const [k, id] of Object.entries(cites)) if (id === clipId) used.add(k);
  }
  return Object.fromEntries(Object.entries(cites).filter(([key]) => used.has(key)));
}

// ──────────────────────── the old checks, on new text ────────────────

const keyOfClip = (cites: Record<string, string>, clipId: unknown) => Object.entries(cites).find(([, id]) => id === clipId)?.[0];

function inlineText(node: PmNode, cites: Record<string, string>): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'citation') {
    const keys = Array.isArray(node.attrs?.keys) ? (node.attrs!.keys as string[]) : [];
    return keys.length ? `[@${keys.join('; @')}]` : '';
  }
  if (node.type === 'inlineMath') return `$${String(node.attrs?.latex ?? '')}$`;
  return (node.content ?? []).map((c) => inlineText(c, cites)).join('');
}

/**
 * A section written the way authored.ts expects: paragraphs separated by a blank line, each citation as `[@key]`,
 * each quote as `"words" [@key]`. checkAuthored() then runs on it unchanged (design note section 3.4).
 */
export function sectionToAuthored(sectionNode: PmNode, cites: Record<string, string>): string {
  const paragraphs: string[] = [];
  for (const block of sectionNode.content ?? []) {
    if (block.type === 'paragraph') {
      const t = inlineText(block, cites).trim();
      if (t) paragraphs.push(t);
    } else if (block.type === 'quote') {
      const key = keyOfClip(cites, block.attrs?.clipId);
      const words = inlineText(block, cites).trim();
      if (words) paragraphs.push(key ? `"${words}" [@${key}]` : `"${words}"`);
    } else if (block.type === 'bulletList' || block.type === 'orderedList') {
      for (const li of block.content ?? []) {
        const t = inlineText(li, cites).trim();
        if (t) paragraphs.push(t);
      }
    }
  }
  return paragraphs.join('\n\n');
}

/** The sections of a body, in order (the Unplaced bin is not one). */
export function sectionsOf(pm: PmNode): PmNode[] {
  return (pm.content ?? []).filter((n) => n.type === 'section');
}

/** Adds a clip to the cite map (reusing authored.ts's key rules) and returns its key. */
export function citeClip(cites: Record<string, string>, clip: { id: string; record?: CitationRecord }): { key: string; cites: Record<string, string> } {
  return addCite(cites, clip.id, clip);
}

// ─────────────────────── what a clip becomes when placed ──────────────────────

const textNode = (text: string): PmNode => ({ type: 'text', text });
const paragraph = (text: string): PmNode => (text ? { type: 'paragraph', content: [textNode(text)] } : { type: 'paragraph' });

function tableNodes(table: ParsedTable): PmNode {
  const cell = (type: 'tableHeader' | 'tableCell', text: string): PmNode => ({ type, content: [paragraph(text)] });
  const width = Math.max(table.header.length, ...table.rows.map((r) => r.length), 1);
  const pad = (row: string[]) => Array.from({ length: width }, (_, i) => row[i] ?? '');
  const rows: PmNode[] = [];
  if (table.header.length) rows.push({ type: 'tableRow', content: pad(table.header).map((t) => cell('tableHeader', t)) });
  for (const r of table.rows) rows.push({ type: 'tableRow', content: pad(r).map((t) => cell('tableCell', t)) });
  return { type: 'table', content: rows.length ? rows : [{ type: 'tableRow', content: [cell('tableCell', '')] }] };
}

export interface Placed {
  nodes: PmNode[];
  cites: Record<string, string>;
}

/**
 * The nodes a clip becomes when it is placed in the paper, and the cite map with its key added when it has a
 * reference (design note section 4.4). A quote becomes a `quote` node, an AI summary a `clipNote` (never cited),
 * the researcher's own note plain paragraphs, an image a `figure`, a table clip an editable table with its source.
 */
export function clipToNodes(clip: ClipInfo, cites: Record<string, string>): Placed {
  const withKey = (): Record<string, string> => (clip.record ? addCite(cites, clip.id, clip).cites : cites);
  if (clip.media?.kind === 'image') {
    return { nodes: [{ type: 'figure', attrs: { clipId: clip.id, caption: clip.media.caption, alt: clip.media.caption } }], cites: withKey() };
  }
  if (clip.media?.kind === 'table') {
    return { nodes: [{ type: 'tableFigure', attrs: { clipId: clip.id, caption: clip.media.caption }, content: [tableNodes(clip.media.table)] }], cites: withKey() };
  }
  if (clip.kind === 'ai-summary') return { nodes: [{ type: 'clipNote', attrs: { clipId: clip.id } }], cites };
  const text = clip.text.trim();
  if (clip.kind === 'mine') {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    return { nodes: paragraphs.length ? paragraphs.map(paragraph) : [paragraph('')], cites };
  }
  const oneLine = text.replace(/\s*\n\s*/g, ' ');
  return { nodes: [{ type: 'quote', attrs: { clipId: clip.id, page: clip.page != null ? String(clip.page) : null }, content: oneLine ? [textNode(oneLine)] : undefined }], cites: withKey() };
}

/** A citation to a source in the paper's text: `[@key]` as a node, with the cite map gaining the key. */
export function citationNode(clip: { id: string; record?: CitationRecord }, cites: Record<string, string>): { node: PmNode; cites: Record<string, string> } {
  const added = addCite(cites, clip.id, clip);
  return { node: { type: 'citation', attrs: { keys: [added.key], locator: null } }, cites: added.cites };
}

/** Ids of the clips the body uses: placed as a quote, figure, table or note, or cited through a key. The Unplaced bin does not count. */
export function usedClipIds(pm: PmNode, cites: Record<string, string>): Set<string> {
  const used = new Set<string>();
  const walk = (node: PmNode) => {
    const clipId = node.attrs?.clipId;
    if (typeof clipId === 'string' && clipId) used.add(clipId);
    if (node.type === 'citation' && Array.isArray(node.attrs?.keys)) for (const k of node.attrs!.keys as string[]) if (cites[k]) used.add(cites[k]);
    for (const c of node.content ?? []) walk(c);
  };
  for (const sec of pm.content ?? []) if (sec.type === 'section') walk(sec);
  return used;
}
