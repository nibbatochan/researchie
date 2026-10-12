import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCrossrefWork } from '../src/lib/citations/crossref.ts';
import { formatVancouver, nlmDate } from '../src/lib/citations/vancouver.ts';
import { toBibTeX, toRIS } from '../src/lib/citations/export.ts';

const CITED = new Date(2026, 9, 12); // 2026 Oct 12

const preprint = () => mapCrossrefWork({
  type: 'posted-content',
  DOI: '10.1101/2020.01.01.123456',
  title: ['A fast test for slow things'],
  author: [{ given: 'Ada', family: 'Lovelace' }, { given: 'Charles', family: 'Babbage' }],
  institution: [{ name: 'bioRxiv' }],
  publisher: 'Cold Spring Harbor Laboratory',
  issued: { 'date-parts': [[2020, 1, 3]] },
});

const chapter = () => mapCrossrefWork({
  type: 'book-chapter',
  DOI: '10.1000/chapter1',
  title: ['Chromosome alterations in human solid tumors'],
  author: [{ given: 'Barry', family: 'Vogelstein' }],
  editor: [{ given: 'Bert', family: 'Vogelstein' }, { given: 'Kenneth W', family: 'Kinzler' }],
  'container-title': ['The genetic basis of human cancer'],
  publisher: 'McGraw-Hill',
  'publisher-location': 'New York',
  page: '93-113',
  issued: { 'date-parts': [[2002]] },
});

const dataset = () => ({
  status: 'verified_doi', sourceType: 'dataset', resolvedFrom: 'datacite', doi: '10.5281/zenodo.1',
  title: 'Standing balance recordings', authors: [{ family: 'Smith', given: 'Jo' }],
  publisher: 'Zenodo', year: 2024, missingFields: [],
});

test('a Crossref preprint keeps the server name from institution', () => {
  const r = preprint();
  assert.equal(r.sourceType, 'preprint');
  assert.equal(r.journal, 'bioRxiv');
});

test('Vancouver preprint: server, [Preprint], year, cited date, link', () => {
  assert.equal(
    formatVancouver(preprint(), { citedOn: CITED }),
    'Lovelace A, Babbage C. A fast test for slow things. bioRxiv [Preprint]. 2020 [cited 2026 Oct 12]. Available from: https://doi.org/10.1101/2020.01.01.123456'
  );
});

test('Vancouver dataset: [dataset] tag, cited date, repository, link', () => {
  assert.equal(
    formatVancouver(dataset(), { citedOn: CITED }),
    'Smith J. Standing balance recordings [dataset]. 2024 [cited 2026 Oct 12]. Zenodo. Available from: https://doi.org/10.5281/zenodo.1'
  );
});

test('Vancouver book chapter: In: editors, book, place: publisher; year. p. pages', () => {
  assert.equal(
    formatVancouver(chapter()),
    'Vogelstein B. Chromosome alterations in human solid tumors. In: Vogelstein B, Kinzler KW, editors. The genetic basis of human cancer. New York: McGraw-Hill; 2002. p. 93-113. doi:10.1000/chapter1'
  );
});

test('a book chapter with no editors or place still formats and flags nothing it cannot know', () => {
  const r = chapter();
  delete r.editors;
  delete r.publisherPlace;
  assert.equal(
    formatVancouver(r),
    'Vogelstein B. Chromosome alterations in human solid tumors. In: The genetic basis of human cancer. McGraw-Hill; 2002. p. 93-113. doi:10.1000/chapter1'
  );
});

test('missing fields show as incomplete and unknown sources stay unformatted', () => {
  const r = preprint();
  delete r.journal;
  delete r.publisher;
  assert.match(formatVancouver(r, { citedOn: CITED }), /\[incomplete: server\] \[Preprint\]/);
  r.sourceType = 'unknown';
  assert.equal(formatVancouver(r), null);
});

test('NLM date form is year, abbreviated month, day', () => {
  assert.equal(nlmDate(new Date(2017, 1, 9)), '2017 Feb 9');
});

test('BibTeX for a journal article escapes special characters and uses -- in page ranges', () => {
  const out = toBibTeX({
    status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', doi: '10.1/x',
    title: 'Cats & dogs: 100% real', authors: [{ family: 'Lee', given: 'Ann' }, { family: 'Park', given: 'Bo' }],
    journal: 'J Pets', year: 2020, volume: '5', issue: '2', pages: '10-20', missingFields: [],
  });
  assert.match(out, /^@article\{lee2020cats,/);
  assert.match(out, /author = \{Lee, Ann and Park, Bo\}/);
  assert.match(out, /title = \{\{Cats \\& dogs: 100\\% real\}\}/);
  assert.match(out, /pages = \{10--20\}/);
  assert.match(out, /doi = \{10\.1\/x\}/);
  assert.ok(!/editor =/.test(out));
});

test('BibTeX chapter has booktitle and editor; missing fields are left out', () => {
  const out = toBibTeX(chapter());
  assert.match(out, /^@incollection\{/);
  assert.match(out, /booktitle = \{The genetic basis of human cancer\}/);
  assert.match(out, /editor = \{Vogelstein, Bert and Kinzler, Kenneth W\}/);
  assert.ok(!/volume =/.test(out));
});

test('RIS has a type, one AU per author, SP and EP, and ends with ER', () => {
  const out = toRIS({
    status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', doi: '10.1/x',
    title: 'A title', authors: [{ family: 'Lee', given: 'Ann' }, { family: 'Park', given: 'Bo' }],
    journal: 'J Pets', year: 2020, volume: '5', pages: '10-20', missingFields: [],
  });
  const lines = out.split('\n');
  assert.equal(lines[0], 'TY  - JOUR');
  assert.deepEqual(lines.filter((l) => l.startsWith('AU')), ['AU  - Lee, Ann', 'AU  - Park, Bo']);
  assert.ok(lines.includes('SP  - 10'));
  assert.ok(lines.includes('EP  - 20'));
  assert.ok(lines.includes('DO  - 10.1/x'));
  assert.equal(lines[lines.length - 1], 'ER  -');
  assert.ok(!lines.some((l) => l.startsWith('IS')));
});

test('RIS types: preprint, dataset, chapter', () => {
  assert.match(toRIS(preprint()), /^TY {2}- UNPB/);
  assert.match(toRIS(dataset()), /^TY {2}- DATA/);
  const c = toRIS(chapter());
  assert.match(c, /^TY {2}- CHAP/);
  assert.match(c, /A2 {2}- Vogelstein, Bert/);
});

import { atomCitation } from '../src/lib/export/citation.ts';

test('atomCitation returns the formatted line and DOI of a saved citation, or null', () => {
  const record = {
    status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', doi: '10.1/x',
    title: 'A title', authors: [{ family: 'Lee', given: 'Ann' }], journal: 'J Pets', year: 2020, volume: '5', pages: '10-20', missingFields: [],
  };
  const out = atomCitation({ id: 'a', metadata: { citation: record } });
  assert.equal(out.doi, '10.1/x');
  assert.match(out.line, /^Lee A\. A title\. J Pets\. 2020;5:10-20\. doi:10\.1\/x$/);
  assert.equal(atomCitation({ id: 'b', metadata: {} }), null);
  assert.equal(atomCitation({ id: 'c', metadata: { citation: { nonsense: true } } }), null);
});

test('Crossref updated-by with a retraction marks the original paper retracted (checked live on a retracted Lancet paper)', () => {
  const base = { type: 'journal-article', DOI: '10.1/y', title: ['T'], author: [{ family: 'A', given: 'B' }], 'container-title': ['J'], volume: '1', page: '1-2', issued: { 'date-parts': [[2000]] } };
  assert.equal(mapCrossrefWork({ ...base, 'updated-by': [{ DOI: '10.1/c', type: 'correction' }, { DOI: '10.1/r', type: 'retraction' }] }).retracted, true);
  assert.equal(mapCrossrefWork({ ...base, 'updated-by': [{ DOI: '10.1/c', type: 'correction' }] }).retracted, false);
  assert.equal(mapCrossrefWork(base).retracted, undefined); // no notices: the check says nothing
});

test('Vancouver web page: Site [Internet]. Title; year [cited date]. Available from: URL (NLM part of a Web site)', () => {
  const page = {
    status: 'page_tags', sourceType: 'web_page', resolvedFrom: 'page_tags', authors: [{ family: 'Taras', given: 'Zach' }],
    title: 'Situational irony can be funny, tragic or even terrifying', publisher: 'HowStuffWorks', year: 2024,
    url: 'https://entertainment.howstuffworks.com/arts/literature/situational-irony.htm', missingFields: [],
  };
  assert.equal(
    formatVancouver(page, { citedOn: CITED }),
    'HowStuffWorks [Internet]. Situational irony can be funny, tragic or even terrifying; 2024 [cited 2026 Oct 12]. Available from: https://entertainment.howstuffworks.com/arts/literature/situational-irony.htm'
  );
  // No site name and no year: the host name stands in, and the date part is just the cited date.
  const bare = { ...page, publisher: undefined, year: undefined, url: 'https://www.example.org/a' };
  assert.equal(
    formatVancouver(bare, { citedOn: CITED }),
    'example.org [Internet]. Situational irony can be funny, tragic or even terrifying; [cited 2026 Oct 12]. Available from: https://www.example.org/a'
  );
});
