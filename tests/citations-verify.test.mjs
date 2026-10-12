// Run: node --test tests/citations-verify.test.mjs
// Warnings (user-entered mismatch only) and notes (plain facts). Pure: no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titlesMatch, assessCitation, isRetracted } from '../src/lib/citations/verify.ts';
import { findPdfDois, isUsablePdfTitle } from '../src/lib/citations/pdf.ts';

const journal = (title, extra = {}) => ({
  status: 'verified_doi',
  sourceType: 'journal_article',
  resolvedFrom: 'crossref',
  doi: '10.1038/nature12373',
  title,
  authors: [{ family: 'Kucsko', given: 'G.' }],
  journal: 'Nature',
  year: 2013,
  volume: '500',
  issue: '7460',
  pages: '54-58',
  missingFields: [],
  ...extra,
});

const USER = { userEntered: true };

test('titles match after case and punctuation are ignored', () => {
  assert.equal(titlesMatch('Sleep-dependent learning and memory consolidation', 'Sleep-Dependent Learning and Memory Consolidation.'), true);
});

test('a short clip title matches the full paper title only when it is nearly all of it', () => {
  assert.equal(titlesMatch('Different stabilizing mechanisms', 'Different stabilizing mechanisms but a common task-level aim in standing and walking'), false);
});

test('a matching title has no warnings and no notes', () => {
  const out = assessCitation(journal('Nanometre-scale thermometry in a living cell'), 'Nanometre-scale thermometry in a living cell', USER);
  assert.deepEqual(out.confidence, { warnings: [], notes: [] });
});

test('a title the user entered that does not match the clip is a warning', () => {
  const out = assessCitation(journal('Sleep-Dependent Learning'), 'Heat wave - Wikipedia', USER);
  assert.equal(out.confidence.warnings.length, 1);
  assert.match(out.confidence.warnings[0], /you entered/);
});

test('a title mismatch from an automatic source is a note, not a warning', () => {
  const out = assessCitation(journal('Sleep-Dependent Learning'), 'Heat wave - Wikipedia');
  assert.deepEqual(out.confidence.warnings, []);
  assert.match(out.confidence.notes[0], /differs from the clip/);
});

test('a web page from a known URL is a note, never a warning', () => {
  const out = assessCitation(journal('X', { sourceType: 'web_page', resolvedFrom: 'page_tags' }), 'Y', USER);
  assert.deepEqual(out.confidence.warnings, []);
  assert.match(out.confidence.notes.join(' '), /verified by its address/);
});

test('missing fields and preprints are notes; a retraction is not a verify warning or note', () => {
  const out = assessCitation(journal('X', { status: 'incomplete', missingFields: ['pages'], sourceType: 'preprint', retracted: true }), 'X', USER);
  assert.deepEqual(out.confidence.warnings, []);
  const text = out.confidence.notes.join(' ');
  assert.match(text, /Missing: pages/);
  assert.match(text, /Preprint/);
  assert.doesNotMatch(text, /retract/i); // shown as its own amber box, see isRetracted
  assert.equal(isRetracted(out), true);
  assert.equal(isRetracted({ ...out, retracted: false }), false);
  assert.equal(isRetracted({ ...out, retracted: undefined }), false);
});

test('a PubMed record without a retraction check is a note', () => {
  const out = assessCitation(journal('X', { resolvedFrom: 'pubmed', retracted: undefined }), 'X');
  assert.match(out.confidence.notes.join(' '), /retraction check did not run/);
});

test('findPdfDois returns every distinct DOI, metadata first', () => {
  const dois = findPdfDois(
    { title: 'Paper', keywords: 'doi:10.1038/nature12373' },
    'See 10.1371/journal.pone.0355849 and again 10.1371/journal.pone.0355849. Also https://doi.org/10.1038/nature12373.',
  );
  assert.deepEqual(dois, ['10.1038/nature12373', '10.1371/journal.pone.0355849']);
});

test('findPdfDois returns an empty list when there is no DOI', () => {
  assert.deepEqual(findPdfDois({ title: 'Untitled' }, 'No identifier here.'), []);
});

import { citationFacts, formatCitationFacts } from '../src/lib/citations/facts.ts';

test('facts show page, author and date, with "not shown" for anything missing', () => {
  const web = { status: 'page_tags', sourceType: 'web_page', resolvedFrom: 'page_tags', authors: [], missingFields: [], url: 'https://www.example.org/report' };
  assert.equal(formatCitationFacts(web), 'Page: example.org · Author: not shown · Date: not shown');
});

test('facts for a DOI record use the DOI page, the first author and the year', () => {
  const doi = { status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', doi: '10.1038/nature12373', authors: [{ family: 'Kucsko' }, { family: 'Maurer' }], year: 2013, missingFields: [] };
  assert.deepEqual(citationFacts(doi), { page: 'doi.org/10.1038/nature12373', author: 'Kucsko et al.', date: '2013' });
});

test('a DOI read from an uploaded PDF with a different title is a warning, and a matching one is clean', () => {
  const opts = { userEntered: false, warnOnMismatch: true };
  const bad = assessCitation(journal('Sleep-Dependent Learning'), 'Heat wave', opts);
  assert.equal(bad.confidence.warnings.length, 1);
  assert.match(bad.confidence.warnings[0], /found in this PDF/);
  assert.equal(bad.enteredByUser, false);
  const ok = assessCitation(journal('Heat wave'), 'Heat wave', opts);
  assert.deepEqual(ok.confidence, { warnings: [], notes: [] });
});

test('PDF metadata titles that are tool leftovers are not compared (no false warnings)', () => {
  for (const junk of ['Microsoft Word - paper_final.docx', 'untitled', 'Untitled 1', 'draft_v3.pdf', 'PII: S0140-6736(97)11096-0', 'doi:10.1000/xyz123', 'manuscript', 'PowerPoint Presentation', '', undefined]) {
    assert.equal(isUsablePdfTitle(junk), false, String(junk));
  }
  for (const real of ['Sleep-Dependent Learning and Memory', 'Nanometre-scale thermometry in a living cell', 'Standing balance: a model of feedback delay']) {
    assert.equal(isUsablePdfTitle(real), true, real);
  }
});
