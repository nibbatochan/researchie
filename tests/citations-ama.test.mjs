import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAma } from '../src/lib/citations/ama.ts';

// Expected strings are the worked examples in JAMA "Instructions for Authors" (References),
// https://jamanetwork.com/journals/jama/pages/instructions-for-authors, without italics.

const base = { status: 'verified_doi', resolvedFrom: 'crossref', missingFields: [] };

test('journal article with DOI (JAMA example)', () => {
  const out = formatAma({
    ...base, sourceType: 'journal_article', doi: '10.1001/jama.2025.19400',
    title: 'Peripheral Neuropathy: A Review',
    authors: [{ family: 'Mauermann', given: 'Michelle L.' }, { family: 'Staff', given: 'Nathan P.' }],
    journal: 'Journal of the American Medical Association', journalAbbrev: 'JAMA',
    year: 2026, volume: '335', issue: '3', pages: '255–266',
  });
  assert.equal(out, 'Mauermann ML, Staff NP. Peripheral Neuropathy: A Review. JAMA. 2026;335(3):255–266. doi:10.1001/jama.2025.19400');
});

test('journal article, six authors all listed (JAMA example)', () => {
  const out = formatAma({
    ...base, sourceType: 'journal_article',
    title: 'Oral, capsulized, frozen fecal microbiota transplantation for relapsing Clostridium difficile infection',
    authors: [
      { family: 'Youngster', given: 'Ilan' }, { family: 'Russell', given: 'George H.' }, { family: 'Pindar', given: 'Christina' },
      { family: 'Ziv-Baran', given: 'Tomer' }, { family: 'Sauk', given: 'Jenny' }, { family: 'Hohmann', given: 'Elizabeth L.' },
    ],
    journal: 'JAMA', year: 2014, volume: '312', issue: '17', pages: '1772-1778',
  });
  assert.equal(
    out,
    'Youngster I, Russell GH, Pindar C, Ziv-Baran T, Sauk J, Hohmann EL. Oral, capsulized, frozen fecal microbiota transplantation for relapsing Clostridium difficile infection. JAMA. 2014;312(17):1772-1778.',
  );
});

test('more than six authors: first three then et al (JAMA rule)', () => {
  const authors = 'ABCDEFG'.split('').map((c) => ({ family: `${c}x`, given: c }));
  const out = formatAma({ ...base, sourceType: 'journal_article', title: 'T', authors, journal: 'JAMA', year: 2020, volume: '1', pages: '1-2' });
  assert.equal(out, 'Ax A, Bx B, Cx C, et al. T. JAMA. 2020;1:1-2.');
});

test('web page (JAMA example)', () => {
  const out = formatAma({
    ...base, sourceType: 'web_page',
    title: 'CMS proposals to implement certain disclosure provisions of the Affordable Care Act',
    authors: [{ family: 'Centers for Medicare & Medicaid Services' }],
    url: 'http://www.cms.gov/apps/media/press/factsheet.asp?Counter=4221', accessedAt: '2012-01-30T12:00:00Z',
  });
  assert.equal(
    out,
    'Centers for Medicare & Medicaid Services. CMS proposals to implement certain disclosure provisions of the Affordable Care Act. http://www.cms.gov/apps/media/press/factsheet.asp?Counter=4221. Accessed January 30, 2012.',
  );
});

test('types without a verified example return null', () => {
  for (const sourceType of ['preprint', 'dataset', 'book_chapter', 'report', 'unknown']) {
    assert.equal(formatAma({ ...base, sourceType, title: 'T', authors: [{ family: 'A', given: 'B' }] }), null);
  }
});
