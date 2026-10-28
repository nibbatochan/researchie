import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMarkers } from '../src/lib/paper/markers.ts';
import { getTemplate } from '../src/lib/paper/templates.ts';
import { defaultMeta, upgradeMeta } from '../src/lib/paper/docModel.ts';

const rec = (t) => ({ type: 'article', title: t, authors: [{ family: 'Rao' }], year: '2020' });
const sources = { clips: new Map([['c1', { id: 'c1', record: rec('One') }], ['c2', { id: 'c2', record: rec('Two') }]]), manual: [] };
const pm = { type: 'doc', content: [] };

test('a listed source shows in References with no marker in the text', () => {
  const r = computeMarkers(pm, {}, sources, 'ieee', ['c1', 'c2']);
  assert.equal(r.markers.length, 0);
  assert.equal(r.references.length, 2);
});

test('an unknown listed id is skipped', () => {
  assert.equal(computeMarkers(pm, {}, sources, 'ieee', ['gone']).references.length, 0);
});

test('old papers get an empty listed array', () => {
  assert.deepEqual(upgradeMeta({}, getTemplate('conference'), 'X').listed, []);
  assert.deepEqual(defaultMeta(getTemplate('conference'), 'X').listed, []);
});

test('two clips of one paper are listed once, and numbered once', () => {
  const same = { type: 'article', title: 'Sleep and memory', authors: [{ family: 'Lee' }], year: '2020', doi: '10.1/abc' };
  const s = { clips: new Map([['a', { id: 'a', record: same }], ['b', { id: 'b', record: { ...same, doi: 'https://doi.org/10.1/ABC' } }], ['c', { id: 'c', record: rec('Other') }]]), manual: [] };
  const r = computeMarkers(pm, {}, s, 'ieee', ['a', 'b', 'c']);
  assert.equal(r.references.length, 2);
  assert.deepEqual(r.references.map((x) => x.label), ['[1]', '[2]']);
});

test('without a DOI, same title, year and first author is the same paper', () => {
  const a = { type: 'article', title: 'Sleep, and Memory!', authors: [{ family: 'Lee' }], year: '2020' };
  const b = { type: 'article', title: 'sleep and memory', authors: [{ family: 'LEE' }], year: '2020' };
  const s = { clips: new Map([['a', { id: 'a', record: a }], ['b', { id: 'b', record: b }]]), manual: [] };
  assert.equal(computeMarkers(pm, {}, s, 'ieee', ['a', 'b']).references.length, 1);
  const other = { ...b, year: '2021' };
  const s2 = { clips: new Map([['a', { id: 'a', record: a }], ['b', { id: 'b', record: other }]]), manual: [] };
  assert.equal(computeMarkers(pm, {}, s2, 'ieee', ['a', 'b']).references.length, 2);
});
