// Word (.docx) export of a paper. Pure: no DOM, no editor. Writes one WordprocessingML package inside a zip that looks like the
// editor's edit view (docs/research/paper-docx-layout.md): page size and margins, Arial 10 pt, real Word styles (Title, Heading 1-5
// with outline levels, Caption, Reference), real numbering for lists, three-line tables, header and footer with page fields and
// optional two columns. paperToDocx() takes the editor document and the rendered citations, so in-text markers and the reference
// list come out in the paper's chosen style. markdownToDocx() takes Markdown, the body of a paper when `meta` is passed too.
// Not carried over: figure images and display maths (written as text), per-paragraph alignment, spacing and indent, odd and even
// headers, automatic hyphenation.

import JSZip from 'jszip';
import type { PaperMeta, PmNode } from './docModel.ts';
import { paperToMarkdown } from './markdown.ts';
import { pageGeometry } from './paginate.ts';
import { resolveTokens } from './headerTokens.ts';
import type { Markers } from './markers.ts';

// Control characters (other than tab, newline, carriage return) are not allowed in XML; Word refuses the whole file.
const esc = (s: string) => s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NS_DOC = `${NS} xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"`;
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml';

const PAGE_TW = { a4: { w: 11906, h: 16838 }, letter: { w: 12240, h: 15840 } };
const COL_GAP = 475; // 0.33 in
const BODY_FONT = { sans: 'Arial', serif: 'Georgia' };
const px = (n: number) => Math.round(n * 15); // 96 dpi to twips

// ── runs and paragraphs ──

interface Fmt {
  b?: boolean;
  i?: boolean;
  font?: string;
  sz?: number; // half-points
  va?: 'superscript' | 'subscript';
}

// children in the order the schema wants: rFonts, b, i, sz, vertAlign
const rpr = (f: Fmt) =>
  `${f.font ? `<w:rFonts w:ascii="${f.font}" w:hAnsi="${f.font}"/>` : ''}${f.b ? '<w:b/>' : ''}${f.i ? '<w:i/>' : ''}${f.sz ? `<w:sz w:val="${f.sz}"/>` : ''}${f.va ? `<w:vertAlign w:val="${f.va}"/>` : ''}`;

const run = (text: string, f: Fmt = {}) => {
  const p = rpr(f);
  return `<w:r>${p ? `<w:rPr>${p}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
};

/** **bold**, *italic*, <sup> and <sub> spans become formatted runs; the rest is plain text. */
function runs(text: string, base: Fmt = {}): string {
  const out: string[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|<sup>([^<]*)<\/sup>|<sub>([^<]*)<\/sub>/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(run(text.slice(last, m.index), base));
    if (m[1] !== undefined) out.push(run(m[1], { ...base, b: true }));
    else if (m[2] !== undefined) out.push(run(m[2], { ...base, i: true }));
    else if (m[3] !== undefined) out.push(run(m[3], { ...base, va: 'superscript' }));
    else out.push(run(m[4], { ...base, va: 'subscript' }));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(run(text.slice(last), base));
  return out.join('');
}

interface POpts {
  style?: string;
  num?: { id: number; lvl: number };
  tabs?: string;
  before?: number;
  after?: number;
  line?: number;
  jc?: 'left' | 'center' | 'right' | 'both';
  keepNext?: boolean;
}

// pPr children in schema order: pStyle, keepNext, numPr, tabs, spacing, jc
function para(inner: string, o: POpts = {}): string {
  const spacing = o.before !== undefined || o.after !== undefined || o.line !== undefined
    ? `<w:spacing${o.before !== undefined ? ` w:before="${o.before}"` : ''}${o.after !== undefined ? ` w:after="${o.after}"` : ''}${o.line !== undefined ? ` w:line="${o.line}" w:lineRule="auto"` : ''}/>`
    : '';
  const p = `${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}${o.keepNext ? '<w:keepNext/>' : ''}${o.num ? `<w:numPr><w:ilvl w:val="${o.num.lvl}"/><w:numId w:val="${o.num.id}"/></w:numPr>` : ''}${o.tabs ?? ''}${spacing}${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}`;
  return `<w:p>${p ? `<w:pPr>${p}</w:pPr>` : ''}${inner}</w:p>`;
}

// Markdown # count to style: # Title, ## Heading 1, ### Heading 2 ... (the editor writes section headings as ##)
const HEADING_STYLE = ['Title', 'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5'];

// ── tables ──

const cells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

/** A pipe table in the editor's three-line style: a rule above and below the header row and a thin rule under each row. */
function table(lines: string[], textW: number): string {
  const rows = lines.map(cells).filter((r, i) => !(i === 1 && r.every((c) => /^:?-{3,}:?$/.test(c))));
  const width = Math.max(1, ...rows.map((r) => r.length));
  const col = Math.floor(textW / width);
  const line = (edge: string, sz: number) => `<w:${edge} w:val="single" w:sz="${sz}" w:space="0" w:color="000000"/>`;
  const none = (edge: string) => `<w:${edge} w:val="nil"/>`;
  const borders = `${line('top', 6)}${none('left')}${line('bottom', 6)}${none('right')}${line('insideH', 4)}${none('insideV')}`;
  const body = rows.map((r, i) => {
    const tcPr = `<w:tcW w:w="${col}" w:type="dxa"/>${i === 0 ? `<w:tcBorders>${line('bottom', 6)}</w:tcBorders>` : ''}`;
    const tcs = Array.from({ length: width }, (_, c) => `<w:tc><w:tcPr>${tcPr}</w:tcPr>${para(runs(r[c] ?? '', i === 0 ? { b: true } : {}), { style: 'TableText' })}</w:tc>`).join('');
    return `<w:tr>${tcs}</w:tr>`;
  });
  const grid = Array.from({ length: width }, () => `<w:gridCol w:w="${col}"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${col * width}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body.join('')}</w:tbl>`;
}

// ── body ──

interface Built {
  body: string;
  ordered: number; // how many numbered lists there are; each restarts at 1
}

const BULLET_NUM = 1;
const TABLE_CAPTION = /^\*(Table: .*)\*$/;
const spacer = () => para('', { before: 0, after: 0, line: 200 }).replace('w:lineRule="auto"', 'w:lineRule="exact"');

function build(markdown: string, textW: number): Built {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let ordered = 0;
  let currentOrdered = 0; // numId of the numbered list the previous line belongs to; 0 outside a list
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      currentOrdered = 0;
      continue;
    }
    const isItem = /^-\s|^\d+\.\s/.test(t);
    if (!isItem) currentOrdered = 0;
    if (t === '---') {
      out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    } else if (t === '$$') {
      const math: string[] = [];
      for (i++; i < lines.length && lines[i].trim() !== '$$'; i++) math.push(lines[i]);
      out.push(para(run(math.join('\n'), { font: 'Consolas' })));
    } else if (t.startsWith('|')) {
      const block: string[] = [];
      for (; i < lines.length && lines[i].trim().startsWith('|'); i++) block.push(lines[i].trim());
      i--;
      out.push(table(block, textW));
      // the caption sits right under the table; otherwise a small gap does
      let n = i + 1;
      while (n < lines.length && !lines[n].trim()) n++;
      if (!(n < lines.length && TABLE_CAPTION.test(lines[n].trim()))) out.push(spacer());
    } else if (/^#{1,6} /.test(t)) {
      const level = t.match(/^#+/)![0].length;
      out.push(para(runs(t.replace(/^#+ /, '')), { style: level === 2 && /^abstract$/i.test(t.slice(3).trim()) ? 'AbstractHeading' : HEADING_STYLE[level - 1] }));
    } else if (isItem) {
      const depth = Math.min(3, Math.floor((line.length - line.trimStart().length) / 2));
      const isBullet = t.startsWith('-');
      if (!isBullet && !currentOrdered) currentOrdered = 2 + ordered++;
      if (isBullet && depth === 0) currentOrdered = 0;
      out.push(para(runs(t.replace(/^(-|\d+\.)\s+/, '')), { num: { id: isBullet ? BULLET_NUM : currentOrdered, lvl: depth } }));
    } else if (t.startsWith('> ')) {
      out.push(para(runs(t.slice(2))));
    } else if (/^!\[.*\]\(clip:/.test(t)) {
      const caption = t.replace(/^!\[(.*?)\]\(clip:.*$/, '$1').trim();
      out.push(para(run(caption ? `[Figure: ${caption}]` : '[Figure]'), { style: 'Caption', jc: 'center' }));
    } else if (TABLE_CAPTION.test(t)) {
      out.push(para(run(t.match(TABLE_CAPTION)![1]), { style: 'Caption' }));
    } else {
      out.push(para(runs(t)));
    }
  }
  return { body: out.join(''), ordered };
}

/** Turns the Markdown into the document body (no sectPr). Unknown lines become plain paragraphs. */
export function markdownBody(markdown: string, textW = PAGE_TW.a4.w - 2 * px(96)): string {
  return build(markdown, textW).body;
}

// ── page layout ──

interface Layout {
  w: number;
  h: number;
  margin: number;
  textW: number;
  columns: 1 | 2;
  font: string;
  startAt: number;
  inset: number; // header and footer distance from the page edge
}

function layoutOf(meta?: PaperMeta): Layout {
  const page = meta?.page;
  const size = page?.size === 'letter' ? 'letter' : 'a4';
  const margin = px(pageGeometry(size, page?.margin ?? 'normal', page?.marginPx ?? null).top);
  const { w, h } = PAGE_TW[size];
  return { w, h, margin, textW: w - 2 * margin, columns: page?.columns === 2 ? 2 : 1, font: BODY_FONT[page?.font === 'serif' ? 'serif' : 'sans'], startAt: page?.startAt ?? 1, inset: px(Math.round(pageGeometry(size, page?.margin ?? 'normal', page?.marginPx ?? null).top * 0.4)) };
}

const field = (code: string) => `<w:fldSimple w:instr=" ${code} "><w:r><w:t>1</w:t></w:r></w:fldSimple>`;

/** A header or footer part: left, centre and right text on tab stops, with {page} and {pages} as fields. */
function zonePart(root: 'hdr' | 'ftr', style: 'Header' | 'Footer', zone: { left: string; center: string; right: string }, meta: PaperMeta | undefined, textW: number): string {
  const seg = (text: string) =>
    text.split(/(\{pages?\})/).filter(Boolean).map((s) => (s === '{page}' ? field('PAGE') : s === '{pages}' ? field('NUMPAGES') : run(meta ? resolveTokens(s, meta, 1, 1) : s))).join('');
  const tabs = `<w:tabs><w:tab w:val="center" w:pos="${Math.round(textW / 2)}"/><w:tab w:val="right" w:pos="${textW}"/></w:tabs>`;
  const p = para(`${seg(zone.left)}<w:r><w:tab/></w:r>${seg(zone.center)}<w:r><w:tab/></w:r>${seg(zone.right)}`, { style, tabs });
  return `${XML}<w:${root} ${NS}>${p}</w:${root}>`;
}

interface Hf {
  header: boolean;
  footer: boolean;
  titlePg: boolean;
}

function sectPr(L: Layout, o: { cols: 1 | 2; first: boolean; hf: Hf }): string {
  const refs = `${o.hf.header ? `<w:headerReference w:type="default" r:id="rIdHeader"/>` : ''}${o.hf.footer ? `<w:footerReference w:type="default" r:id="rIdFooter"/>` : ''}`;
  return `<w:sectPr>${refs}${o.first ? '' : '<w:type w:val="continuous"/>'}<w:pgSz w:w="${L.w}" w:h="${L.h}"/><w:pgMar w:top="${L.margin}" w:right="${L.margin}" w:bottom="${L.margin}" w:left="${L.margin}" w:header="${L.inset}" w:footer="${L.inset}" w:gutter="0"/>${o.first && L.startAt !== 1 ? `<w:pgNumType w:start="${L.startAt}"/>` : ''}<w:cols w:num="${o.cols}" w:space="${COL_GAP}"/>${o.first && o.hf.titlePg ? '<w:titlePg/>' : ''}</w:sectPr>`;
}

/** Puts a section's properties in its last paragraph, which is where Word reads a section break from. */
function closeSection(blocks: string[], sect: string): string[] {
  const out = blocks.slice();
  const last = out[out.length - 1];
  if (last?.startsWith('<w:p><w:pPr>')) out[out.length - 1] = last.replace('</w:pPr>', `${sect}</w:pPr>`);
  else if (last?.startsWith('<w:p>')) out[out.length - 1] = last.replace('<w:p>', `<w:p><w:pPr>${sect}</w:pPr>`);
  else out.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${sect}</w:pPr></w:p>`);
  return out;
}

// ── front and end matter, from the paper's meta ──

type Block = (after?: number) => string;
const lastWithAfter = (items: Block[], after: number): string[] => items.map((b, i) => b(i === items.length - 1 ? after : undefined));

function frontBlocks(meta: PaperMeta): string[] {
  const { front } = meta;
  const hide = meta.hide ?? {};
  const items: Block[] = [];
  if (!hide.title) items.push((after) => para(run(front.title.trim() || 'Untitled paper'), { style: 'Title', after }));
  if (!hide.authors && front.authors.length > 0) {
    const affIndex = (id: string) => front.affiliations.findIndex((a) => a.id === id) + 1;
    const names = front.authors.map((a, i) => {
      const sup = a.affiliationIds.map(affIndex).filter(Boolean).join(',');
      return `${i > 0 ? run(', ') : ''}${run(a.name || 'Author')}${sup ? run(sup, { va: 'superscript' }) : ''}${a.corresponding ? run('*', { va: 'superscript' }) : ''}`;
    });
    items.push((after) => para(names.join(''), { style: 'Authors', after }));
  }
  if (!hide.affiliations) {
    front.affiliations.forEach((a, i) =>
      items.push((after) => para(run(String(i + 1), { va: 'superscript' }) + run(` ${[a.name, a.city, a.country].filter(Boolean).join(', ')}`), { style: 'Affiliation', after })),
    );
  }
  if (!hide.authors) {
    const emails = front.authors.filter((a) => a.corresponding && a.email).map((a) => a.email);
    if (emails.length) items.push((after) => para(run(`* ${emails.join(', ')}`), { style: 'Affiliation', after }));
  }
  const out = lastWithAfter(items, 480); // the editor leaves 24 pt under the title block

  const abs = front.abstract;
  const parts = 'parts' in abs ? abs.parts.filter((p) => p.text.trim()).map((p) => ({ label: p.label.trim().replace(/\.$/, ''), text: p.text.trim() })) : abs.text.trim() ? [{ label: '', text: abs.text.trim() }] : [];
  const keywords = front.keywords.map((k) => k.trim()).filter(Boolean);
  const abstract: Block[] = [];
  if (!hide.abstract && parts.length) {
    abstract.push((after) => para(run('Abstract'), { style: 'AbstractHeading', after }));
    for (const p of parts) abstract.push((after) => para((p.label ? run(`${p.label}. `, { b: true }) : '') + run(p.text), { after: after ?? 60 }));
  }
  if (!hide.keywords && keywords.length) abstract.push((after) => para(run('Keywords: ', { b: true }) + run(keywords.join(', ')), { before: 120, after }));
  out.push(...lastWithAfter(abstract, 360));
  return out;
}

const STATEMENTS: Array<[keyof PaperMeta['front']['statements'], string]> = [
  ['acknowledgements', 'Acknowledgements'],
  ['funding', 'Funding'],
  ['competingInterests', 'Competing interests'],
  ['dataAvailability', 'Data availability'],
  ['ethics', 'Ethics'],
  ['aiUse', 'Use of AI tools'],
];

function endBlocks(meta: PaperMeta, references: Array<{ label: string; text: string }>): string[] {
  const hide = meta.hide ?? {};
  const out: string[] = [];
  if (!hide.statements) {
    for (const [key, label] of STATEMENTS) {
      const text = meta.front.statements[key].trim();
      if (text) out.push(para(run(`${label}. `, { b: true }) + run(text), { jc: 'left' }));
    }
  }
  if (!hide.references && references.length) {
    out.push(para(run('References'), { style: 'Heading1' }));
    for (const r of references) out.push(para(run(r.label ? `${r.label} ${r.text}` : r.text), { style: 'Reference' }));
  }
  return out;
}

// ── styles and numbering ──

function stylesXml(font: string): string {
  const style = (id: string, name: string, o: { ppr?: string; rpr?: string; next?: string; based?: string | null } = {}) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>${o.based === null ? '' : `<w:basedOn w:val="${o.based ?? 'Normal'}"/>`}${o.next ? `<w:next w:val="${o.next}"/>` : ''}<w:qFormat/>${o.ppr ? `<w:pPr>${o.ppr}</w:pPr>` : ''}${o.rpr ? `<w:rPr>${o.rpr}</w:rPr>` : ''}</w:style>`;
  const sp = (before: number, after: number, line: number) => `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
  const heading = (n: number, name: string, ppr: string, rpr: string) => style(`Heading${n}`, `heading ${n}`, { next: 'Normal', ppr: `<w:keepNext/>${ppr}<w:jc w:val="left"/><w:outlineLvl w:val="${n - 1}"/>`, rpr });
  return `${XML}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="336" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="both"/></w:pPr></w:style>'
    + style('Title', 'Title', { next: 'Normal', ppr: `<w:keepNext/>${sp(0, 0, 300)}<w:jc w:val="center"/>`, rpr: '<w:b/><w:sz w:val="32"/><w:szCs w:val="32"/>' })
    + style('Authors', 'Authors', { ppr: `${sp(180, 0, 336)}<w:jc w:val="center"/>`, rpr: '<w:sz w:val="18"/><w:szCs w:val="18"/>' })
    + style('Affiliation', 'Affiliation', { ppr: `${sp(60, 0, 336)}<w:jc w:val="center"/>`, rpr: '<w:sz w:val="16"/><w:szCs w:val="16"/>' })
    + style('AbstractHeading', 'Abstract Heading', { next: 'Normal', ppr: `<w:keepNext/>${sp(0, 120, 336)}<w:jc w:val="left"/><w:outlineLvl w:val="0"/>`, rpr: '<w:b/><w:sz w:val="28"/><w:szCs w:val="28"/>' })
    + heading(1, 'Heading 1', sp(280, 80, 312), '<w:b/><w:sz w:val="22"/><w:szCs w:val="22"/>')
    + heading(2, 'Heading 2', sp(200, 40, 336), '<w:b/><w:sz w:val="20"/><w:szCs w:val="20"/>')
    + heading(3, 'Heading 3', sp(160, 40, 336), '<w:b/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/>')
    + heading(4, 'Heading 4', sp(160, 40, 336), '<w:b/><w:sz w:val="20"/><w:szCs w:val="20"/>')
    + heading(5, 'Heading 5', sp(160, 40, 336), '<w:b/><w:sz w:val="20"/><w:szCs w:val="20"/>')
    + style('Caption', 'caption', { ppr: `${sp(0, 120, 312)}<w:jc w:val="left"/>`, rpr: '<w:sz w:val="16"/><w:szCs w:val="16"/>' })
    + style('TableText', 'Table Text', { ppr: `${sp(20, 20, 312)}<w:jc w:val="left"/>`, rpr: '<w:sz w:val="16"/><w:szCs w:val="16"/>' })
    + style('Reference', 'Reference', { ppr: `${sp(0, 60, 312)}<w:ind w:left="256" w:hanging="256"/><w:jc w:val="left"/>`, rpr: '<w:sz w:val="16"/><w:szCs w:val="16"/>' })
    + style('Header', 'header', { ppr: '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>', rpr: '<w:color w:val="64748B"/><w:sz w:val="16"/><w:szCs w:val="16"/>' })
    + style('Footer', 'footer', { ppr: '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>', rpr: '<w:color w:val="64748B"/><w:sz w:val="16"/><w:szCs w:val="16"/>' })
    + '</w:styles>';
}

/** Num 1 is the bullet list; each numbered list gets its own num (2, 3, ...) so it restarts at 1. */
function numberingXml(font: string, ordered: number): string {
  const lvl = (i: number, fmt: string, text: string, rfonts: string) =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${360 * (i + 1)}" w:hanging="360"/></w:pPr>${rfonts}</w:lvl>`;
  const bulletFont = `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:hint="default"/></w:rPr>`;
  const bullets = [0, 1, 2, 3].map((i) => lvl(i, 'bullet', i % 2 ? '–' : '•', bulletFont)).join('');
  const decimals = [lvl(0, 'decimal', '%1.', ''), lvl(1, 'lowerLetter', '%2.', ''), lvl(2, 'lowerRoman', '%3.', ''), lvl(3, 'decimal', '%4.', '')].join('');
  const nums = Array.from({ length: ordered }, (_, k) => `<w:num w:numId="${k + 2}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('');
  return `${XML}<w:numbering ${NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${bullets}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${decimals}</w:abstractNum><w:num w:numId="${BULLET_NUM}"><w:abstractNumId w:val="0"/></w:num>${nums}</w:numbering>`;
}

// ── the file ──

export interface DocxOptions {
  /** The paper's meta: page size, margins, columns, font, header and footer, front and end matter. With it the Markdown is the body only. */
  meta?: PaperMeta;
  /** The reference list, already formatted in the paper's style (Markers.references). */
  references?: Array<{ label: string; text: string }>;
}

function hfOf(meta?: PaperMeta): Hf {
  const hide = meta?.hide ?? {};
  const filled = (z: { left: string; center: string; right: string }) => Boolean(z.left.trim() || z.center.trim() || z.right.trim());
  const headerZone = meta?.page.header;
  const footerZone = meta ? meta.page.footer : { left: '', center: '{page}', right: '' }; // no meta: a plain page number
  return {
    header: Boolean(headerZone && !hide.header && filled(headerZone)),
    footer: Boolean(footerZone && !hide.footer && filled(footerZone)),
    titlePg: Boolean(meta?.page.differentFirstPage),
  };
}

interface Media {
  name: string; // file name inside word/media
  data: Uint8Array;
  ext: 'png' | 'jpeg';
}

/** Pieces are runs of the body that share one column count; each piece ends in its own section break. */
interface Package {
  pieces: Array<{ blocks: string[]; cols: 1 | 2 }>;
  L: Layout;
  hf: Hf;
  meta?: PaperMeta;
  ordered: number;
  media: Media[];
}

/** The zip: the package parts, the section breaks between pieces, the header and footer, and the pictures. */
async function packageDocx(p: Package): Promise<Uint8Array> {
  const { pieces, L, hf, meta, ordered, media } = p;
  const headerZone = meta?.page.header;
  const footerZone = meta ? meta.page.footer : { left: '', center: '{page}', right: '' };
  let xml = '';
  pieces.forEach((piece, i) => {
    const sect = sectPr(L, { cols: piece.cols, first: i === 0, hf });
    if (i === pieces.length - 1) xml += `${piece.blocks.join('')}${sect}`;
    else xml += closeSection(piece.blocks, sect).join('');
  });

  const zip = new JSZip();
  // createFolders off: Word wants no folder entries in the package.
  const file = (name: string, data: string | Uint8Array) => zip.file(name, data, { createFolders: false });
  const override = (part: string, type: string) => `<Override PartName="/word/${part}.xml" ContentType="${CT}.${type}+xml"/>`;
  file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>${override('document', 'document.main')}${override('styles', 'styles')}${override('numbering', 'numbering')}${hf.header ? override('header1', 'header') : ''}${hf.footer ? override('footer1', 'footer') : ''}</Types>`);
  file('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`);
  const pictures = media.map((m) => `<Relationship Id="rIdImg${m.name.replace(/\D/g, '')}" Type="${REL}/image" Target="media/${m.name}"/>`).join('');
  file('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="${REL}/numbering" Target="numbering.xml"/>${hf.header ? `<Relationship Id="rIdHeader" Type="${REL}/header" Target="header1.xml"/>` : ''}${hf.footer ? `<Relationship Id="rIdFooter" Type="${REL}/footer" Target="footer1.xml"/>` : ''}${pictures}</Relationships>`);
  file('word/styles.xml', stylesXml(L.font));
  file('word/numbering.xml', numberingXml(L.font, ordered));
  if (hf.header && headerZone) file('word/header1.xml', zonePart('hdr', 'Header', headerZone, meta, L.textW));
  if (hf.footer && footerZone) file('word/footer1.xml', zonePart('ftr', 'Footer', footerZone, meta, L.textW));
  for (const m of media) file(`word/media/${m.name}`, m.data);
  file('word/document.xml', `${XML}<w:document ${NS_DOC}><w:body>${xml}</w:body></w:document>`);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

/** The paper's .docx from Markdown. Two columns on the whole body when meta says so. */
export async function markdownToDocx(markdown: string, opts: DocxOptions = {}): Promise<Uint8Array> {
  const { meta } = opts;
  const L = layoutOf(meta);
  const bodyW = L.columns === 2 ? Math.floor((L.textW - COL_GAP) / 2) : L.textW;
  const built = build(markdown, bodyW);
  const front = meta ? frontBlocks(meta) : [];
  const end = meta ? endBlocks(meta, opts.references ?? []) : [];
  const bodyBlocks = built.body ? [built.body] : [];
  let pieces: Array<{ blocks: string[]; cols: 1 | 2 }>;
  if (L.columns === 2) pieces = [{ blocks: front, cols: 1 }, { blocks: bodyBlocks, cols: 2 }, { blocks: end, cols: 1 }].filter((p) => p.blocks.length) as typeof pieces;
  else pieces = [{ blocks: [...front, ...bodyBlocks, ...end], cols: 1 }];
  if (!pieces.length) pieces = [{ blocks: [], cols: 1 }];
  return packageDocx({ pieces, L, hf: hfOf(meta), meta, ordered: built.ordered, media: [] });
}

// ── the editor document, written straight to Word (no Markdown in between) ──

const CITABLE = new Set(['citation', 'quote', 'figure', 'tableFigure']);
const plain = (n: PmNode): string => (n.text ?? '') + (n.content ?? []).map(plain).join('');

/** One item of the body: a paragraph, a table or a picture, and whether it spans every column. */
interface Item {
  xml: string;
  cols: 1 | 2;
  span: boolean; // figures and tables run across the full width
  caption?: string; // the text, when the item is a caption
}

interface Walk {
  L: Layout;
  markers: Map<PmNode, string>; // the citation marker of each citable node (computeMarkers order)
  images: Record<string, string>; // clip id to data URL, for figures
  media: Media[];
  ordered: number; // numbered lists so far; each gets its own numId
}

/** Citable nodes, in document order, paired with the markers computeMarkers produced for them. */
function markerMap(pm: PmNode, markers: string[]): Map<PmNode, string> {
  const out = new Map<PmNode, string>();
  let n = 0;
  const walk = (node: PmNode) => {
    if (CITABLE.has(node.type)) out.set(node, markers[n++] ?? '');
    for (const c of node.content ?? []) walk(c);
  };
  walk(pm);
  return out;
}

function fmtOf(marks: PmNode['marks'], base: Fmt): Fmt {
  const f: Fmt = { ...base };
  for (const m of marks ?? []) {
    if (m.type === 'bold') f.b = true;
    else if (m.type === 'italic') f.i = true;
    else if (m.type === 'subscript') f.va = 'subscript';
    else if (m.type === 'superscript') f.va = 'superscript';
  }
  return f;
}

/** The inline content of a block: text with its marks, citation markers, and maths as code-style text. */
function inline(nodes: PmNode[], w: Walk, base: Fmt = {}): string {
  return nodes
    .map((n) => {
      if (n.type === 'text') return run(n.text ?? '', fmtOf(n.marks, base));
      if (n.type === 'citation') return run(w.markers.get(n) ?? '', base);
      if (n.type === 'hardBreak') return '<w:r><w:br/></w:r>';
      if (n.type === 'inlineMath') return run(String(n.attrs?.latex ?? ''), { ...base, font: 'Consolas' });
      return inline(n.content ?? [], w, base);
    })
    .join('');
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** A paragraph's text as plain words, for captions and table widths. */
const words = (nodes: PmNode[]) => nodes.map(plain).join('').replace(/\s+/g, ' ').trim();

/** Data URL of a PNG or JPEG to its bytes and pixel size; null for anything else. */
function imageOf(url: string): { data: Uint8Array; ext: 'png' | 'jpeg'; w: number; h: number } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.*)$/.exec(url);
  if (!m) return null;
  const data = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const ext = m[1] === 'png' ? 'png' : 'jpeg';
  const size = ext === 'png' ? pngSize(data) : jpegSize(data);
  return size ? { data, ext, ...size } : null;
}

function pngSize(d: Uint8Array): { w: number; h: number } | null {
  if (d.length < 24 || d[1] !== 0x50) return null;
  const at = (o: number) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
  return { w: at(16), h: at(20) };
}

function jpegSize(d: Uint8Array): { w: number; h: number } | null {
  let i = 2;
  while (i + 9 < d.length) {
    if (d[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = d[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { h: (d[i + 5] << 8) | d[i + 6], w: (d[i + 7] << 8) | d[i + 8] };
    i += 2 + ((d[i + 2] << 8) | d[i + 3]);
  }
  return null;
}

/** A picture in its own paragraph, scaled to `widthTw` (twips) and its own proportions. */
function picture(w: Walk, img: { data: Uint8Array; ext: 'png' | 'jpeg'; w: number; h: number }, widthTw: number, pxWidth?: number): string {
  const n = w.media.length + 1;
  const name = `image${n}.${img.ext}`;
  w.media.push({ name, data: img.data, ext: img.ext });
  const twips = pxWidth ? Math.min(widthTw, px(pxWidth)) : widthTw;
  const cx = twips * 635; // one twip is 635 EMU
  const cy = Math.round((cx * img.h) / img.w);
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="60" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Figure ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

/** One cell of a table after placement: where it starts, how many grid columns and rows it covers. */
interface Placed {
  cell: PmNode | null; // null: a cell that only fills a gap
  col: number;
  span: number;
  rowspan: number;
  start: boolean; // false for the cells a merged cell covers below or beside its first cell
}

/**
 * A table as a real Word table: a grid of thin rules, 8 pt text, bold header row. Merged cells (rowspan and colspan from the
 * editor) become vMerge and gridSpan, so the rows below a merged cell keep their columns. Widths follow the text in each column.
 */
function wordTable(rows: PmNode[], w: Walk, widthTw: number): string {
  const owner: Array<Array<{ p: Placed } | undefined>> = [];
  const placedRows: Placed[][] = [];
  let cols = 0;
  rows.forEach((row, r) => {
    owner[r] = owner[r] ?? [];
    const out: Placed[] = [];
    let c = 0;
    for (const cell of row.content ?? []) {
      while (owner[r][c]) c++;
      const span = Math.max(1, Number(cell.attrs?.colspan) || 1);
      const rowspan = Math.max(1, Number(cell.attrs?.rowspan) || 1);
      const p: Placed = { cell, col: c, span, rowspan, start: true };
      for (let rr = r; rr < r + rowspan; rr++) {
        owner[rr] = owner[rr] ?? [];
        for (let cc = c; cc < c + span; cc++) owner[rr][cc] = { p: { ...p, start: rr === r && cc === c } };
      }
      out.push(p);
      c += span;
      cols = Math.max(cols, c);
    }
    placedRows[r] = out;
  });
  // widths: the longest single-column text in each grid column decides it
  const weight = Array.from({ length: cols }, (_, c) => {
    const lengths = placedRows.flat().filter((p) => p.col === c && p.span === 1 && p.cell).map((p) => words(p.cell!.content ?? []).length);
    return Math.min(40, Math.max(4, ...lengths));
  });
  const sum = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((x) => Math.floor((widthTw * x) / sum));
  const span = (c: number, n: number) => widths.slice(c, c + n).reduce((a, b) => a + b, 0);

  const rule = (edge: string) => `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(rule).join('');
  const body = rows.map((_, r) => {
    const tcs: string[] = [];
    for (let c = 0; c < cols; ) {
      const hit = owner[r]?.[c]?.p;
      if (!hit) {
        tcs.push(`<w:tc><w:tcPr><w:tcW w:w="${widths[c]}" w:type="dxa"/></w:tcPr>${para('', { style: 'TableText' })}</w:tc>`);
        c++;
        continue;
      }
      const n = hit.span;
      const merge = hit.rowspan > 1 ? (hit.start ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') : '';
      const tcPr = `<w:tcW w:w="${span(c, n)}" w:type="dxa"/>${n > 1 ? `<w:gridSpan w:val="${n}"/>` : ''}${merge}`;
      const paras = hit.start && hit.cell
        ? (hit.cell.content ?? []).map((p) => para(inline(p.content ?? [], w, r === 0 ? { b: true } : {}), { style: 'TableText' })).join('')
        : '';
      tcs.push(`<w:tc><w:tcPr>${tcPr}</w:tcPr>${paras || para('', { style: 'TableText' })}</w:tc>`);
      c += n;
    }
    return `<w:tr>${tcs.join('')}</w:tr>`;
  });
  const gridCols = widths.map((x) => `<w:gridCol w:w="${x}"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${body.join('')}</w:tbl>`;
}

const captionItem = (xml: string, text: string, cols: 1 | 2): Item => ({ xml, cols, span: false, caption: text });

/** Every block of the editor document, in order, as body items. */
function emit(node: PmNode, cols: 1 | 2, w: Walk, out: Item[]): void {
  const a = node.attrs ?? {};
  const kids = node.content ?? [];
  switch (node.type) {
    case 'sectionHeading':
      out.push({ xml: para(inline(kids, w), { style: 'Heading1' }), cols, span: false });
      return;
    case 'heading': {
      const level = Math.min(Math.max(Number(a.level) || 2, 1), 5);
      out.push({ xml: para(inline(kids, w), { style: HEADING_STYLE[level] }), cols, span: false });
      return;
    }
    case 'paragraph': {
      const variant = str(a.variant);
      const style = variant === 'caption' || variant === 'note' ? 'Caption' : variant === 'reference' ? 'Reference' : undefined;
      const jc = a.align === 'center' ? 'center' : a.align === 'right' ? 'right' : a.align === 'left' ? 'left' : a.align === 'justify' ? 'both' : undefined;
      const xml = para(inline(kids, w), { style, jc });
      out.push(style === 'Caption' ? captionItem(xml, words(kids), cols) : { xml, cols, span: false });
      return;
    }
    case 'quote': {
      const marker = w.markers.get(node) ?? '';
      const xml = para(run('“') + inline(kids, w) + run(`”${marker ? ` ${marker}` : ''}`));
      out.push({ xml, cols, span: false });
      return;
    }
    case 'bulletList':
    case 'orderedList':
      listItems(node, 0, w, cols, out);
      return;
    case 'figure': {
      const img = imageOf(w.images[str(a.clipId)] ?? '');
      const caption = str(a.caption).trim();
      if (img) out.push({ xml: picture(w, img, w.L.textW, Number(a.width) || undefined), cols: 1, span: true });
      else out.push({ xml: para(run('[Figure]'), { jc: 'center' }), cols: 1, span: true });
      if (caption) out.push({ ...captionItem(para(run(caption), { style: 'Caption' }), caption, 1), span: true });
      return;
    }
    case 'tableFigure': {
      const caption = str(a.caption).trim();
      const table = kids.find((k) => k.type === 'table');
      const prev = out[out.length - 1];
      if (caption && !(prev?.caption && caption.startsWith(prev.caption))) out.push({ ...captionItem(para(run(caption), { style: 'Caption' }), caption, 1), span: true });
      if (table) out.push({ xml: wordTable(table.content ?? [], w, w.L.textW), cols: 1, span: true });
      return;
    }
    case 'table':
      out.push({ xml: wordTable(kids, w, w.L.textW), cols: 1, span: true });
      return;
    case 'blockMath':
      out.push({ xml: para(run(str(a.latex), { font: 'Consolas' }), { jc: 'left' }), cols, span: false });
      return;
    case 'pageBreak':
      out.push({ xml: '<w:p><w:r><w:br w:type="page"/></w:r></w:p>', cols, span: false });
      return;
    case 'clipNote':
    case 'unplaced':
      return;
    default:
      for (const k of kids) emit(k, cols, w, out);
  }
}

function listItems(list: PmNode, depth: number, w: Walk, cols: 1 | 2, out: Item[]): void {
  const id = list.type === 'orderedList' ? 2 + w.ordered++ : 1;
  for (const item of list.content ?? []) {
    for (const child of item.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') listItems(child, depth + 1, w, cols, out);
      else {
        const text = inline(child.content ?? [], w);
        if (text) out.push({ xml: para(text, { num: { id, lvl: Math.min(depth, 3) } }), cols, span: false });
      }
    }
  }
}

/** Front and end matter from the paper's meta, as body items in one column. */
const asItems = (xml: string[]): Item[] => xml.map((x) => ({ xml: x, cols: 1 as const, span: false }));

/** A caption right above a spanning table or picture moves with it, so a break never separates them. */
function keepCaptions(items: Item[]): void {
  items.forEach((it, i) => {
    if (it.caption !== undefined && items[i + 1]?.span) it.span = true;
  });
}

/** Items grouped into pieces that share a column count. Spanning items are one-column pieces of their own. */
function groupPieces(items: Item[]): Array<{ blocks: string[]; cols: 1 | 2 }> {
  const pieces: Array<{ blocks: string[]; cols: 1 | 2 }> = [];
  for (const it of items) {
    const cols: 1 | 2 = it.span ? 1 : it.cols;
    const last = pieces[pieces.length - 1];
    if (last && last.cols === cols) last.blocks.push(it.xml);
    else pieces.push({ blocks: [it.xml], cols });
  }
  return pieces.length ? pieces : [{ blocks: [], cols: 1 }];
}

/**
 * The paper as a .docx: body, front matter, statements and reference list as the editor shows them, in the paper's citation style.
 * `images` maps a figure's clip id to its picture (a data URL), as the editor draws it. Sections with `columns` "2" are two columns;
 * figures and tables span the full width.
 */
export async function paperToDocx(pm: PmNode, meta: PaperMeta, rendered: Markers, images: Record<string, string> = {}): Promise<Uint8Array> {
  const L = layoutOf(meta);
  const w: Walk = { L, markers: markerMap(pm, rendered.markers), images, media: [], ordered: 0 };
  const body: Item[] = [];
  for (const node of pm.content ?? []) {
    const cols: 1 | 2 = node.attrs?.columns === '2' ? 2 : node.attrs?.columns === '1' ? 1 : L.columns;
    if (node.type !== 'section') continue;
    for (const child of node.content ?? []) emit(child, cols, w, body);
  }
  keepCaptions(body);
  const hide = meta.hide ?? {};
  const refs = hide.references ? [] : rendered.references.map((r) => ({ label: r.label, text: r.text }));
  const items = [...asItems(frontBlocks(meta)), ...body, ...asItems(endBlocks(meta, refs))];
  return packageDocx({ pieces: groupPieces(items), L, hf: hfOf(meta), meta, ordered: w.ordered, media: w.media });
}
