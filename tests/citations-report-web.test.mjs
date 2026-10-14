import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCrossrefWork } from '../src/lib/citations/crossref.ts';
import { formatVancouver } from '../src/lib/citations/vancouver.ts';
import { formatApa } from '../src/lib/citations/apa.ts';
import { toBibTeX } from '../src/lib/citations/export.ts';
import { buildWebCitation } from '../src/lib/citations/webCitation.ts';

const CITED = new Date(2026, 9, 14); // 2026 Oct 14

const report = () => mapCrossrefWork({
  type: 'report',
  DOI: '10.1000/tr-2041',
  title: ['Coastal flood risk in the Gulf'],
  author: [{ given: 'Ada', family: 'Lovelace' }],
  institution: [{ name: 'National Coastal Agency' }],
  'alternative-id': ['TR-2041'],
  issued: { 'date-parts': [[2021]] },
});

test('a Crossref report takes its agency from institution when publisher is missing', () => {
  const r = report();
  assert.equal(r.sourceType, 'report');
  assert.equal(r.publisher, 'National Coastal Agency');
  assert.equal(r.reportNumber, 'TR-2041');
});

test('a report number is kept only for reports', () => {
  const article = mapCrossrefWork({ type: 'journal-article', title: ['X'], 'alternative-id': ['R1'], issued: { 'date-parts': [[2020]] } });
  assert.equal(article.reportNumber, undefined);
});

test('Vancouver report: agency, year, Report No., doi', () => {
  assert.equal(
    formatVancouver(report()),
    'Lovelace A. Coastal flood risk in the Gulf. National Coastal Agency; 2021. Report No.: TR-2041. doi:10.1000/tr-2041'
  );
});

test('APA report puts the report number after the title', () => {
  assert.equal(
    formatApa(report()),
    'Lovelace, A. (2021). Coastal flood risk in the Gulf (Report No. TR-2041). National Coastal Agency. https://doi.org/10.1000/tr-2041'
  );
});

test('BibTeX report uses the report number in the number field', () => {
  assert.match(toBibTeX(report()), /number = \{TR-2041\}/);
});

test('Vancouver web page shows the update date with the cited date', () => {
  const r = buildWebCitation(
    { url: 'https://example.org/guide', title: 'Field guide', siteName: 'Example Org', author: 'Jane Doe', published: '2024-05-01', updated: '2025-02-09T08:00:00Z' },
    '2026-10-14T00:00:00Z',
  );
  assert.equal(r.updatedAt, '2025-02-09');
  assert.equal(
    formatVancouver(r, { citedOn: CITED }),
    'Example Org [Internet]. Field guide; 2024 [updated 2025 Feb 9; cited 2026 Oct 14]. Available from: https://example.org/guide'
  );
});

test('a web page without an update date keeps the plain cited form', () => {
  const r = buildWebCitation({ url: 'https://example.org/x', title: 'Piece', siteName: 'Example Org', published: '2024-05-01' }, '2026-10-14T00:00:00Z');
  assert.equal(r.updatedAt, undefined);
  assert.equal(
    formatVancouver(r, { citedOn: CITED }),
    'Example Org [Internet]. Piece; 2024 [cited 2026 Oct 14]. Available from: https://example.org/x'
  );
});

test('an unreadable update date is dropped, not guessed', () => {
  const r = buildWebCitation({ url: 'https://example.org/x', title: 'Piece', updated: 'last tuesday' }, '2026-10-14T00:00:00Z');
  assert.equal(r.updatedAt, undefined);
});

test('a place of publication is shown on a web page when the record has one', () => {
  const r = buildWebCitation({ url: 'https://example.org/x', title: 'Piece', siteName: 'Example Org', published: '2024-05-01' }, '2026-10-14T00:00:00Z');
  r.publisherPlace = 'Atlanta (GA)';
  assert.match(formatVancouver(r, { citedOn: CITED }), /^Atlanta \(GA\): Example Org \[Internet\]\./);
});

test('a DOI or URL in alternative-id is not mistaken for a report number', () => {
  const r = mapCrossrefWork({ type: 'report', title: ['X'], 'alternative-id': ['10.1000/abc', 'https://example.org/x'], issued: { 'date-parts': [[2020]] } });
  assert.equal(r.reportNumber, undefined);
});
