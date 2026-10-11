// Run: node --test tests/citations.test.mjs
// Node strips the TypeScript types from the citation modules directly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractIdentifiers, normalizeDoi, isBibliographyTag } from '../src/lib/citations/identify.ts';
import { parseCrossrefResponse } from '../src/lib/citations/crossref.ts';
import { formatVancouver } from '../src/lib/citations/vancouver.ts';

const fixture = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../src/lib/citations/fixtures/${name}`, import.meta.url)), 'utf8'));

test('normalizeDoi strips the doi: prefix and trailing punctuation', () => {
  assert.equal(normalizeDoi('doi:10.1038/nature12373.'), '10.1038/nature12373');
  assert.equal(normalizeDoi('see https://doi.org/10.1038/nature12373, and more'), '10.1038/nature12373');
  assert.equal(normalizeDoi('no identifier here'), undefined);
});

test('extractIdentifiers reads citation_doi and citation_pmid', () => {
  const ids = extractIdentifiers([
    { name: 'citation_doi', content: '10.1038/nature12373' },
    { name: 'citation_pmid', content: '23903748' },
  ]);
  assert.deepEqual(ids, { doi: '10.1038/nature12373', pmid: '23903748' });
});

test('extractIdentifiers falls back to Dublin Core DOI', () => {
  const ids = extractIdentifiers([{ name: 'DC.identifier', content: 'https://doi.org/10.5281/zenodo.1234' }]);
  assert.equal(ids.doi, '10.5281/zenodo.1234');
});

test('extractIdentifiers ignores citation_reference tags entirely', () => {
  const ids = extractIdentifiers([
    { name: 'citation_reference', content: 'citation_journal_title=Nature; citation_doi=10.9999/wrong' },
  ]);
  assert.deepEqual(ids, { doi: undefined, pmid: undefined });
  assert.equal(isBibliographyTag('citation_reference'), true);
});

test('extractIdentifiers rejects a non-numeric PMID', () => {
  assert.equal(extractIdentifiers([{ name: 'citation_pmid', content: 'PMID: 23903748' }]).pmid, undefined);
});

test('Crossref response maps to a verified journal article', () => {
  const record = parseCrossrefResponse(fixture('crossref-nature12373.json'));
  assert.equal(record.status, 'verified_doi');
  assert.equal(record.sourceType, 'journal_article');
  assert.equal(record.resolvedFrom, 'crossref');
  assert.equal(record.doi, '10.1038/nature12373');
  assert.equal(record.title, 'Nanometre-scale thermometry in a living cell');
  assert.equal(record.journal, 'Nature');
  assert.equal(record.year, 2013); // issued, not published-print
  assert.equal(record.volume, '500');
  assert.equal(record.issue, '7460');
  assert.equal(record.pages, '54-58');
  assert.deepEqual(record.authors[0], { family: 'Kucsko', given: 'G.' });
  assert.deepEqual(record.missingFields, []);
  assert.equal(record.retracted, undefined); // no update-to field on this record
});

test('a Crossref record missing volume is marked incomplete, not guessed', () => {
  const body = fixture('crossref-nature12373.json');
  delete body.message.volume;
  const record = parseCrossrefResponse(body);
  assert.equal(record.status, 'incomplete');
  assert.deepEqual(record.missingFields, ['volume']);
  assert.equal(record.volume, undefined);
});

test('a retraction notice in update-to sets retracted', () => {
  const body = fixture('crossref-nature12373.json');
  body.message['update-to'] = [{ DOI: '10.1038/nature12373', type: 'retraction' }];
  assert.equal(parseCrossrefResponse(body).retracted, true);
});

test('Vancouver formats the verified journal article', () => {
  const record = parseCrossrefResponse(fixture('crossref-nature12373.json'));
  record.journalAbbrev = 'Nature'; // Crossref gives no short title for this record
  assert.equal(
    formatVancouver(record),
    'Kucsko G, Maurer PC, Yao NY, Kubo M, Noh HJ, Lo PK, et al. ' +
      'Nanometre-scale thermometry in a living cell. Nature. 2013;500(7460):54-58. ' +
      'doi:10.1038/nature12373'
  );
});

test('Vancouver lists up to six authors then et al', () => {
  const record = parseCrossrefResponse(fixture('crossref-nature12373.json'));
  record.authors = Array.from({ length: 6 }, (_, i) => ({ family: `A${i}`, given: 'B.' }));
  assert.match(formatVancouver(record), /^A0 B, A1 B, A2 B, A3 B, A4 B, A5 B\. /);
  record.authors.push({ family: 'A6', given: 'B.' });
  assert.match(formatVancouver(record), /^A0 B, A1 B, A2 B, A3 B, A4 B, A5 B, et al\. /);
});

test('Vancouver shows missing fields as incomplete', () => {
  const body = fixture('crossref-nature12373.json');
  delete body.message.issue;
  delete body.message.page;
  const out = formatVancouver(parseCrossrefResponse(body));
  assert.match(out, /;500:\[incomplete: pages\]\./);
});

test('Vancouver returns null for source types not yet verified', () => {
  const record = parseCrossrefResponse(fixture('crossref-nature12373.json'));
  record.sourceType = 'web_page';
  assert.equal(formatVancouver(record), null);
});

import { isCitationRecord, withCitation } from '../src/lib/citations/metadata.ts';

test('isCitationRecord accepts a resolved record and rejects malformed input', () => {
  const record = parseCrossrefResponse(fixture('crossref-nature12373.json'));
  assert.equal(isCitationRecord(record), true);
  assert.equal(isCitationRecord(null), false);
  assert.equal(isCitationRecord([]), false);
  assert.equal(isCitationRecord({ status: 'made_up', sourceType: 'journal_article', resolvedFrom: 'x', authors: [], missingFields: [] }), false);
  assert.equal(isCitationRecord({ status: 'manual', sourceType: 'web_page', resolvedFrom: 'manual', authors: 'nope', missingFields: [] }), false);
});

test('withCitation keeps existing metadata and replaces only the citation', () => {
  const record = parseCrossrefResponse(fixture('crossref-nature12373.json'));
  const merged = withCitation({ sourceUrl: 'https://example.com', citation: { status: 'manual' } }, record);
  assert.equal(merged.sourceUrl, 'https://example.com');
  assert.equal(merged.citation, record);
  assert.deepEqual(withCitation(undefined, record), { citation: record });
});

import { findPdfDoi } from '../src/lib/citations/pdf.ts';

test('findPdfDoi prefers a DOI in the PDF metadata', () => {
  const out = findPdfDoi({ title: 'Paper', keywords: 'doi:10.1038/nature12373' }, 'DOI 10.9999/other');
  assert.deepEqual(out, { doi: '10.1038/nature12373', source: 'pdf_metadata' });
});

test('findPdfDoi falls back to the first page text', () => {
  const out = findPdfDoi({ title: 'Paper' }, 'Nature 500, 54–58 (2013). https://doi.org/10.1038/nature12373.');
  assert.deepEqual(out, { doi: '10.1038/nature12373', source: 'first_page' });
});

test('findPdfDoi returns nothing when no DOI is present, so the user confirms', () => {
  assert.deepEqual(findPdfDoi({ title: 'Untitled' }, 'No identifier on this page.'), {});
});
