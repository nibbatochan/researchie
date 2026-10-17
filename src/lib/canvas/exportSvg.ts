// Draws a canvas (sections, shapes, notes, atom cards, connectors, drawings) as one SVG string.
// PNG and JPEG exports render this same SVG, so every format shows the same thing.

import type { CanvasAtomNode, CanvasConnector, CanvasDrawingPath, CanvasFolder, CanvasShape } from '@/lib/types/canvas';
import { boxBounds, boxCenter, portPoint, type Box } from './geometry.ts';

export interface ExportAtom {
  type?: string;
  title?: string;
  text?: string;
  pageTitle?: string;
  sourceUrl?: string;
}

export interface BuildSvgInput {
  nodes: CanvasAtomNode[];
  folders: CanvasFolder[];
  shapes: CanvasShape[];
  connectors: CanvasConnector[];
  drawings: CanvasDrawingPath[];
  atoms: Map<string, ExportAtom>;
  nodeHeights?: Record<string, number>;
  theme?: 'dark' | 'light';
  padding?: number;
}

export interface BuiltSvg {
  svg: string;
  width: number;
  height: number;
  empty: boolean;
}

const PALETTE = {
  dark: { bg: '#09090B', card: '#18181B', cardStroke: '#27272A', text: '#F4F4F5', muted: '#71717A', label: '#325FEC', sectionText: '#A1A1AA' },
  light: { bg: '#FAFBFD', card: '#FFFFFF', cardStroke: '#D2DCEA', text: '#0F172A', muted: '#94A3B8', label: '#325FEC', sectionText: '#475569' },
} as const;

const SECTION_HEX: Record<string, string> = {
  blue: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  rose: '#F43F5E',
  slate: '#64748B',
};

export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Break text into lines that fit a width. Widths are estimated from the font size. */
export function wrapText(text: string, maxWidth: number, fontSize: number, maxLines = 40): string[] {
  const charWidth = fontSize * 0.56;
  const perLine = Math.max(1, Math.floor(maxWidth / charWidth));
  const lines: string[] = [];
  for (const paragraph of String(text).split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (word.length > perLine) {
        if (line) {
          lines.push(line);
          line = '';
        }
        for (let i = 0; i < word.length; i += perLine) lines.push(word.slice(i, i + perLine));
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (next.length > perLine) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return cut;
  }
  return lines;
}

const rotateAttr = (b: Box) => {
  const r = b.rotation || 0;
  if (!r) return '';
  const c = boxCenter(b);
  return ` transform="rotate(${r} ${c.x} ${c.y})"`;
};

function textBlock(lines: string[], x: number, y: number, fontSize: number, fill: string, anchor: 'start' | 'middle', weight: string, lineHeight = 1.35, family = 'sans-serif') {
  return lines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${y + i * fontSize * lineHeight}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(ln)}</text>`
    )
    .join('');
}

const WEIGHT: Record<string, string> = { normal: '400', medium: '500', semibold: '600', bold: '700' };

function shapeSvg(sh: CanvasShape, theme: 'dark' | 'light'): string {
  const pal = PALETTE[theme];
  const w = sh.width;
  const h = sh.height;
  const stroke = sh.strokeColor && sh.strokeColor !== 'transparent' ? sh.strokeColor : '#325FEC';
  const sw = sh.strokeWidth ?? 2;
  const inset = sw / 2;
  const tint = `fill="${stroke}" fill-opacity="0.14"`;
  const box: Box = { x: sh.x, y: sh.y, width: w, height: h, rotation: sh.rotation };
  const fontSize = sh.fontSize ?? 12;
  const weight = WEIGHT[sh.fontWeight || 'medium'] || '500';
  const textFill = sh.textColor && sh.textColor !== '#0F172A' ? sh.textColor : pal.text;
  const centred = (txt: string) => {
    const lines = wrapText(txt, Math.max(20, w - 24), fontSize, Math.max(1, Math.floor((h - 12) / (fontSize * 1.35))));
    const total = lines.length * fontSize * 1.35;
    return textBlock(lines, sh.x + w / 2, sh.y + (h - total) / 2 + fontSize, fontSize, textFill, 'middle', weight);
  };

  let body = '';
  switch (sh.type) {
    case 'sticky':
      body = `<rect x="${sh.x}" y="${sh.y}" width="${w}" height="${h}" rx="16" fill="${stroke}" fill-opacity="${theme === 'dark' ? 0.22 : 0.45}" stroke="${stroke}" stroke-width="${sw}"/>${centred(sh.text)}`;
      break;
    case 'text':
      body = centred(sh.text);
      break;
    case 'square':
      body = `<rect x="${sh.x + inset}" y="${sh.y + inset}" width="${w - sw}" height="${h - sw}" stroke="${stroke}" stroke-width="${sw}" ${tint}/>${centred(sh.text)}`;
      break;
    case 'circle':
      body = `<circle cx="${sh.x + w / 2}" cy="${sh.y + h / 2}" r="${Math.max(Math.min(w, h) / 2 - inset, 1)}" stroke="${stroke}" stroke-width="${sw}" ${tint}/>${centred(sh.text)}`;
      break;
    case 'ellipse':
      body = `<ellipse cx="${sh.x + w / 2}" cy="${sh.y + h / 2}" rx="${Math.max(w / 2 - inset, 1)}" ry="${Math.max(h / 2 - inset, 1)}" stroke="${stroke}" stroke-width="${sw}" ${tint}/>${centred(sh.text)}`;
      break;
    case 'line':
      body = `<line x1="${sh.x + inset}" y1="${sh.y + h / 2}" x2="${sh.x + w - inset}" y2="${sh.y + h / 2}" stroke="${stroke}" stroke-width="${Math.max(sw, 2)}" stroke-linecap="round"/>`;
      break;
    case 'arrow': {
      const head = Math.min(14, w / 2);
      body = `<line x1="${sh.x + inset}" y1="${sh.y + h / 2}" x2="${sh.x + w - head}" y2="${sh.y + h / 2}" stroke="${stroke}" stroke-width="${Math.max(sw, 2)}" stroke-linecap="round"/><polygon points="${sh.x + w - inset},${sh.y + h / 2} ${sh.x + w - head - inset},${sh.y + h / 2 - head / 2} ${sh.x + w - head - inset},${sh.y + h / 2 + head / 2}" fill="${stroke}"/>`;
      break;
    }
    case 'polygon':
      body = `<polygon points="${sh.x + w / 2},${sh.y + inset} ${sh.x + w - inset},${sh.y + h - inset} ${sh.x + inset},${sh.y + h - inset}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${tint}/>${centred(sh.text)}`;
      break;
    case 'star': {
      const pts = [
        [0.5, 0.05], [0.62, 0.38], [0.98, 0.38], [0.69, 0.58], [0.8, 0.92], [0.5, 0.72], [0.2, 0.92], [0.31, 0.58], [0.02, 0.38], [0.38, 0.38],
      ]
        .map(([px, py]) => `${sh.x + w * px},${sh.y + h * py}`)
        .join(' ');
      body = `<polygon points="${pts}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${tint}/>${centred(sh.text)}`;
      break;
    }
    case 'rectangle':
    default:
      body = `<rect x="${sh.x + inset}" y="${sh.y + inset}" width="${w - sw}" height="${h - sw}" rx="8" stroke="${stroke}" stroke-width="${sw}" ${tint}/>${centred(sh.text)}`;
  }
  return `<g${rotateAttr(box)}>${body}</g>`;
}

function atomSvg(n: CanvasAtomNode, atom: ExportAtom | undefined, height: number, theme: 'dark' | 'light'): string {
  const pal = PALETTE[theme];
  const w = n.width || 340;
  const box: Box = { x: n.x, y: n.y, width: w, height, rotation: n.rotation };
  const type = (atom?.type || 'note').toUpperCase();
  const body = atom?.text || atom?.title || 'Clip';
  const isQuote = atom?.type === 'quote' || atom?.type === 'text';
  const textLines = wrapText(isQuote ? `“${body}”` : body, w - 40, 12.5, Math.max(1, Math.floor((height - 74) / 17)));
  let source = atom?.pageTitle || '';
  if (!source && atom?.sourceUrl) source = atom.sourceUrl.replace(/^https?:\/\//, '').split('/')[0];

  return (
    `<g${rotateAttr(box)}>` +
    `<rect x="${n.x}" y="${n.y}" width="${w}" height="${height}" rx="16" fill="${pal.card}" stroke="${pal.cardStroke}" stroke-width="1.5"/>` +
    `<text x="${n.x + 16}" y="${n.y + 26}" font-family="monospace" font-size="10" font-weight="bold" fill="${pal.label}">${escapeXml(type)}</text>` +
    textBlock(textLines, n.x + 16, n.y + 48, 12.5, pal.text, 'start', '400', 1.36) +
    (source ? `<text x="${n.x + 16}" y="${n.y + height - 14}" font-family="monospace" font-size="10" fill="${pal.muted}">${escapeXml(source.slice(0, 48))}</text>` : '') +
    `</g>`
  );
}

function folderSvg(f: CanvasFolder, theme: 'dark' | 'light'): string {
  const pal = PALETTE[theme];
  const token = (f.color || '').split(' ').find((c) => c.startsWith('border-')) || '';
  const name = token.replace('border-', '').split('-')[0];
  const stroke = SECTION_HEX[name] || SECTION_HEX.slate;
  return (
    `<rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" rx="24" fill="none" stroke="${stroke}" stroke-opacity="0.6" stroke-width="2"/>` +
    `<text x="${f.x + 12}" y="${f.y - 8}" font-family="sans-serif" font-size="12" font-weight="600" fill="${pal.sectionText}">${escapeXml(f.title)}</text>`
  );
}

function connectorSvg(c: CanvasConnector, boxes: Map<string, Box>): string {
  const a = boxes.get(c.fromId);
  const b = boxes.get(c.toId);
  if (!a || !b) return '';
  const fromPort = c.fromPort || 'right';
  const toPort = c.toPort || 'left';
  const p1 = portPoint(a, fromPort);
  const p2 = portPoint(b, toPort);
  const dist = Math.max(Math.abs(p2.x - p1.x) * 0.5, Math.abs(p2.y - p1.y) * 0.5, 50);
  const ctrl = (p: { x: number; y: number }, port: string) => ({
    x: p.x + (port === 'right' ? dist : port === 'left' ? -dist : 0),
    y: p.y + (port === 'bottom' ? dist : port === 'top' ? -dist : 0),
  });
  const c1 = ctrl(p1, fromPort);
  const c2 = ctrl(p2, toPort);
  const d = c.style === 'straight' ? `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}` : `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  const color = c.color || '#325FEC';
  const dash = c.lineType === 'dashed' ? ' stroke-dasharray="6,5"' : '';
  // arrow head at the end, pointing along the last stretch of the line
  const lastFrom = c.style === 'straight' ? p1 : c2;
  const ang = Math.atan2(p2.y - lastFrom.y, p2.x - lastFrom.x);
  const head = `<polygon points="${p2.x},${p2.y} ${p2.x - 10 * Math.cos(ang - 0.4)},${p2.y - 10 * Math.sin(ang - 0.4)} ${p2.x - 10 * Math.cos(ang + 0.4)},${p2.y - 10 * Math.sin(ang + 0.4)}" fill="${color}"/>`;
  return `<path d="${d}" stroke="${color}" stroke-width="2" fill="none"${dash}/>${c.hasArrow === false ? '' : head}`;
}

export function buildCanvasSvg(input: BuildSvgInput): BuiltSvg {
  const theme = input.theme || 'dark';
  const pal = PALETTE[theme];
  const padding = input.padding ?? 60;
  const heightOf = (n: CanvasAtomNode) => input.nodeHeights?.[n.instanceId] ?? n.height ?? 120;

  const boxes = new Map<string, Box>();
  input.nodes.forEach((n) => boxes.set(n.instanceId, { x: n.x, y: n.y, width: n.width || 340, height: heightOf(n), rotation: n.rotation }));
  input.shapes.forEach((s) => boxes.set(s.id, { x: s.x, y: s.y, width: s.width, height: s.height, rotation: s.rotation }));
  input.folders.forEach((f) => boxes.set(f.id, { x: f.x, y: f.y, width: f.width, height: f.height, rotation: 0 }));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (b: Box, extraTop = 0) => {
    const bb = boxBounds(b);
    minX = Math.min(minX, bb.minX);
    minY = Math.min(minY, bb.minY - extraTop);
    maxX = Math.max(maxX, bb.maxX);
    maxY = Math.max(maxY, bb.maxY);
  };
  boxes.forEach((b, id) => grow(b, input.folders.some((f) => f.id === id) ? 24 : 0));
  input.drawings.forEach((d) => d.points.forEach((p) => grow({ x: p.x - d.strokeWidth, y: p.y - d.strokeWidth, width: d.strokeWidth * 2, height: d.strokeWidth * 2 })));

  const empty = minX === Infinity;
  if (empty) {
    minX = 0;
    minY = 0;
    maxX = 400;
    maxY = 300;
  }
  const width = Math.max(maxX - minX + padding * 2, 200);
  const height = Math.max(maxY - minY + padding * 2, 150);

  // Items from back to front: the same order they are stacked on the canvas
  const stack: Array<{ z: number; svg: string }> = [];
  input.shapes.forEach((s, i) => stack.push({ z: s.zIndex ?? 10 + i, svg: shapeSvg(s, theme) }));
  input.nodes.forEach((n, i) =>
    stack.push({ z: n.zIndex ?? 10 + input.shapes.length + i, svg: atomSvg(n, input.atoms.get(n.atomId), heightOf(n), theme) })
  );
  stack.sort((a, b) => a.z - b.z);

  const drawings = input.drawings
    .filter((d) => d.points.length > 1)
    .map((d) => {
      const path = d.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return `<path d="${path}" stroke="${d.color}" stroke-width="${d.strokeWidth}" stroke-opacity="${d.tool === 'highlighter' ? 0.35 : 1}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${pal.bg}"/>` +
    `<g transform="translate(${padding - minX}, ${padding - minY})">` +
    input.folders.map((f) => folderSvg(f, theme)).join('') +
    input.connectors.map((c) => connectorSvg(c, boxes)).join('') +
    stack.map((i) => i.svg).join('') +
    drawings +
    `</g></svg>`;

  return { svg, width, height, empty };
}
