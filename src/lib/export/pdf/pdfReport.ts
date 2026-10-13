// Turns a project and its clips into a ReportModel for the PDF export.
// Pure: no network, no React, no DOM. The drawing half lives in ReportDocument.ts.

import type { ResearchAtom } from '../../types/research';
import type { CitationRecord } from '../../citations/types.ts';
import type {
  BibliographyEntry,
  ReportFlag,
  ReportItem,
  ReportModel,
  ReportOptions,
  ReportSection,
  ReportSectionKey,
  ReportDocumentInfo,
  SourceStatus,
} from './types.ts';
import { REPORT_STYLE_LABELS } from './types.ts';
import { citationText } from '../../citations/client.ts';
import { isCitationRecord } from '../../citations/metadata.ts';
import { isUsablePdfTitle } from '../../citations/pdf.ts';
import { readConfidence, RETRACTED_MESSAGE, normalizeTitle } from '../../citations/verify.ts';

const SECTION_DEFS: { key: ReportSectionKey; title: string; types: string[]; kind: ReportItem['kind'] }[] = [
  { key: 'syntheses', title: 'Syntheses & Notes', types: ['note'], kind: 'note' },
  { key: 'quotes', title: 'Quotes & Key Excerpts', types: ['quote', 'text'], kind: 'quote' },
  { key: 'blocks', title: 'Captured Web Blocks & Tables', types: ['block'], kind: 'block' },
  { key: 'images', title: 'Visual Captures & Images', types: ['image'], kind: 'image' },
  { key: 'links', title: 'Bookmarks & Links', types: ['link'], kind: 'link' },
];

const AI_TAGS = ['ai-generated', 'doc-assistant', 'synthesis', 'ai-synthesis', 'ai'];

/** Markdown to plain text: no heading marks, emphasis, code ticks or link syntax. */
export function stripMarkdown(md: string): string {
  if (!md) return '';
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (let line of lines) {
    if (/^\s*(```|~~~)/.test(line)) continue; // code fence lines
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push(''); continue; } // horizontal rule
    line = line.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/\s+#+\s*$/, '');
    line = line.replace(/^\s*>+\s?/, '');
    const list = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (list) line = `• ${list[1]}`;
    line = line
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/\*(?=\S)([^*]+?)\*/g, '$1')
      .replace(/(^|[^\w])_(?=\S)([^_]+?)_(?=[^\w]|$)/g, '$1$2')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`+([^`]*)`+/g, '$1');
    out.push(line.replace(/[ \t]+$/g, ''));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function buildDeepLink(sourceUrl: string, fragment: string, explicit: string): string | undefined {
  if (explicit) return explicit;
  if (!isHttp(sourceUrl) || !fragment) return undefined;
  const base = sourceUrl.split('#')[0];
  return base + (fragment.startsWith('#') ? fragment : `#${fragment}`);
}

function statusOf(record: CitationRecord): SourceStatus {
  switch (record.status) {
    case 'verified_doi':
    case 'verified_pmid':
      return 'verified';
    case 'page_tags':
      return 'web';
    case 'manual':
      return 'manual';
    case 'unreachable':
      return 'unchecked';
    case 'incomplete':
      return ['crossref', 'datacite', 'pubmed'].includes(record.resolvedFrom) ? 'verified' : 'manual';
    default:
      return 'manual';
  }
}

function flagsOf(record: CitationRecord): ReportFlag[] {
  const flags: ReportFlag[] = [];
  if (record.retracted === true) flags.push({ kind: 'retracted', text: RETRACTED_MESSAGE });
  let warnings: string[] = [];
  try {
    warnings = readConfidence(record).warnings.filter((w) => typeof w === 'string' && w);
  } catch {
    warnings = [];
  }
  if (warnings.length > 0) {
    flags.push({ kind: 'verify', text: `This might not be the source. Please verify. ${warnings[0]}` });
  }
  if (record.status === 'unreachable') flags.push({ kind: 'unchecked', text: 'The source could not be checked.' });
  return flags;
}

function dedupeKey(record: CitationRecord, fallback: string): string {
  if (record.doi) return `doi:${record.doi.trim().toLowerCase()}`;
  if (record.pmid) return `pmid:${String(record.pmid).trim()}`;
  if (record.url) return `url:${record.url.trim()}`;
  const title = record.title ? normalizeTitle(record.title) : '';
  return title ? `title:${title}` : `item:${fallback}`;
}

const PAGE_SUFFIX = /\s*\(\s*page\s+\d+\s*\)\s*$/i;

/** The id of the uploaded document a clip came from, when it came from one. */
function documentIdOf(meta: Record<string, unknown>, sourceUrl: string): string {
  const fromMeta = str(meta.documentId) || str(meta.docId) || str(meta.pdfDocId);
  if (fromMeta) return fromMeta;
  const match = sourceUrl.match(/[?&]doc=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/** A reader can recognise this: "Lee and Park (2020), J Pets". Never a file name. */
export function shortCitation(record: CitationRecord): string {
  const names = (record.authors ?? []).map((a) => a.family).filter(Boolean);
  let who = '';
  if (names.length === 1) who = names[0];
  else if (names.length === 2) who = `${names[0]} and ${names[1]}`;
  else if (names.length > 2) who = `${names[0]} et al.`;
  const year = record.year ? ` (${record.year})` : '';
  const journal = record.journalAbbrev ?? record.journal;
  if (who) return `${who}${year}${journal ? `, ${journal}` : ''}`;
  const title = record.title ?? '';
  if (!title) return '';
  return (title.length > 70 ? `${title.slice(0, 67)}...` : title) + year;
}

function buildItem(
  atom: ResearchAtom,
  kind: ReportItem['kind'],
  options: ReportOptions,
  docs: Map<string, ReportDocumentInfo>,
): { item: ReportItem; record?: CitationRecord } {
  const content = atom.content ?? {};
  const meta = atom.metadata ?? ({} as ResearchAtom['metadata']);
  const sourceUrl = str(meta.sourceUrl);

  let body = '';
  let fallbackTitle = '';
  switch (kind) {
    case 'note':
      body = stripMarkdown(str(content.markdownContent) || str(content.description) || str(content.rawText));
      fallbackTitle = 'Research Note';
      break;
    case 'quote':
      body = str(content.rawText) || str(content.text) || str(content.description);
      fallbackTitle = 'Quote';
      break;
    case 'block':
      body = str(content.rawText);
      fallbackTitle = 'Captured Block';
      break;
    case 'image':
      body = str(content.description);
      fallbackTitle = 'Captured Image';
      break;
    case 'link':
      body = str(content.description) || str(content.targetUrl);
      fallbackTitle = str(content.targetUrl) || sourceUrl || 'Link';
      break;
  }

  const tags = Array.isArray(atom.tags) ? atom.tags.filter((t) => typeof t === 'string') : [];
  const isAi = tags.some((t) => AI_TAGS.includes(t.toLowerCase()));

  // A clip's citation is its own, or else the one saved on the uploaded document it came from.
  const docId = documentIdOf(meta as unknown as Record<string, unknown>, sourceUrl);
  const doc = docId ? docs.get(docId) : undefined;
  const ownCitation = isCitationRecord(meta.citation) ? meta.citation : undefined;
  const docCitation = isCitationRecord(doc?.citation) ? (doc?.citation as CitationRecord) : undefined;
  const record = ownCitation ?? docCitation;

  let label = str(meta.pageTitle) || str(meta.siteName) || str(meta.documentName) || hostOf(sourceUrl);
  let sourceHref = isHttp(sourceUrl) ? sourceUrl : undefined;
  const fromUploadedFile =
    !isHttp(sourceUrl) && (!!docId || sourceUrl.startsWith('/reader') || ['pdf', 'epub', 'markdown'].includes(str(meta.documentType)));
  if (fromUploadedFile) {
    // The app's own file title ("journal.pone.0355849 (Page 1)") means nothing to a reader. Use the paper's
    // citation when there is one, else a real title, else say what it is. Link to the paper by its DOI.
    const cleaned = (str(meta.pageTitle) || str(doc?.title)).replace(PAGE_SUFFIX, '').trim();
    const kindLabel = /\.pdf$/i.test(str(meta.documentName) || str(doc?.filename)) || str(meta.documentType) === 'pdf' ? 'Uploaded PDF' : 'Uploaded document';
    label = (record && shortCitation(record)) || (isUsablePdfTitle(cleaned) ? cleaned : kindLabel);
    sourceHref = record?.doi ? `https://doi.org/${record.doi}` : record?.url && isHttp(record.url) ? record.url : undefined;
  }
  const page = meta.pageNumber ?? meta.page;
  const item: ReportItem = {
    id: atom.id,
    kind,
    title: str(atom.title) || fallbackTitle,
    body,
    isAi,
    tags,
    flags: [],
  };
  if (label) {
    item.source = { label };
    if (sourceHref) item.source.url = sourceHref;
    if (typeof page === 'number') item.source.page = page;
  }
  const capturedAt = atom.capturedAt ?? atom.created_at;
  if (capturedAt) item.capturedAt = capturedAt;
  const notes = str(atom.userNotes ?? atom.user_notes);
  if (options.includeNotes && notes.trim()) item.notes = notes;
  if (options.includeImages && content.imageUrl) item.imageUrl = content.imageUrl;
  if (content.ocrText) item.ocrText = content.ocrText;
  const deepLink = buildDeepLink(sourceUrl, str(meta.scrollToTextFragment) || str(meta.textFragment), str(meta.deepLink));
  if (deepLink) item.deepLink = deepLink;
  return { item, record };
}

export function buildReportModel(
  project: { title: string; description?: string },
  atoms: ResearchAtom[],
  options: ReportOptions,
  documents: ReportDocumentInfo[] = [],
): ReportModel {
  const list = Array.isArray(atoms) ? atoms.filter((a) => a && typeof a === 'object') : [];
  const sections: ReportSection[] = [];
  const recordOf = new Map<string, CitationRecord>();
  const docs = new Map<string, ReportDocumentInfo>();
  for (const d of Array.isArray(documents) ? documents : []) if (d && d.id) docs.set(d.id, d);

  for (const def of SECTION_DEFS) {
    if (!options.sections?.[def.key]) continue;
    const items: ReportItem[] = [];
    for (const atom of list) {
      if (!def.types.includes(atom.type)) continue;
      const { item, record } = buildItem(atom, def.kind, options, docs);
      if (record) recordOf.set(item.id, record);
      items.push(item);
    }
    if (items.length > 0) sections.push({ key: def.key, title: def.title, items });
  }

  const bibliography: BibliographyEntry[] = [];
  if (options.sections?.bibliography) {
    const byKey = new Map<string, BibliographyEntry>();
    for (const section of sections) {
      for (const item of section.items) {
        const record = recordOf.get(item.id);
        if (!record) continue;
        const key = dedupeKey(record, item.id);
        let entry = byKey.get(key);
        if (!entry) {
          let text = '';
          try {
            text = citationText(record, options.citationStyle);
          } catch {
            text = record.title ?? '';
          }
          const href = record.doi
            ? `https://doi.org/${record.doi}`
            : record.url && isHttp(record.url)
              ? record.url
              : undefined;
          entry = {
            number: bibliography.length + 1,
            text,
            status: statusOf(record),
            flags: options.includeFlags ? flagsOf(record) : [],
            citedBy: [],
          };
          if (href) entry.href = href;
          byKey.set(key, entry);
          bibliography.push(entry);
        }
        entry.citedBy.push(item.id);
        item.citationNumber = entry.number;
        item.flags = entry.flags.map((f) => ({ ...f }));
      }
    }
  } else if (options.includeFlags) {
    // Bibliography off: items still show their flags, but get no citation number.
    for (const section of sections) {
      for (const item of section.items) {
        const record = recordOf.get(item.id);
        if (record) item.flags = flagsOf(record);
      }
    }
  }

  const clipCount = sections.reduce((n, s) => n + s.items.length, 0);
  return {
    cover: {
      title: project?.title ?? '',
      description: project?.description ?? '',
      generatedAt: options.generatedAt,
      clipCount,
      sourceCount: bibliography.length,
      styleLabel: REPORT_STYLE_LABELS[options.citationStyle],
    },
    sections,
    bibliography,
    options,
  };
}
