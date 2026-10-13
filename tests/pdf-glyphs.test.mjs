// Run: node --test --no-warnings tests/pdf-glyphs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForPdf, splitRuns, findUnsupportedCharacters } from '../src/lib/export/pdf/glyphs.ts';

test('normalizeForPdf maps dashes and spaces, removes invisible characters', () => {
  assert.equal(normalizeForPdf('data\u2011driven a\u2010b c\u2012d e\u2043f'), 'data-driven a-b c-d e-f');
  assert.equal(normalizeForPdf('co\u00ADop a\u200Bb\u200Cc\u200Dd\u2060e\uFEFFf'), 'coop abcdef');
  assert.equal(normalizeForPdf('1\u202F2\u20073\u20094\u200A5'), '1 2 3 4 5');
  assert.equal(normalizeForPdf('Möller – “x” ≥'), 'Möller – “x” ≥');
});

test('splitRuns keeps Latin text in the primary font', () => {
  assert.deepEqual(splitRuns('Möller – “quoted”\nnext', 'figtree'), [{ text: 'Möller – “quoted”\nnext', fallback: false }]);
  assert.deepEqual(splitRuns('', 'mono'), []);
});

test('splitRuns sends missing characters to the fallback and merges neighbours', () => {
  assert.deepEqual(splitRuns('size 5 μm, ≥ 5', 'figtree'), [
    { text: 'size 5 ', fallback: false },
    { text: 'μ', fallback: true },
    { text: 'm, ', fallback: false },
    { text: '≥', fallback: true },
    { text: ' 5', fallback: false },
  ]);
  assert.deepEqual(splitRuns('αβγ', 'mono'), [{ text: 'αβγ', fallback: true }]);
});

test('splitRuns keeps a letter and its combining mark together', () => {
  const runs = splitRuns('aK\u0302b', 'figtree');
  const joined = runs.map((r) => r.text).join('');
  assert.equal(joined, 'aK\u0302b');
  const k = runs.find((r) => r.text.includes('K'));
  assert.ok(k.text.includes('\u0302'), 'mark stays in the same run as its base');
  // A mark the primary font lacks moves the whole cluster to the fallback.
  assert.equal(splitRuns('y\u0302', 'figtree').every((r) => r.fallback), true);
});

test('splitRuns turns characters no font has into U+FFFD', () => {
  assert.deepEqual(splitRuns('a研究b', 'figtree'), [
    { text: 'a', fallback: false },
    { text: '\uFFFD\uFFFD', fallback: true },
    { text: 'b', fallback: false },
  ]);
});

test('findUnsupportedCharacters lists what nothing can draw, sorted and capped', () => {
  const item = (o) => ({ id: 'x', kind: 'note', title: '', body: '', isAi: false, tags: [], flags: [], ...o });
  const model = {
    cover: { title: 'T 研', description: 'μ ≥ data\u2011driven', generatedAt: '', clipCount: 0, sourceCount: 0, styleLabel: '' },
    sections: [{ key: 'quotes', title: 'Q', items: [item({ body: '究 究', notes: '𠀀', tags: ['語'], ocrText: '文', source: { label: '字' } })] }],
    bibliography: [{ number: 1, text: '漢', status: 'web', flags: [{ kind: 'verify', text: '日' }], citedBy: [] }],
    options: {},
  };
  const out = findUnsupportedCharacters(model);
  assert.deepEqual(out, [...out].sort());
  for (const ch of ['研', '究', '𠀀', '語', '文', '字', '漢', '日']) assert.ok(out.includes(ch), ch);
  assert.ok(!out.includes('μ') && !out.includes('≥') && !out.includes('\u2011'));
  const many = item({ body: Array.from({ length: 30 }, (_, i) => String.fromCodePoint(0x4e00 + i)).join('') });
  assert.equal(findUnsupportedCharacters({ ...model, sections: [{ key: 'quotes', title: '', items: [many] }], bibliography: [] }).length, 12);
});
