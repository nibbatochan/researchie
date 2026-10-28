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
// a source of its own: clips of one paper are merged, so sources that must stay apart need their own title
const distinct = (id, page) => src(id, { title: `Paper ${id}` }, page);

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
  const out = renderCitations('ieee', [[distinct('b')], [distinct('a')], [distinct('b')]]);
  assert.deepEqual(out.markers.map(markerText), ['[1]', '[2]', '[1]']);
  assert.deepEqual(out.references.map((r) => [r.label, r.sourceId]), [['[1]', 'b'], ['[2]', 'a']]);
});

test('IEEE: several numbers are listed one by one, with no range, as in the ieee.csl style', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const first = renderCitations('ieee', [ids.map((id) => distinct(id))]);
  assert.equal(markerText(first.markers[0]), '[1], [2], [3], [4], [5]');
  const gaps = renderCitations('ieee', [ids.map((id) => distinct(id)), [distinct('a'), distinct('c'), distinct('d')]]);
  assert.equal(markerText(gaps.markers[1]), '[1], [3], [4]');
});

test('IEEE: a page number keeps each number separate: [1, p. 14]', () => {
  const out = renderCitations('ieee', [[distinct('a', 14), distinct('b')]]);
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

test('two clips of one paper are listed once, in both styles', () => {
  const twin = (id) => src(id); // same DOI, title, year and first author
  for (const style of ['ieee', 'harvard']) {
    const out = renderCitations(style, [[twin('a')], [twin('b')]]);
    assert.equal(out.references.length, 1, style);
    assert.equal(markerText(out.markers[0]), markerText(out.markers[1]), style);
  }
});

// ---- APA, Vancouver, AMA
const three = (id, family, year, extra = {}) => src(id, { title: `Paper ${id}`, year, authors: [{ family, given: 'A' }], doi: `10.1/${id}`, ...extra });
const markers = (style, groups) => renderCitations(style, groups).markers.map(markerText);

test('APA in text: & between two authors, et al. from three, alphabetical inside one bracket, page as p.', () => {
  const two = src('a'); // Lee and Patel
  assert.equal(markers('apa', [[two]])[0], '(Lee & Patel, 2020)');
  const many = src('m', { title: 'Many', authors: [{ family: 'Kim' }, { family: 'Lee' }, { family: 'Ng' }], doi: '10.1/m' });
  assert.equal(markers('apa', [[many]])[0], '(Kim et al., 2020)');
  const abe = three('x', 'Abe', 2018);
  const zed = three('y', 'Zed', 2010);
  assert.equal(markers('apa', [[zed, abe]])[0], '(Abe, 2018; Zed, 2010)'); // alphabetical, not oldest first
  assert.equal(markers('apa', [[{ ...abe, page: 14 }]])[0], '(Abe, 2018, p. 14)');
});

test('APA: two papers by one author in one year get a and b in the text and in the list', () => {
  const x = three('x', 'Abe', 2018);
  const y = three('y', 'Abe', 2018);
  const out = renderCitations('apa', [[x], [y]]);
  assert.deepEqual(out.markers.map(markerText), ['(Abe, 2018a)', '(Abe, 2018b)']);
  assert.ok(out.references[0].text.includes('(2018a)'));
  assert.ok(out.references[1].text.includes('(2018b)'));
  assert.equal(out.references.length, 2);
});

test('Vancouver: numbers in round brackets, in order of first citation, ranges of three or more collapse', () => {
  const s = ['a', 'b', 'c', 'd', 'e'].map((id) => three(id, `F${id}`, 2020));
  assert.equal(markers('vancouver', [[s[0]]])[0], '(1)');
  assert.equal(markers('vancouver', [s])[0], '(1-5)');
  assert.equal(markers('vancouver', [[s[0], s[1]]])[0], '(1,2)'); // two in a row stay apart
  assert.equal(markers('vancouver', [s, [s[0], s[2], s[3], s[4]]])[1], '(1,3-5)');
  assert.equal(markers('vancouver', [[{ ...s[0], page: 14 }]])[0], '(1 p. 14)');
  const refs = renderCitations('vancouver', [s]).references;
  assert.deepEqual(refs.map((r) => r.label), ['1.', '2.', '3.', '4.', '5.']);
  assert.ok(!/^\[/.test(refs[0].text));
});

test('AMA: superscript numbers, ranges, no page in the text', () => {
  const s = ['a', 'b', 'c', 'd'].map((id) => three(id, `F${id}`, 2020));
  assert.equal(markers('ama', [[s[0]]])[0], '¹');
  assert.equal(markers('ama', [s])[0], '¹⁻⁴');
  assert.equal(markers('ama', [s, [s[0], s[2]]])[1], '¹,³');
  assert.equal(markers('ama', [[{ ...s[0], page: 14 }]])[0], '¹');
  const refs = renderCitations('ama', [s]).references;
  assert.equal(refs[0].label, '1.');
});

test('every marker part that names a source points at a listed reference, in every style', () => {
  const s = ['a', 'b', 'c'].map((id) => three(id, `F${id}`, 2020));
  for (const style of ['harvard', 'apa', 'ieee', 'vancouver', 'ama']) {
    const out = renderCitations(style, [s, [s[1]]]);
    const ids = new Set(out.references.map((r) => r.sourceId));
    for (const m of out.markers) for (const part of m) if (part.sourceId) assert.ok(ids.has(part.sourceId), `${style}: ${part.text}`);
  }
});

// ---- MLA 9 and Chicago author-date
import { formatMla } from '../src/lib/citations/mla.ts';
import { formatChicago } from '../src/lib/citations/chicago.ts';

test('MLA works-cited entry for a journal article', () => {
  assert.equal(
    formatMla(rec()),
    'Lee, Jane Alice, and Raj Patel. "Sleep and memory in adults." Journal of Examples, vol. 12, no. 3, 2020, pp. 45-67, https://doi.org/10.1000/xyz.',
  );
});

test('MLA: three or more authors give the first and et al.; no author starts with the title', () => {
  const many = rec({ authors: [{ family: 'Kim', given: 'D' }, { family: 'Lee', given: 'C' }, { family: 'Ng', given: 'E' }] });
  assert.ok(formatMla(many).startsWith('Kim, D, et al. "Sleep'));
  assert.ok(formatMla(rec({ authors: [] })).startsWith('"Sleep and memory in adults."'));
});

test('Chicago author-date entry for a journal article', () => {
  assert.equal(
    formatChicago(rec()),
    'Lee, Jane Alice, and Raj Patel. 2020. "Sleep and memory in adults." Journal of Examples 12 (3): 45–67. https://doi.org/10.1000/xyz.',
  );
});

test('Chicago: more than ten authors give the first seven and et al.', () => {
  const eleven = Array.from({ length: 11 }, (_, i) => ({ family: `F${i + 1}`, given: `G${i + 1}` }));
  const text = formatChicago(rec({ authors: eleven }));
  assert.ok(text.startsWith('F1, G1, G2 F2, G3 F3, G4 F4, G5 F5, G6 F6, G7 F7, et al. 2020.'), text);
});

test('MLA in text: author and page, no year; et al. from three; alphabetical', () => {
  const two = src('a');
  assert.equal(markers('mla', [[two]])[0], '(Lee and Patel)');
  assert.equal(markers('mla', [[{ ...two, page: 14 }]])[0], '(Lee and Patel 14)');
  const many = src('m', { title: 'Many', authors: [{ family: 'Kim' }, { family: 'Lee' }, { family: 'Ng' }], doi: '10.1/m' });
  assert.equal(markers('mla', [[many]])[0], '(Kim et al.)');
  const abe = three('x', 'Abe', 2018);
  const zed = three('y', 'Zed', 2010);
  assert.equal(markers('mla', [[zed, abe]])[0], '(Abe; Zed)');
});

test('Chicago in text: author year, page after a comma, et al. from four', () => {
  assert.equal(markers('chicago', [[src('a')]])[0], '(Lee and Patel 2020)');
  assert.equal(markers('chicago', [[{ ...src('a'), page: 14 }]])[0], '(Lee and Patel 2020, 14)');
  const three3 = src('t', { title: 'T', authors: [{ family: 'Kim' }, { family: 'Lee' }, { family: 'Ng' }], doi: '10.1/t' });
  assert.equal(markers('chicago', [[three3]])[0], '(Kim, Lee, and Ng 2020)');
  const four = src('f', { title: 'F', authors: [{ family: 'A' }, { family: 'B' }, { family: 'C' }, { family: 'D' }], doi: '10.1/f' });
  assert.equal(markers('chicago', [[four]])[0], '(A et al. 2020)');
});

test('Chicago: two papers by one author in one year take a and b', () => {
  const out = renderCitations('chicago', [[three('x', 'Abe', 2018)], [three('y', 'Abe', 2018)]]);
  assert.deepEqual(out.markers.map(markerText), ['(Abe 2018a)', '(Abe 2018b)']);
  assert.ok(out.references[0].text.includes('2018a.'));
});

test('MLA and Chicago lists are alphabetical and every marker points at a listed source', () => {
  const s = [three('c', 'Zed', 2001), three('a', 'Abe', 2002), three('b', 'Mia', 2003)];
  for (const style of ['mla', 'chicago']) {
    const out = renderCitations(style, [s]);
    assert.deepEqual(out.references.map((r) => r.text.slice(0, 3)), ['Abe', 'Mia', 'Zed'], style);
    const ids = new Set(out.references.map((r) => r.sourceId));
    for (const m of out.markers) for (const part of m) if (part.sourceId) assert.ok(ids.has(part.sourceId));
  }
});
