import test from 'node:test';
import assert from 'node:assert/strict';
import { formatApa } from '../src/lib/citations/apa.ts';

// Expected strings are the APA "Common Reference Examples" handout
// (apastyle.apa.org/instructional-aids/reference-examples.pdf), without italics.

const base = { status: 'verified_doi', resolvedFrom: 'crossref', missingFields: [] };

test('journal article (handout 10.1)', () => {
  const out = formatApa({
    ...base, sourceType: 'journal_article', doi: '10.1037/edu0000946',
    title: 'Understanding mean-level and intraindividual variability in state academic self-concept: The role of students’ trait expectancies and values',
    authors: [
      { family: 'Niepel', given: 'Christoph' }, { family: 'Hausen', given: 'Jonas E.' },
      { family: 'Weber', given: 'Anna M.' }, { family: 'Möller', given: 'Jens' },
    ],
    journal: 'Journal of Educational Psychology', year: 2025, volume: '117', issue: '5', pages: '772-788',
  });
  assert.equal(
    out,
    'Niepel, C., Hausen, J. E., Weber, A. M., & Möller, J. (2025). Understanding mean-level and intraindividual variability in state academic self-concept: The role of students’ trait expectancies and values. Journal of Educational Psychology, 117(5), 772–788. https://doi.org/10.1037/edu0000946',
  );
});

test('edited book chapter (handout 10.3)', () => {
  const out = formatApa({
    ...base, sourceType: 'book_chapter', doi: '10.1037/0000157-002',
    title: 'Home–school collaboration to promote mind–body health',
    authors: [{ family: 'Zeleke', given: 'Wendy A.' }, { family: 'Hughes', given: 'Tammy L.' }, { family: 'Drozda', given: 'Nicole' }],
    editors: [{ family: 'Maykel', given: 'Cathy' }, { family: 'Bray', given: 'Melissa A.' }],
    journal: 'Promoting mind–body health in schools: Interventions for mental health professionals',
    pages: '11-26', publisher: 'American Psychological Association', year: 2020,
  });
  assert.equal(
    out,
    'Zeleke, W. A., Hughes, T. L., & Drozda, N. (2020). Home–school collaboration to promote mind–body health. In C. Maykel & M. A. Bray (Eds.), Promoting mind–body health in schools: Interventions for mental health professionals (pp. 11–26). American Psychological Association. https://doi.org/10.1037/0000157-002',
  );
});

test('preprint (handout 10.8) and report (handout 10.4)', () => {
  assert.equal(
    formatApa({
      ...base, sourceType: 'preprint', url: 'https://psyarxiv.com/kzy7u/',
      title: 'A meta-analytic review of the benefit of spacing out retrieval practice episodes on retention',
      authors: [{ family: 'Latimier', given: 'Anaïs' }, { family: 'Peyre', given: 'Hugo' }, { family: 'Ramus', given: 'Franck' }],
      journal: 'PsyArXiv', year: 2020,
    }),
    'Latimier, A., Peyre, H., & Ramus, F. (2020). A meta-analytic review of the benefit of spacing out retrieval practice episodes on retention. PsyArXiv. https://psyarxiv.com/kzy7u/',
  );
  assert.equal(
    formatApa({
      ...base, sourceType: 'report', url: 'https://www.brookings.edu/wp-content/uploads/2019/04/how_playful_learning_can_help_leapfrog_progress_in_education.pdf',
      title: 'How playful learning can help leapfrog progress in education',
      authors: [{ family: 'Winthrop', given: 'Rebecca' }, { family: 'Ziegler', given: 'Lauren' }, { family: 'Handa', given: 'Rajan' }, { family: 'Fakoya', given: 'Folasade' }],
      publisher: 'Center for Universal Education at Brookings', year: 2019,
    }),
    'Winthrop, R., Ziegler, L., Handa, R., & Fakoya, F. (2019). How playful learning can help leapfrog progress in education. Center for Universal Education at Brookings. https://www.brookings.edu/wp-content/uploads/2019/04/how_playful_learning_can_help_leapfrog_progress_in_education.pdf',
  );
});

test('data set (handout 10.9, without the optional version)', () => {
  assert.equal(
    formatApa({
      ...base, sourceType: 'dataset', doi: '10.3886/ICPSR36966.v1',
      title: 'Content analysis of undergraduate psychology textbooks',
      authors: [{ family: 'O’Donohue', given: 'William' }],
      publisher: 'Inter-university Consortium for Political and Social Research', year: 2017,
    }),
    'O’Donohue, W. (2017). Content analysis of undergraduate psychology textbooks [Data set]. Inter-university Consortium for Political and Social Research. https://doi.org/10.3886/ICPSR36966.v1',
  );
});

test('web page (handout 10.16): site named; undated page gets n.d. and a retrieval date', () => {
  assert.equal(
    formatApa({
      ...base, status: 'page_tags', resolvedFrom: 'page_tags', sourceType: 'web_page',
      url: 'https://entertainment.howstuffworks.com/arts/literature/situational-irony.htm',
      title: 'Situational irony can be funny, tragic or even terrifying',
      authors: [{ family: 'Taras', given: 'Zach' }], publisher: 'HowStuffWorks', year: 2024,
    }),
    'Taras, Z. (2024). Situational irony can be funny, tragic or even terrifying. HowStuffWorks. https://entertainment.howstuffworks.com/arts/literature/situational-irony.htm',
  );
  assert.equal(
    formatApa({
      ...base, status: 'page_tags', resolvedFrom: 'page_tags', sourceType: 'web_page',
      url: 'https://www.worldometers.info/world-population/', title: 'Current world population',
      authors: [{ family: 'Worldometer' }], publisher: 'Worldometer', accessedAt: '2025-10-17T10:00:00.000Z',
    }),
    'Worldometer. (n.d.). Current world population. Retrieved October 17, 2025, from https://www.worldometers.info/world-population/',
  );
});

test('a page with no author puts the title first; more than 20 authors are shortened', () => {
  const noAuthor = formatApa({
    ...base, sourceType: 'web_page', url: 'https://example.org/p', title: 'Page title', authors: [], publisher: 'Example', year: 2023,
  });
  assert.equal(noAuthor, 'Page title. (2023). Example. https://example.org/p');

  const many = Array.from({ length: 22 }, (_, i) => ({ family: `A${i}`, given: 'B' }));
  const out = formatApa({ ...base, sourceType: 'journal_article', title: 'T', authors: many, journal: 'J', year: 2020 });
  assert.match(out, /^A0, B\., A1, B\., .*A18, B\., \. \. \. A21, B\. \(2020\)\./);
  assert.ok(!out.includes('A19,'));
});

test('unknown sources return null', () => {
  assert.equal(formatApa({ ...base, sourceType: 'unknown', authors: [] }), null);
});
