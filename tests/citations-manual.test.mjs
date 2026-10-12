// Run: node --test --no-warnings tests/citations-manual.test.mjs
// Builds a manual citation from the upload form. Pure: no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManualCitation, parseManualAuthors, parseManualYear, isValidManualYear } from '../src/lib/citations/manual.ts';
import { isCitationRecord } from '../src/lib/citations/metadata.ts';

test('authors split on commas into family names', () => {
  assert.deepEqual(parseManualAuthors('Smith, Jones ,  Lee'), [{ family: 'Smith' }, { family: 'Jones' }, { family: 'Lee' }]);
});

test('a single name with no comma is one family name', () => {
  assert.deepEqual(parseManualAuthors('Nakamoto'), [{ family: 'Nakamoto' }]);
});

test('empty author parts are dropped', () => {
  assert.deepEqual(parseManualAuthors(' , Smith,, '), [{ family: 'Smith' }]);
  assert.deepEqual(parseManualAuthors('   '), []);
});

test('year parses four digits and rejects anything else', () => {
  assert.equal(parseManualYear('2019'), 2019);
  assert.equal(parseManualYear(' 2019 '), 2019);
  assert.equal(parseManualYear(''), undefined);
  assert.equal(parseManualYear('19'), undefined);
  assert.equal(parseManualYear('2019x'), undefined);
});

test('the year field is valid when empty or four digits', () => {
  assert.equal(isValidManualYear(''), true);
  assert.equal(isValidManualYear('2024'), true);
  assert.equal(isValidManualYear('202'), false);
  assert.equal(isValidManualYear('abcd'), false);
});

test('a complete form gives a manual record with no missing fields and no warnings', () => {
  const record = buildManualCitation({ title: 'A field guide', author: 'Smith, Jones', year: '2021', sourceType: 'unknown' });
  assert.equal(record.status, 'manual');
  assert.equal(record.resolvedFrom, 'manual');
  assert.equal(record.sourceType, 'unknown');
  assert.equal(record.title, 'A field guide');
  assert.deepEqual(record.authors, [{ family: 'Smith' }, { family: 'Jones' }]);
  assert.equal(record.year, 2021);
  assert.deepEqual(record.missingFields, []);
  assert.equal(record.enteredByUser, true);
  assert.deepEqual(record.confidence.warnings, []);
  assert.deepEqual(record.confidence.notes, ['The source type could not be identified.']);
});

test('empty optional fields are listed in missingFields and as a note', () => {
  const record = buildManualCitation({ title: 'Only a title', author: '', year: '', sourceType: 'unknown' });
  assert.deepEqual(record.missingFields, ['authors', 'year']);
  assert.equal(record.year, undefined);
  assert.deepEqual(record.authors, []);
  assert.ok(record.confidence.notes.includes('Missing: authors, year.'));
  assert.deepEqual(record.confidence.warnings, []);
});

test('an empty title is listed as missing and stored as undefined', () => {
  const record = buildManualCitation({ title: '   ', author: 'Smith', year: '2020', sourceType: 'journal_article' });
  assert.deepEqual(record.missingFields, ['title']);
  assert.equal(record.title, undefined);
  assert.equal(record.sourceType, 'journal_article');
});

test('the source type is only journal_article when the user chose it', () => {
  assert.equal(buildManualCitation({ title: 'T', author: '', year: '', sourceType: 'unknown' }).sourceType, 'unknown');
  assert.equal(buildManualCitation({ title: 'T', author: '', year: '', sourceType: 'journal_article' }).sourceType, 'journal_article');
});

test('a manual record passes the server-side citation check', () => {
  const record = buildManualCitation({ title: 'T', author: 'Smith', year: '2020', sourceType: 'unknown' });
  assert.equal(isCitationRecord(JSON.parse(JSON.stringify(record))), true);
});
