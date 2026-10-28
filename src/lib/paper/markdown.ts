// Markdown export of a paper. Pure: no DOM, no editor.
// Turns the editor document (ProseMirror JSON, see docModel.ts) and its meta into one Markdown file. Citations stay as
// [@KEY] markers, and the References list maps each key to its cite target, so the file reads on its own.

import type { PmNode, PaperMeta } from './docModel.ts';

interface Ctx {
  cites: Record<string, string>;
}

type Abstract = PaperMeta['front']['abstract'];

const INLINE = new Set(['text', 'citation', 'inlineMath', 'hardBreak']);

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function keyOfClip(cites: Record<string, string>, clipId: unknown): string | undefined {
  if (typeof clipId !== 'string' || !clipId) return undefined;
  return Object.entries(cites).find(([, id]) => id === clipId)?.[0];
}

/** Wraps the text in a mark, keeping its outer spaces outside the markers so `** x**` never appears. */
function wrap(s: string, open: string, close: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  if (!m || !m[2]) return s;
  return `${m[1]}${open}${m[2]}${close}${m[3]}`;
}

function applyMarks(text: string, marks: PmNode['marks']): string {
  let out = text;
  for (const m of marks ?? []) {
    switch (m.type) {
      case 'bold':
        out = wrap(out, '**', '**');
        break;
      case 'italic':
        out = wrap(out, '*', '*');
        break;
      case 'subscript':
        out = out ? `<sub>${out}</sub>` : out;
        break;
      case 'superscript':
        out = out ? `<sup>${out}</sup>` : out;
        break;
      case 'link': {
        const href = str(m.attrs?.href);
        if (href && out) out = `[${out}](${href})`;
        break;
      }
      // underline and every other mark (fontSize, textStyle, color) is not written
    }
  }
  return out;
}

function citationText(node: PmNode): string {
  const a = node.attrs ?? {};
  const keys = Array.isArray(a.keys) ? (a.keys as unknown[]).filter((k): k is string => typeof k === 'string' && k !== '') : [];
  if (keys.length === 0) return '';
  const locator = str(a.locator).trim();
  if (keys.length === 1 && locator) return `[@${keys[0]}, ${locator}]`;
  return `[${keys.map((k) => `@${k}`).join('; ')}]`;
}

function renderInline(node: PmNode, ctx: Ctx): string {
  switch (node.type) {
    case 'text':
      return applyMarks(node.text ?? '', node.marks);
    case 'citation':
      return citationText(node);
    case 'inlineMath':
      return `$${str(node.attrs?.latex)}$`;
    case 'hardBreak':
      return '\n';
    default:
      return (node.content ?? []).map((c) => renderInline(c, ctx)).join('');
  }
}

function inlineOf(nodes: PmNode[], ctx: Ctx): string {
  return nodes.map((n) => renderInline(n, ctx)).join('').trim();
}

function cellText(cell: PmNode, ctx: Ctx): string {
  return (cell.content ?? [])
    .map((p) => renderInline(p, ctx).replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\|/g, '\\|');
}

/** A GitHub pipe table. The first row is the header. Empty string when the table has no rows. */
function renderTable(table: PmNode, ctx: Ctx): string {
  const rows = (table.content ?? []).filter((r) => r.type === 'tableRow');
  if (rows.length === 0) return '';
  const matrix = rows.map((r) => (r.content ?? []).map((c) => cellText(c, ctx)));
  const width = Math.max(1, ...matrix.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  const sep = `| ${Array(width).fill('---').join(' | ')} |`;
  return [line(matrix[0]), sep, ...matrix.slice(1).map(line)].join('\n');
}

/** Bullet or numbered list lines. Nested lists are indented two spaces per level. */
function listLines(list: PmNode, depth: number, ctx: Ctx): string[] {
  const pad = '  '.repeat(depth);
  const ordered = list.type === 'orderedList';
  const out: string[] = [];
  (list.content ?? []).forEach((item, i) => {
    const parts: string[] = [];
    const nested: string[] = [];
    for (const child of item.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') nested.push(...listLines(child, depth + 1, ctx));
      else {
        const t = renderInline(child, ctx).trim();
        if (t) parts.push(t);
      }
    }
    const marker = ordered ? `${i + 1}.` : '-';
    out.push(`${pad}${marker} ${parts.join(' ')}`.trimEnd());
    out.push(...nested);
  });
  return out;
}

/** Each block becomes one or more Markdown chunks; chunks are later separated by a blank line. */
function renderBlock(node: PmNode, ctx: Ctx): string[] {
  const a = node.attrs ?? {};
  const kids = node.content ?? [];
  switch (node.type) {
    case 'doc':
    case 'section':
      return kids.flatMap((k) => renderBlock(k, ctx));
    case 'sectionHeading': {
      const t = inlineOf(kids, ctx);
      return t ? [`## ${t}`] : [];
    }
    case 'heading': {
      const level = Number(a.level) || 2;
      const t = inlineOf(kids, ctx);
      return t ? [`${'#'.repeat(Math.min(level + 1, 6))} ${t}`] : [];
    }
    case 'paragraph': {
      const t = inlineOf(kids, ctx);
      return t ? [t] : [];
    }
    case 'bulletList':
    case 'orderedList': {
      const lines = listLines(node, 0, ctx);
      return lines.length ? [lines.join('\n')] : [];
    }
    case 'quote': {
      const text = inlineOf(kids, ctx);
      const key = keyOfClip(ctx.cites, a.clipId);
      if (!text && !key) return [];
      const page = str(a.page).trim();
      const marker = key ? (page ? `[@${key}, p. ${page}]` : `[@${key}]`) : '';
      return [`> ${[text, marker].filter(Boolean).join(' ')}`];
    }
    case 'figure':
      return [`![${str(a.caption).trim()}](clip:${str(a.clipId)})`];
    case 'tableFigure': {
      const table = kids.find((k) => k.type === 'table');
      const md = table ? renderTable(table, ctx) : '';
      if (!md) return [];
      const caption = str(a.caption).trim();
      return caption ? [md, `*Table: ${caption}*`] : [md];
    }
    case 'table': {
      const md = renderTable(node, ctx);
      return md ? [md] : [];
    }
    case 'blockMath':
      return [`$$\n${str(a.latex)}\n$$`];
    case 'pageBreak':
      return ['---'];
    case 'clipNote':
    case 'unplaced':
      return [];
    default: {
      // Unknown node: its text if it only holds inline content, otherwise its children. Never throws.
      if (kids.length === 0 || kids.every((k) => INLINE.has(k.type))) {
        const t = renderInline(node, ctx).trim();
        return t ? [t] : [];
      }
      return kids.flatMap((k) => renderBlock(k, ctx));
    }
  }
}

function abstractBlocks(abs: Abstract): string[] {
  if ('parts' in abs) {
    return abs.parts
      .map((p) => {
        const text = p.text.trim();
        const label = p.label.trim().replace(/\.$/, '');
        if (!text) return '';
        return label ? `**${label}.** ${text}` : text;
      })
      .filter(Boolean);
  }
  const text = abs.text.trim();
  return text ? [text] : [];
}

/** Keys of every citation and quote in the body, in order of first use. The Unplaced bin does not count. */
function citedKeys(pm: PmNode, cites: Record<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (k: string) => {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  };
  const walk = (node: PmNode) => {
    if (node.type === 'unplaced') return;
    if (node.type === 'citation' && Array.isArray(node.attrs?.keys)) {
      for (const k of node.attrs.keys as unknown[]) if (typeof k === 'string' && k) add(k);
    }
    if (node.type === 'quote') {
      const k = keyOfClip(cites, node.attrs?.clipId);
      if (k) add(k);
    }
    for (const c of node.content ?? []) walk(c);
  };
  walk(pm);
  return out;
}

/** The whole paper as Markdown, ending in one newline. Hidden blocks (meta.hide) are left out. */
export function paperToMarkdown(pm: PmNode, meta: PaperMeta): string {
  const ctx: Ctx = { cites: meta.cites ?? {} };
  const { front, hide } = meta;
  const blocks: string[] = [];

  const title = front.title.trim();
  if (title && !hide.title) blocks.push(`# ${title}`);

  if (!hide.authors) {
    const names = front.authors.map((a) => a.name.trim()).filter(Boolean);
    if (names.length) blocks.push(names.join(', '));
  }

  if (!hide.abstract) {
    const body = abstractBlocks(front.abstract);
    if (body.length) blocks.push('## Abstract', ...body);
  }

  if (!hide.keywords) {
    const keywords = front.keywords.map((k) => k.trim()).filter(Boolean);
    if (keywords.length) blocks.push(`**Keywords:** ${keywords.join(', ')}`);
  }

  blocks.push(...renderBlock(pm, ctx));

  const keys = citedKeys(pm, ctx.cites);
  if (hide.references !== true && keys.length) {
    const items = keys.map((k) => {
      const target = ctx.cites[k];
      return target ? `- [@${k}]: ${target}` : `- [@${k}]`;
    });
    blocks.push('## References', items.join('\n'));
  }

  const out = blocks
    .filter((b) => b.trim() !== '')
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
  return out ? `${out}\n` : '';
}
