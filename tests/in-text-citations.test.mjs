// Run: node --test --no-warnings tests/in-text-citations.test.mjs
// Harvard and IEEE: reference text, in-text markers, numbering, disambiguation, locators. Sources are made up.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatHarvard } from '../src/lib/citations/harvard.ts';
import { formatIeee } from '../src/lib/citations/ieee.ts';
import { renderCitations, markerText } from '../src/lib/citations/inText.ts';

const rec = (over = {}) => ({
  status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [],
  title: 'Sleep and memory in adults', journal: 'Journal of Examples', volume: '12', issue: '3', pages: '45-67', year: 2020,
  doi: '10.1000/xyz', authors: [{ family: 'Lee', given: 'Jane Alice' }, { family: 'Patel', given: 'Raj' }], ...over,
});
const src = (id, over, page) => ({ sourceId: id, record: rec(over), page });

test('Harvard reference: author-date layout with initials, quoted title and pages', () => {
  assert.equal(
    formatHarvard(rec()),
    "Lee, J.A. and Patel, R. (2020) 'Sleep and memory in adults', Journal of Examples, 12(3), pp. 45–67. Available at: https://doi.org/10.1000/xyz",
  );
});

test('IEEE reference: initials first, numbered-style layout', () => {
  assert.equal(
    formatIeee(rec()),
    'J. A. Lee and R. Patel, "Sleep and memory in adults," Journal of Examples, vol. 12, no. 3, pp. 45–67, 2020, doi: 10.1000/xyz.',
  );
});

test('missing fields show as incomplete, never guessed; unknown source types return null', () => {
  assert.match(formatHarvard(rec({ journal: undefined })), /\[incomplete: journal\]/);
  assert.match(formatIeee(rec({ year: undefined })), /\[incomplete: year\]/);
  assert.equal(formatHarvard(rec({ sourceType: 'unknown' })), null);
  assert.equal(formatIeee(rec({ sourceType: 'unknown' })), null);
});

test('Harvard markers: one, two, three and four authors', () => {
  const a = (n) => Array.from({ length: n }, (_, i) => ({ family: ['Lee', 'Patel', 'Kim', 'Roy'][i], given: 'A' }));
  const marker = (n) => markerText(renderCitations('harvard', [[src('s', { authors: a(n) })]]).markers[0]);
  assert.equal(marker(1), '(Lee, 2020)');
  assert.equal(marker(2), '(Lee and Patel, 2020)');
  assert.equal(marker(3), '(Lee, Patel and Kim, 2020)');
  assert.equal(marker(4), '(Lee et al., 2020)');
});

test('Harvard: several sources in one bracket, oldest first; page for a direct quote', () => {
  const out = renderCitations('harvard', [[
    src('new', { authors: [{ family: 'Zed' }], year: 2022, title: 'N' }),
    src('old', { authors: [{ family: 'Abe' }], year: 2019, title: 'O' }, 14),
  ]]);
  assert.equal(markerText(out.markers[0]), '(Abe, 2019, p. 14; Zed, 2022)');
});

test('Harvard: same author and year get a, b in marker and reference; list is alphabetical', () => {
  const out = renderCitations('harvard', [[src('x', { title: 'Beta study' })], [src('y', { title: 'Alpha study' })], [src('z', { authors: [{ family: 'Aaron' }], title: 'Other' })]]);
  assert.equal(markerText(out.markers[0]), '(Lee and Patel, 2020b)');
  assert.equal(markerText(out.markers[1]), '(Lee and Patel, 2020a)');
  assert.match(out.references[0].text, /^Aaron/);
  assert.match(out.references[1].text, /\(2020a\) 'Alpha study'/);
  assert.match(out.references[2].text, /\(2020b\) 'Beta study'/);
});

test('IEEE: numbers follow first citation and the same source keeps its number', () => {
  const out = renderCitations('ieee', [[src('b')], [src('a')], [src('b')]]);
  assert.deepEqual(out.markers.map(markerText), ['[1]', '[2]', '[1]']);
  assert.deepEqual(out.references.map((r) => [r.label, r.sourceId]), [['[1]', 'b'], ['[2]', 'a']]);
});

test('IEEE: several numbers are listed one by one, with no range, as in the ieee.csl style', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const first = renderCitations('ieee', [ids.map((id) => src(id))]);
  assert.equal(markerText(first.markers[0]), '[1], [2], [3], [4], [5]');
  const gaps = renderCitations('ieee', [ids.map((id) => src(id)), [src('a'), src('c'), src('d')]]);
  assert.equal(markerText(gaps.markers[1]), '[1], [3], [4]');
});

test('IEEE: a page number keeps each number separate: [1, p. 14]', () => {
  const out = renderCitations('ieee', [[src('a', {}, 14), src('b')]]);
  assert.equal(markerText(out.markers[0]), '[1, p. 14], [2]');
});

test('every linked part names the source it points to', () => {
  const out = renderCitations('harvard', [[src('a'), src('b', { year: 2021 })]]);
  assert.deepEqual(out.markers[0].filter((p) => p.sourceId).map((p) => p.sourceId), ['a', 'b']);
});

test('a source with no formatter is flagged incomplete in the list', () => {
  const out = renderCitations('ieee', [[src('a', { sourceType: 'unknown' })]]);
  assert.equal(out.references[0].incomplete, true);
  assert.match(out.references[0].text, /has no formatter/);
});

test('no groups gives no markers and no references', () => {
  assert.deepEqual(renderCitations('harvard', []), { markers: [], references: [] });
});

test('Harvard reference list: four or more authors become "first et al."; three are all listed', () => {
  const many = (n) => Array.from({ length: n }, (_, i) => ({ family: ['Lee', 'Patel', 'Kim', 'Roy', 'Zed'][i], given: 'A' }));
  assert.match(formatHarvard(rec({ authors: many(4) })), /^Lee, A\. et al\. \(2020\)/);
  assert.match(formatHarvard(rec({ authors: many(3) })), /^Lee, A\., Patel, A\. and Kim, A\. \(2020\)/);
});

test('Harvard in-text: years of one author join; a page number or another author keeps them apart', () => {
  const a = (id, year, page) => src(id, { authors: [{ family: 'Abe' }], year, title: id }, page);
  const z = src('z', { authors: [{ family: 'Zed' }], year: 2019, title: 'z' });
  assert.equal(markerText(renderCitations('harvard', [[a('a1', 2018), a('a2', 2019)]]).markers[0]), '(Abe, 2018, 2019)');
  assert.equal(markerText(renderCitations('harvard', [[a('a1', 2018), a('a2', 2019), z]]).markers[0]), '(Abe, 2018, 2019; Zed, 2019)');
  assert.equal(markerText(renderCitations('harvard', [[a('a1', 2018, 3), a('a2', 2019)]]).markers[0]), '(Abe, 2018, p. 3; Abe, 2019)');
  const parts = renderCitations('harvard', [[a('a1', 2018), a('a2', 2019)]]).markers[0].filter((p) => p.sourceId);
  assert.deepEqual(parts.map((p) => p.sourceId), ['a1', 'a2']);
});

test('IEEE uses the abbreviated journal title when there is one; preprints and datasets take the general layout', () => {
  assert.match(formatIeee(rec({ journalAbbrev: 'J. Ex.' })), /"Sleep and memory in adults," J\. Ex\., vol\. 12/);
  assert.equal(
    formatIeee(rec({ sourceType: 'preprint', journal: 'arXiv', doi: '10.48550/x', volume: undefined })),
    'J. A. Lee and R. Patel, "Sleep and memory in adults," arXiv, 2020, doi: 10.48550/x.',
  );
  assert.equal(
    formatIeee(rec({ sourceType: 'dataset', publisher: 'Zenodo', doi: undefined, url: 'https://zenodo.org/r/1' })),
    'J. A. Lee and R. Patel, "Sleep and memory in adults," Zenodo, 2020. [Online]. Available: https://zenodo.org/r/1',
  );
});
