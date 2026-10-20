// Run: node --test --no-warnings tests/import-refs.test.mjs
// Reading RIS and BibTeX files and matching entries to a project's PDFs and clips. Sources are made up.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRis, parseBibtex, parseReferences, detectFormat, normalizeDoi, parseAuthorName, cleanLatex, matchEntries, altTitlesFor } from '../src/lib/citations/importRefs.ts';

const RIS = `TY  - JOUR
ID  - lee2020
AU  - Lee, Jane A.
AU  - Patel, Raj
TI  - Sleep and memory in adults
JO  - Journal of Examples
JA  - J. Ex.
VL  - 12
IS  - 3
SP  - 45
EP  - 67
PY  - 2020/03/01
DO  - 10.1000/XYZ123
UR  - https://doi.org/10.1000/xyz123
ER  -

TY  - CHAP
AU  - Kim, Dae
TI  - A chapter on attention
T2  - Handbook of Focus
ED  - Roy, Sam
PB  - Example Press
CY  - London
PY  - 2018
SP  - 10
EP  - 30
ER  -

TY  - ELEC
TI  - A web page about sleep
UR  - https://example.org/sleep
PY  - 2022
ER  -
`;

const BIB = `@comment{ignore me}
@article{lee2020,
  author = {Lee, Jane A. and Patel, Raj and M{\\"u}ller, Anna},
  title = {Sleep and {M}emory in Adults},
  journal = {Journal of Examples},
  year = {2020},
  volume = {12},
  number = {3},
  pages = {45--67},
  doi = {https://doi.org/10.1000/XYZ123},
}

@inproceedings{kim2018,
  author = "Dae Kim",
  title = "Attention and focus",
  booktitle = "Proc. of Examples",
  year = 2018,
}

@misc{roy2021,
  author = {{World Sleep Society}},
  title = {Guidance on sleep},
  eprint = {2101.00001},
  archivePrefix = {arXiv},
  year = {2021},
}

@book{nothing}
`;

test('detectFormat reads the text, not the file name', () => {
  assert.equal(detectFormat(RIS), 'ris');
  assert.equal(detectFormat(BIB), 'bibtex');
  assert.equal(detectFormat('just some words'), 'unknown');
  assert.deepEqual(parseReferences('just some words'), { format: 'unknown', entries: [], skipped: 0 });
});

test('RIS: a journal article keeps authors, journal, volume, pages, year and a normalised DOI', () => {
  const r = parseRis(RIS);
  assert.equal(r.entries.length, 3);
  const a = r.entries[0].record;
  assert.equal(a.sourceType, 'journal_article');
  assert.deepEqual(a.authors, [{ family: 'Lee', given: 'Jane A.' }, { family: 'Patel', given: 'Raj' }]);
  assert.equal(a.title, 'Sleep and memory in adults');
  assert.equal(a.journal, 'Journal of Examples');
  assert.equal(a.journalAbbrev, 'J. Ex.');
  assert.equal(a.volume, '12');
  assert.equal(a.issue, '3');
  assert.equal(a.pages, '45-67');
  assert.equal(a.year, 2020);
  assert.equal(a.doi, '10.1000/xyz123');
  assert.equal(a.url, undefined); // a doi.org link is the DOI, not a separate URL
  assert.equal(a.status, 'manual');
  assert.equal(a.resolvedFrom, 'import');
  assert.deepEqual(a.missingFields, []);
  assert.equal(r.entries[0].key, 'lee2020');
});

test('RIS: a chapter keeps editors and place; a web page keeps its URL and lists what is missing', () => {
  const [, chapter, web] = parseRis(RIS).entries.map((e) => e.record);
  assert.equal(chapter.sourceType, 'book_chapter');
  assert.deepEqual(chapter.editors, [{ family: 'Roy', given: 'Sam' }]);
  assert.equal(chapter.publisherPlace, 'London');
  assert.equal(web.sourceType, 'web_page');
  assert.equal(web.url, 'https://example.org/sleep');
  assert.ok(web.missingFields.includes('authors'));
});

test('RIS: a block with nothing usable is skipped and counted; a long value continues on the next line', () => {
  const r = parseRis('TY  - JOUR\nER  - \n\nTY  - JOUR\nTI  - A very long\n  title that wraps\nAU  - Lee, A\nER  - \n');
  assert.equal(r.skipped, 1);
  assert.equal(r.entries[0].record.title, 'A very long title that wraps');
});

test('BibTeX: article fields, braces and LaTeX accents are cleaned, DOI URL normalised, page dashes tidied', () => {
  const r = parseBibtex(BIB);
  const a = r.entries[0].record;
  assert.equal(r.entries[0].key, 'lee2020');
  assert.equal(a.title, 'Sleep and Memory in Adults');
  assert.deepEqual(a.authors.map((x) => x.family), ['Lee', 'Patel', 'Müller']);
  assert.equal(a.pages, '45-67');
  assert.equal(a.issue, '3');
  assert.equal(a.doi, '10.1000/xyz123');
  assert.equal(a.year, 2020);
});

test('BibTeX: quoted values and "First Last" names work; a group author in braces stays whole; arXiv misc is a preprint', () => {
  const [, kim, roy] = parseBibtex(BIB).entries.map((e) => e.record);
  assert.deepEqual(kim.authors, [{ family: 'Kim', given: 'Dae' }]);
  assert.equal(kim.journal, 'Proc. of Examples');
  assert.equal(kim.year, 2018);
  assert.deepEqual(roy.authors, [{ family: 'World Sleep Society' }]);
  assert.equal(roy.sourceType, 'preprint');
});

test('BibTeX: @comment is ignored and an empty entry is skipped and counted', () => {
  const r = parseBibtex(BIB);
  assert.equal(r.entries.length, 3);
  assert.equal(r.skipped, 1);
});

test('helpers: DOI, author names and LaTeX', () => {
  assert.equal(normalizeDoi('https://dx.doi.org/10.5555/AbC-1'), '10.5555/abc-1');
  assert.equal(normalizeDoi('doi: 10.5555/abc'), '10.5555/abc');
  assert.equal(normalizeDoi('not a doi'), undefined);
  assert.deepEqual(parseAuthorName('Jane Alice Smith'), { family: 'Smith', given: 'Jane Alice' });
  assert.deepEqual(parseAuthorName('Smith'), { family: 'Smith' });
  assert.equal(parseAuthorName('  '), undefined);
  assert.equal(cleanLatex('M{\\"u}ller \\& Co -- {R}esults'), 'Müller & Co - Results');
});

const targets = [
  { kind: 'doc', id: 'd1', title: 'Sleep and memory in adults', doi: undefined, hasCitation: false },
  { kind: 'doc', id: 'd2', title: 'Unrelated paper', doi: '10.1000/xyz123', hasCitation: true },
  { kind: 'clip', id: 'c1', title: 'A chapter on attention', hasCitation: false },
  { kind: 'clip', id: 'c2', title: 'A chapter on attention', hasCitation: false },
];

test('matching goes by DOI first, then by title, and says which', () => {
  const entries = parseRis(RIS).entries;
  const m = matchEntries(entries, targets);
  // entry 0 has a DOI that d2 carries: DOI wins over the title match with d1
  assert.deepEqual([m[0].status, m[0].how, m[0].candidates.map((t) => t.id)], ['matched', 'doi', ['d2']]);
});

test('an entry that fits several targets is ambiguous; one that fits none is unmatched', () => {
  const entries = parseRis(RIS).entries;
  const m = matchEntries(entries, targets);
  assert.deepEqual([m[1].status, m[1].how, m[1].candidates.map((t) => t.id)], ['ambiguous', 'title', ['c1', 'c2']]);
  assert.deepEqual([m[2].status, m[2].candidates], ['unmatched', []]);
});

test('a title match needs a real title, not a few words; a similar title still matches', () => {
  const short = [{ record: { title: 'Sleep', authors: [], missingFields: [] } }];
  assert.equal(matchEntries(short, targets)[0].status, 'unmatched');
  const full = [{ record: { title: 'Sleep and memory in adults.', authors: [], missingFields: [] } }];
  assert.equal(matchEntries(full, targets)[0].candidates[0].id, 'd1');
});

test('a PDF known by a title with an author part or by its file name still matches the plain title', () => {
  assert.deepEqual(altTitlesFor('Just Enough Research — Erika Hall', 'just_enough_research.pdf'), ['Just Enough Research', 'just enough research']);
  assert.deepEqual(altTitlesFor('Plain title'), []);
  const t = [{ kind: 'doc', id: 'd', title: 'Just Enough Research — Erika Hall', altTitles: altTitlesFor('Just Enough Research — Erika Hall'), hasCitation: false }];
  const m = matchEntries([{ record: { title: 'Just Enough Research', authors: [], missingFields: [] } }], t);
  assert.equal(m[0].status, 'matched');
});
