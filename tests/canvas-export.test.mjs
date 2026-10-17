import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCanvasSvg, wrapText, escapeXml } from '../src/lib/canvas/exportSvg.ts';

const base = { nodes: [], folders: [], shapes: [], connectors: [], drawings: [], atoms: new Map() };
const shape = (extra) => ({ id: 's1', type: 'rectangle', text: '', color: '', strokeColor: '#325FEC', strokeWidth: 2, x: 100, y: 100, width: 200, height: 100, ...extra });

test('an empty canvas is reported as empty', () => {
  assert.equal(buildCanvasSvg(base).empty, true);
});

test('text is escaped and wrapped inside a shape', () => {
  assert.equal(escapeXml('a < b & "c"'), 'a &lt; b &amp; &quot;c&quot;');
  const lines = wrapText('one two three four five six seven eight nine ten', 100, 12);
  assert.ok(lines.length > 1);
  assert.ok(lines.every((l) => l.length <= Math.floor(100 / (12 * 0.56))));
  const out = buildCanvasSvg({ ...base, shapes: [shape({ text: 'Fish & chips <b>' })] });
  assert.ok(out.svg.includes('Fish &amp; chips &lt;b&gt;'));
  assert.equal(out.empty, false);
});

test('every shape type is drawn as its own element, not a box', () => {
  const types = { circle: '<circle', ellipse: '<ellipse', line: '<line', arrow: '<polygon', polygon: '<polygon', star: '<polygon', square: '<rect', rectangle: '<rect' };
  for (const [type, tag] of Object.entries(types)) {
    const out = buildCanvasSvg({ ...base, shapes: [shape({ type })] });
    assert.ok(out.svg.includes(tag), `${type} should use ${tag}`);
  }
});

test('a rotated item carries its rotation around its centre', () => {
  const out = buildCanvasSvg({ ...base, shapes: [shape({ rotation: 30 })] });
  assert.ok(out.svg.includes('rotate(30 200 150)'));
});

test('the drawing grows to hold a rotated item', () => {
  const flat = buildCanvasSvg({ ...base, shapes: [shape({ width: 400, height: 40 })] });
  const turned = buildCanvasSvg({ ...base, shapes: [shape({ width: 400, height: 40, rotation: 90 })] });
  assert.ok(turned.height > flat.height);
  assert.ok(turned.width < flat.width);
});

test('a section is an outline with its name above, no fill', () => {
  const out = buildCanvasSvg({ ...base, folders: [{ id: 'f1', title: 'Findings', color: 'border-emerald-500/50 bg-emerald-500/5', x: 0, y: 0, width: 300, height: 200 }] });
  assert.ok(out.svg.includes('fill="none"'));
  assert.ok(out.svg.includes('#10B981'));
  assert.ok(out.svg.includes('>Findings<'));
});

test('atom cards use their text and their measured height', () => {
  const nodes = [{ instanceId: 'n1', atomId: 'a1', x: 0, y: 0, width: 340 }];
  const atoms = new Map([['a1', { type: 'quote', text: 'A short quote', pageTitle: 'Example page' }]]);
  const out = buildCanvasSvg({ ...base, nodes, atoms, nodeHeights: { n1: 250 } });
  assert.ok(out.svg.includes('QUOTE'));
  assert.ok(out.svg.includes('A short quote'));
  assert.ok(out.svg.includes('height="250"'));
});

test('connectors draw between the ports of the items they join', () => {
  const shapes = [shape({ id: 'a', x: 0, y: 0 }), shape({ id: 'b', x: 500, y: 0 })];
  const connectors = [{ id: 'c1', fromId: 'a', toId: 'b', fromPort: 'right', toPort: 'left', style: 'curved', hasArrow: true, color: '#325FEC' }];
  const out = buildCanvasSvg({ ...base, shapes, connectors });
  assert.ok(out.svg.includes('M 200 50 C'));
  const none = buildCanvasSvg({ ...base, shapes, connectors: [{ ...connectors[0], toId: 'gone' }] });
  assert.ok(!none.svg.includes('M 200 50'));
});

test('items are stacked back to front by their z values', () => {
  const shapes = [shape({ id: 'low', zIndex: 20, text: 'LOW' }), shape({ id: 'high', zIndex: 30, text: 'HIGH' })];
  const out = buildCanvasSvg({ ...base, shapes });
  assert.ok(out.svg.indexOf('LOW') < out.svg.indexOf('HIGH'));
});

test('highlighter strokes are see-through and pen strokes are not', () => {
  const drawings = [
    { id: 'd1', tool: 'highlighter', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#F59E0B', strokeWidth: 14 },
    { id: 'd2', tool: 'pen', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#325FEC', strokeWidth: 3 },
  ];
  const out = buildCanvasSvg({ ...base, drawings });
  assert.ok(out.svg.includes('stroke-opacity="0.35"'));
  assert.ok(out.svg.includes('stroke-opacity="1"'));
});
