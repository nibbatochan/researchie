// Draws a ReportModel as a PDF with @react-pdf/renderer.
// No JSX here: Node's type stripping cannot run it, and the tests import this file directly.

import { createElement } from 'react';
import type { ReactElement } from 'react';
import { Document, Page, View, Text, Link, Image } from '@react-pdf/renderer';
import type {
  BibliographyEntry,
  ReportFlag,
  ReportItem,
  ReportModel,
  ReportSection,
  SourceStatus,
} from './types.ts';
import { COLORS, FONTS, PAGE, TYPE } from './theme.ts';
import { normalizeForPdf, splitRuns } from './glyphs.ts';
import type { PrimaryFont } from './glyphs.ts';

// react-pdf's own prop types are strict about styles; this file builds many small styles,
// so the element factory is loosely typed and the model types above carry the real checks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const h = createElement as (type: any, props?: any, ...children: any[]) => ReactElement;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CARD_PAD = 10;
const CARD_INNER_WIDTH = PAGE.width - PAGE.marginX * 2 - 3 - 1 - CARD_PAD * 2 - 2;
const IMAGE_MAX_HEIGHT = 220;

const KIND_LABEL: Record<ReportItem['kind'], string> = {
  note: 'NOTE',
  quote: 'QUOTE',
  block: 'WEB BLOCK',
  image: 'IMAGE',
  link: 'LINK',
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  verified: 'Verified',
  web: 'Web page',
  manual: 'Manual',
  unchecked: 'Not checked',
};

const COLOR_KEY: Array<{ color: string; name: string; meaning: string }> = [
  { color: COLORS.primary, name: 'Primary blue', meaning: 'Section rules and section numbers.' },
  { color: COLORS.link, name: 'Link blue', meaning: 'Anything you can click: links, DOIs and [n] citation markers.' },
  { color: COLORS.ai, name: 'Purple', meaning: 'Written by the AI, not by you or a source.' },
  { color: COLORS.block, name: 'Sky blue', meaning: 'A block copied from a web page.' },
  { color: COLORS.success, name: 'Green', meaning: 'Verified: the DOI was found and checked.' },
  { color: COLORS.warning, name: 'Amber', meaning: 'Retracted, or the source needs another look.' },
  { color: COLORS.error, name: 'Red', meaning: 'The source could not be checked.' },
];

// ---------- small helpers ----------

function isHttp(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function fmtLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Words without spaces (URLs, DOIs) do not wrap in react-pdf, so they run past the margin.
 * Cut any word longer than `max` characters into lines. Only the shown text changes, never a link target.
 */
function breakLong(text: string, max: number): string {
  const long = new RegExp('\\S{' + (max + 1) + ',}', 'g');
  const chunk = new RegExp('.{1,' + max + '}', 'g');
  return text.replace(long, (word) => (word.match(chunk) ?? [word]).join('\n'));
}

const FALLBACK_FAMILY = 'DejaVu Sans';

/** Text as nested runs: characters the primary font lacks are drawn by DejaVu Sans (same size and colour). */
function runs(text: string, primary: PrimaryFont): unknown[] {
  return splitRuns(text, primary).map((r, i) =>
    r.fallback ? h(Text, { key: i, style: { fontFamily: FALLBACK_FAMILY } }, r.text) : r.text,
  );
}

/** Normalise, cut very long words, then split into font runs. Use for every string that comes from the model. */
function rs(text: string, max: number, primary: PrimaryFont): unknown[] {
  return runs(breakLong(normalizeForPdf(text), max), primary);
}

function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => breakLong(normalizeForPdf(p.trim()), 70))
    .filter(Boolean);
}

/** Width and height in pixels of a PNG or JPEG data URL, or null when it cannot be read. */
function imageSize(dataUrl: string): { w: number; h: number } | null {
  try {
    const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl);
    if (!m) return null;
    if (m[1].toLowerCase() === 'png') {
      const b = atob(m[2].slice(0, 44));
      const u32 = (o: number) => (b.charCodeAt(o) * 16777216) + (b.charCodeAt(o + 1) << 16) + (b.charCodeAt(o + 2) << 8) + b.charCodeAt(o + 3);
      const w = u32(16);
      const hh = u32(20);
      return w > 0 && hh > 0 ? { w, h: hh } : null;
    }
    const b = atob(m[2]);
    let i = 2;
    while (i < b.length - 9) {
      if (b.charCodeAt(i) !== 0xff) { i++; continue; }
      const marker = b.charCodeAt(i + 1);
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = (b.charCodeAt(i + 2) << 8) + b.charCodeAt(i + 3);
      if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const hh = (b.charCodeAt(i + 5) << 8) + b.charCodeAt(i + 6);
        const w = (b.charCodeAt(i + 7) << 8) + b.charCodeAt(i + 8);
        return w > 0 && hh > 0 ? { w, h: hh } : null;
      }
      i += 2 + len;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- styles ----------

const S = {
  page: {
    backgroundColor: COLORS.page,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    fontSize: TYPE.body.size,
    lineHeight: TYPE.body.lineHeight / TYPE.body.size,
    paddingTop: PAGE.marginTop,
    paddingBottom: PAGE.marginBottom,
    paddingHorizontal: PAGE.marginX,
  },
  coverPage: {
    backgroundColor: COLORS.page,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    paddingTop: 170,
    paddingBottom: PAGE.marginBottom,
    paddingHorizontal: PAGE.marginX,
  },
  mono: { fontFamily: FONTS.mono },
  caption: { fontSize: TYPE.caption.size, lineHeight: TYPE.caption.lineHeight / TYPE.caption.size },
};

function lh(t: { size: number; lineHeight: number }) {
  return { fontSize: t.size, lineHeight: t.lineHeight / t.size };
}

// ---------- pieces ----------

function Dot(color: string) {
  return h(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 6, marginTop: 3 } });
}

function FlagRow(flag: ReportFlag, key: string | number) {
  const color = flag.kind === 'unchecked' ? COLORS.error : COLORS.warning;
  return h(
    View,
    { key, style: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 3 } },
    Dot(color),
    h(Text, { style: { flex: 1, color: COLORS.ink, ...lh(TYPE.caption) } }, ...rs(flag.text, 80, 'figtree')),
  );
}

function Flags(flags: ReportFlag[]) {
  if (!flags.length) return null;
  return h(View, { style: { marginTop: 6 } }, ...flags.map((f, i) => FlagRow(f, i)));
}

function Tag(label: string, key: string | number, color?: string) {
  const ai = color !== undefined;
  return h(
    View,
    {
      key,
      style: {
        backgroundColor: ai ? COLORS.page : COLORS.chip,
        borderWidth: ai ? 1 : 0,
        borderColor: color,
        borderRadius: 3,
        paddingVertical: 2,
        paddingHorizontal: 5,
        marginRight: 4,
        marginBottom: 4,
      },
    },
    h(Text, { style: { fontFamily: FONTS.mono, fontWeight: 500, color: COLORS.ink, fontSize: 7.5, lineHeight: 1.1 } }, ...rs(label, 24, 'mono')),
  );
}

function ItemImage(item: ReportItem) {
  const url = item.imageUrl;
  if (!url) return null;
  let style: Record<string, unknown>;
  if (url.startsWith('data:')) {
    const size = imageSize(url);
    if (!size) {
      return h(Text, { style: { color: COLORS.muted, ...lh(TYPE.caption), marginTop: 6 } }, '(Image could not be embedded: only PNG and JPEG are supported.)');
    }
    const scale = Math.min(CARD_INNER_WIDTH / size.w, IMAGE_MAX_HEIGHT / size.h);
    style = { width: size.w * scale, height: size.h * scale };
  } else {
    style = { width: CARD_INNER_WIDTH, height: IMAGE_MAX_HEIGHT, objectFit: 'contain', objectPosition: 'left center' };
  }
  return h(
    View,
    { wrap: false, style: { marginTop: 6 } },
    h(Image, { src: url, style: { ...style, borderWidth: 1, borderColor: COLORS.border } }),
  );
}

function SourceLine(item: ReportItem) {
  const parts: unknown[] = [];
  const src = item.source;
  if (src) {
    // The source name links to the exact passage when the clip has one, else to the page.
    const href = isHttp(item.deepLink) ? item.deepLink : src.url;
    if (isHttp(href)) {
      parts.push(h(Link, { key: 'src', src: href, style: { color: COLORS.link, textDecoration: 'none' } }, ...rs(src.label, 70, 'figtree')));
    } else {
      parts.push(h(Text, { key: 'src' }, ...rs(src.label, 70, 'figtree')));
    }
    // Page titles often already end with "(Page N)": do not print the page twice.
    const labelHasPage = !!src.page && new RegExp('\\(\\s*page\\s+' + src.page + '\\s*\\)\\s*$', 'i').test(src.label);
    if (src.page && !labelHasPage) parts.push(h(Text, { key: 'pg', style: { fontFamily: FONTS.mono } }, ` - p. ${src.page}`));
  }
  const date = fmtDate(item.capturedAt);
  if (date) parts.push(h(Text, { key: 'dt', style: { fontFamily: FONTS.mono, color: COLORS.muted } }, `${parts.length ? '   ' : ''}${date}`));
  if (item.citationNumber) {
    parts.push(
      h(
        Link,
        { key: 'cite', src: `#bib-${item.citationNumber}`, style: { fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.link, textDecoration: 'none' } },
        `${parts.length ? '   ' : ''}[${item.citationNumber}]`,
      ),
    );
  }
  if (!parts.length) return null;
  return h(Text, { style: { marginTop: 8, color: COLORS.muted, ...lh(TYPE.caption) } }, ...parts);
}

function Body(item: ReportItem) {
  const paras = paragraphs(item.body);
  if (!paras.length) return null;
  if (item.kind === 'block') {
    return h(
      View,
      { style: { marginTop: 5, backgroundColor: COLORS.page, borderWidth: 1, borderColor: COLORS.border, padding: 6 } },
      ...paras.map((p, i) =>
        h(Text, { key: i, style: { fontFamily: FONTS.mono, fontSize: 8.6, lineHeight: 1.4, marginBottom: i === paras.length - 1 ? 0 : 6 } }, ...runs(p, 'mono')),
      ),
    );
  }
  const t = item.isAi ? TYPE.bodyLG : TYPE.body;
  return h(
    View,
    { style: { marginTop: 5 } },
    ...paras.map((p, i) =>
      h(Text, { key: i, style: { ...lh(t), marginBottom: i === paras.length - 1 ? 0 : 6 } }, ...runs(p, 'figtree')),
    ),
  );
}

function Card(item: ReportItem) {
  const bar = item.isAi ? COLORS.ai : item.kind === 'block' ? COLORS.block : COLORS.border;
  const tags = item.tags.filter(Boolean);
  const ocr = item.ocrText && item.ocrText.trim();
  return h(
    View,
    {
      key: item.id,
      wrap: true,
      style: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 3,
        borderLeftColor: bar,
        padding: CARD_PAD,
        marginBottom: 10,
      },
    },
    // Tag row and title stay together. CardGuard (placed before the card) keeps them with the first body lines.
    h(
      View,
      { wrap: false },
      h(
        View,
        { style: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 } },
        Tag(KIND_LABEL[item.kind], 'kind'),
        item.isAi ? Tag('AI', 'ai', COLORS.ai) : null,
      ),
      h(Text, { style: { fontFamily: FONTS.display, fontWeight: 700, color: COLORS.ink, ...lh(TYPE.headingMD) } }, ...rs(item.title, 38, 'mono')),
    ),
    Body(item),
    item.kind === 'image' ? ItemImage(item) : null,
    ocr
      ? h(
          View,
          { style: { marginTop: 6, backgroundColor: COLORS.chip, padding: 6 } },
          h(Text, { style: { fontFamily: FONTS.mono, fontWeight: 500, color: COLORS.muted, fontSize: 7.5, marginBottom: 2 } }, 'Text read from the image'),
          h(Text, { style: { color: COLORS.muted, ...lh(TYPE.caption) } }, ...rs(ocr, 80, 'figtree')),
        )
      : null,
    SourceLine(item),
    tags.length
      ? h(View, { style: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: -4 } }, ...tags.map((t, i) => Tag(t, i)))
      : null,
    item.notes && item.notes.trim()
      ? h(
          View,
          { style: { marginTop: 8, backgroundColor: COLORS.card, borderTopWidth: 0.75, borderTopColor: COLORS.hairline, paddingTop: 6 } },
          h(Text, { style: { fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.muted, fontSize: 7.5, marginBottom: 2 } }, 'Your notes'),
          h(Text, { style: lh(TYPE.body) }, ...rs(item.notes.trim(), 70, 'figtree')),
        )
      : null,
    Flags(item.flags),
  );
}

/**
 * minPresenceAhead only counts space AFTER an element and is ignored for elements that split across a page,
 * so a zero-height guard placed before a card makes sure its title and first lines start together.
 */
function CardGuard(key: string) {
  return h(View, { key: `guard-${key}`, minPresenceAhead: 85, style: { height: 0 } });
}

function SectionHeading(section: ReportSection, index: number, first: boolean) {
  return h(
    View,
    {
      id: `sec-${section.key}`,
      bookmark: { title: section.title, fit: true },
      break: first,
      minPresenceAhead: 110,
      style: { marginTop: first ? 0 : 18, marginBottom: 10 },
    },
    h(
      View,
      { style: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' } },
      h(
        Text,
        { style: { fontFamily: FONTS.display, fontWeight: 800, color: COLORS.ink, ...lh(TYPE.headingLG) } },
        h(Text, { style: { color: COLORS.primary } }, `${String(index + 1).padStart(2, '0')}  `),
        ...rs(section.title, 30, 'mono'),
      ),
      h(Text, { style: { fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, plural(section.items.length, 'clip', 'clips')),
    ),
    h(View, { style: { height: 1.5, backgroundColor: COLORS.primary, marginTop: 5 } }),
  );
}

function BibEntry(entry: BibliographyEntry) {
  const dot =
    entry.status === 'verified' ? COLORS.success : entry.status === 'unchecked' ? COLORS.error : COLORS.hairline;
  return h(
    View,
    {
      key: entry.number,
      id: `bib-${entry.number}`,
      wrap: false,
      style: { flexDirection: 'row', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.75, borderBottomColor: COLORS.border },
    },
    h(Text, { style: { width: 30, fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.primary, ...lh(TYPE.body) } }, `${entry.number}.`),
    h(
      View,
      { style: { flex: 1 } },
      h(Text, { style: lh(TYPE.body) }, ...rs(entry.text, 70, 'figtree')),
      h(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', marginTop: 4 } },
        h(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginRight: 6 } }),
        h(Text, { style: { fontFamily: FONTS.mono, fontWeight: 500, color: COLORS.ink, ...lh(TYPE.caption) } }, STATUS_LABEL[entry.status]),
      ),
      isHttp(entry.href)
        ? h(Link, { src: entry.href, style: { marginTop: 3, color: COLORS.link, textDecoration: 'none', fontFamily: FONTS.mono, ...lh(TYPE.caption) } }, ...rs(entry.href, 80, 'mono'))
        : null,
      Flags(entry.flags),
    ),
  );
}

function ColourKey() {
  return h(
    View,
    { id: 'sec-colour-key', bookmark: { title: 'How to read this report', fit: true }, wrap: false, style: { marginTop: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 12 } },
    h(Text, { style: { fontFamily: FONTS.display, fontWeight: 700, ...lh(TYPE.headingMD), marginBottom: 6 } }, 'How to read this report'),
    ...COLOR_KEY.map((c) =>
      h(
        View,
        { key: c.name, style: { flexDirection: 'row', alignItems: 'center', marginTop: 4 } },
        h(View, { style: { width: 12, height: 12, backgroundColor: c.color, marginRight: 8, borderRadius: 2 } }),
        h(Text, { style: { width: 78, fontFamily: FONTS.mono, fontWeight: 500, ...lh(TYPE.caption) } }, c.name),
        h(Text, { style: { flex: 1, ...lh(TYPE.caption) } }, c.meaning),
      ),
    ),
    h(Text, { style: { marginTop: 10, color: COLORS.muted, ...lh(TYPE.caption) } }, 'Tip: hold Ctrl (Cmd on a Mac) while you click a link to open it in a new tab.'),
  );
}

function Cover(model: ReportModel) {
  const c = model.cover;
  const meta: Array<[string, string]> = [
    ['Exported', fmtLongDate(c.generatedAt)],
    ['Clips', String(c.clipCount)],
    ['Sources', String(c.sourceCount)],
    ['Citation style', c.styleLabel],
  ];
  return h(
    Page,
    { size: 'A4', style: S.coverPage },
    h(Text, { style: { fontFamily: FONTS.mono, fontWeight: 500, color: COLORS.muted, fontSize: 9, letterSpacing: 2, marginBottom: 14 } }, 'RESEARCH REPORT'),
    h(Text, { style: { fontFamily: FONTS.display, fontWeight: 800, color: COLORS.ink, ...lh(TYPE.displayXL) } }, ...rs(c.title, 24, 'mono')),
    h(View, { style: { width: 96, height: 3, backgroundColor: COLORS.primary, marginTop: 16, marginBottom: 18 } }),
    c.description ? h(Text, { style: { color: COLORS.ink, marginBottom: 28, ...lh(TYPE.bodyLG) } }, ...rs(c.description, 70, 'figtree')) : null,
    h(
      View,
      { style: { marginTop: 8 } },
      ...meta.map(([label, value]) =>
        h(
          View,
          { key: label, style: { flexDirection: 'row', marginBottom: 5 } },
          h(Text, { style: { width: 100, fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, label),
          h(Text, { style: { fontFamily: FONTS.mono, fontWeight: 500, color: COLORS.ink, ...lh(TYPE.caption) } }, value),
        ),
      ),
    ),
  );
}

function Contents(model: ReportModel) {
  const rows: Array<{ id: string; title: string; count?: string; n: string }> = model.sections.map((s, i) => ({
    id: `sec-${s.key}`,
    title: s.title,
    count: plural(s.items.length, 'clip', 'clips'),
    n: String(i + 1).padStart(2, '0'),
  }));
  if (model.bibliography.length) {
    rows.push({ id: 'sec-bibliography', title: 'Bibliography', count: plural(model.bibliography.length, 'source', 'sources'), n: '' });
  }
  return h(
    View,
    { bookmark: { title: 'Contents', fit: true } },
    h(Text, { style: { fontFamily: FONTS.display, fontWeight: 800, ...lh(TYPE.headingLG) } }, 'Contents'),
    h(View, { style: { height: 1.5, backgroundColor: COLORS.primary, marginTop: 5, marginBottom: 12 } }),
    ...rows.map((r) =>
      h(
        Link,
        {
          key: r.id,
          src: `#${r.id}`,
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            borderBottomWidth: 0.75,
            borderBottomColor: COLORS.border,
            textDecoration: 'none',
            color: COLORS.link,
          },
        },
        h(Text, { style: { width: 28, fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.primary, ...lh(TYPE.body) } }, r.n),
        h(Text, { style: { flex: 1, fontFamily: FONTS.display, fontWeight: 500, color: COLORS.link, ...lh(TYPE.bodyLG) } }, ...rs(r.title, 40, 'mono')),
        h(Text, { style: { fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, r.count),
      ),
    ),
    h(Text, { style: { marginTop: 10, color: COLORS.muted, ...lh(TYPE.caption) } }, 'Tip: hold Ctrl (Cmd on a Mac) while you click a link to open it in a new tab.'),
  );
}

function Running(model: ReportModel) {
  return [
    h(
      View,
      {
        key: 'header',
        fixed: true,
        style: {
          position: 'absolute',
          top: 28,
          left: PAGE.marginX,
          right: PAGE.marginX,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingBottom: 5,
          borderBottomWidth: 0.75,
          borderBottomColor: COLORS.border,
        },
      },
      h(Text, { style: { flex: 1, marginRight: 12, fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, ...rs(clip(model.cover.title, 64), 64, 'mono')),
      h(Text, { style: { fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, 'Research report'),
    ),
    h(
      View,
      {
        key: 'footer',
        fixed: true,
        style: {
          position: 'absolute',
          top: PAGE.height - 40,
          left: PAGE.marginX,
          right: PAGE.marginX,
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
      },
      h(Text, { style: { fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, 'Researchie'),
      h(Text, {
        style: { fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) },
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`,
      }),
    ),
  ];
}

export function createReportDocument(model: ReportModel): ReactElement {
  const sections = model.sections.filter((s) => s.items.length > 0);
  const hasBib = model.bibliography.length > 0;
  const main: unknown[] = [Contents({ ...model, sections })];
  sections.forEach((section, i) => {
    main.push(SectionHeading(section, i, i === 0));
    section.items.forEach((item) => main.push(CardGuard(item.id), Card(item)));
  });
  if (hasBib) {
    main.push(
      h(
        View,
        {
          key: 'bib-heading',
          id: 'sec-bibliography',
          bookmark: { title: 'Bibliography', fit: true },
          break: true,
          minPresenceAhead: 90,
          style: { marginBottom: 12 },
        },
        h(
          View,
          { style: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' } },
          h(Text, { style: { fontFamily: FONTS.display, fontWeight: 800, ...lh(TYPE.headingLG) } }, 'Bibliography'),
          h(Text, { style: { fontFamily: FONTS.mono, color: COLORS.muted, ...lh(TYPE.caption) } }, `${plural(model.bibliography.length, 'source', 'sources')}, ${model.cover.styleLabel}`),
        ),
        h(View, { style: { height: 1.5, backgroundColor: COLORS.primary, marginTop: 5 } }),
      ),
      ...model.bibliography.map((e) => BibEntry(e)),
    );
  }
  main.push(ColourKey());

  return h(
    Document,
    {
      title: model.cover.title,
      author: 'Researchie',
      creator: 'Researchie',
      producer: 'Researchie',
      subject: 'Research report',
      language: 'en',
    },
    Cover(model),
    h(Page, { size: 'A4', style: S.page }, ...Running(model), ...main),
  );
}
