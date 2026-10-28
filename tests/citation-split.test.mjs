import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCitationsSplit, renderCitations, markerText } from '../src/lib/citations/inText.ts';
import { clipToNodes } from '../src/lib/paper/docModel.ts';

const rec = (family, year, title) => ({ status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', doi: `10.1/${family}`, title, authors: [{ family, given: 'A' }], journal: 'J Test', year, volume: '1', pages: '1-9', missingFields: [] });
const lee = { sourceId: 'c1', record: rec('Lee', 2020, 'Gait') };
const kim = { sourceId: 'c2', record: rec('Kim', 2021, 'Balance') };

test('numbered text with an APA reference list: numbers in the text, APA rows in order of first use', () => {
  const r = renderCitationsSplit('numbered', 'apa', [[lee], [kim, lee]]);
  assert.equal(markerText(r.markers[0]), '[1]');
  assert.match(markerText(r.markers[1]), /1.*2/);
  assert.deepEqual(r.references.map((x) => x.label), ['[1]', '[2]']);
  assert.ok(r.references[0].text.includes('Lee'));
  assert.ok(r.references[0].text.includes('(2020)'), 'the row is written in APA, not IEEE');
});

test('author-date text with a Vancouver reference list: author and year in the text, a numbered style written alphabetical rows', () => {
  const r = renderCitationsSplit('author-date', 'vancouver', [[lee], [kim]]);
  assert.match(markerText(r.markers[0]), /Lee/);
  assert.match(markerText(r.markers[0]), /2020/);
  assert.deepEqual(r.references.map((x) => x.label), ['', '']);
  assert.ok(r.references[0].text.includes('Kim'), 'alphabetical: Kim before Lee');
});

test('a split that matches the style is the style itself', () => {
  const a = renderCitationsSplit('author-date', 'harvard', [[lee]]);
  const b = renderCitations('harvard', [[lee]]);
  assert.deepEqual(a, b);
});

test('a note written in Researchie AI places its text with one marker for every cited clip; a clip already in the paper keeps its number', () => {
  const note = { id: 'n1', text: 'My own words about gait.\n\nA second paragraph.', kind: 'mine', sourceIds: ['c1', 'c2'] };
  const infos = [{ id: 'c1', text: 'q', kind: 'quote', record: lee.record }, { id: 'c2', text: 'q', kind: 'quote', record: kim.record }];
  const first = clipToNodes(note, { lee20: 'c1' }, infos);
  assert.equal(first.nodes.length, 2);
  const last = first.nodes[1].content.at(-1);
  assert.equal(last.type, 'citation');
  assert.equal(last.attrs.keys.length, 2);
  assert.equal(Object.values(first.cites).filter((v) => v === 'c1').length, 1, 'c1 reuses its key');
  assert.equal(Object.values(first.cites).filter((v) => v === 'c2').length, 1, 'c2 is added');
  const none = clipToNodes(note, {}, []);
  assert.equal(none.nodes[1].content.at(-1).type, 'text');
});
