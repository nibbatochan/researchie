import { test, expect } from '@playwright/test';

// A clip with a saved citation offers Copy, BibTeX and RIS. The clip is created for the test
// and deleted afterwards, so the test projects keep their data.
const PROJECT_ID = 'proj-always-on-agents-dots';

const citation = {
  status: 'verified_doi',
  sourceType: 'journal_article',
  resolvedFrom: 'crossref',
  doi: '10.1000/e2e.copy',
  title: 'Cats & dogs: a study',
  authors: [{ family: 'Lee', given: 'Ann' }, { family: 'Park', given: 'Bo' }],
  journal: 'J Pets',
  year: 2020,
  volume: '5',
  issue: '2',
  pages: '10-20',
  missingFields: [],
};

test.describe('11. Copy a citation as a line, BibTeX or RIS', () => {
  let atomId = '';
  const title = `E2E citation copy ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/atoms', {
      data: {
        projectId: PROJECT_ID,
        type: 'text',
        title,
        content: { rawText: title, text: title },
        metadata: { sourceUrl: 'https://example.org/paper', pageTitle: 'Example paper', citation },
        tags: [],
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    atomId = json.data?.id || json.atom?.id || json.id;
    expect(atomId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    if (atomId) await request.delete(`/api/atoms?id=${atomId}`);
  });

  test('the three copy buttons put the right text on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const projects = await (await page.request.get('/api/projects')).json();
    const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
    expect(project).toBeTruthy();
    await page.getByText(project.title, { exact: false }).first().click();
    await page.waitForTimeout(800);

    const card = page.locator(`text=${title}`).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    // The citation icon sits in the same card as the title.
    const cardRoot = page.locator('div', { has: card }).filter({ has: page.locator('button[title="Show citation"]') }).last();
    await cardRoot.locator('button[title="Show citation"]').first().click();

    const line = page.getByTestId('copy-citation-line');
    await expect(line).toBeVisible();
    await expect(page.getByTestId('copy-citation-bibtex')).toBeVisible();
    await expect(page.getByTestId('copy-citation-ris')).toBeVisible();

    await page.getByTestId('copy-citation-bibtex').click();
    // Windows turns line breaks into CRLF on the clipboard; compare with plain LF.
    const readClipboard = async () => (await page.evaluate(() => navigator.clipboard.readText())).split('\r\n').join('\n');
    const bib = await readClipboard();
    expect(bib).toMatch(/^@article\{lee2020cats,/);
    expect(bib).toContain('pages = {10--20}');
    expect(bib).toContain('title = {{Cats \\& dogs: a study}}');

    await page.getByTestId('copy-citation-ris').click();
    const ris = await readClipboard();
    expect(ris.split('\n')[0]).toBe('TY  - JOUR');
    expect(ris).toContain('AU  - Lee, Ann');
    expect(ris.trimEnd().endsWith('ER  -')).toBeTruthy();

    await page.getByTestId('copy-citation-apa').click();
    expect(await readClipboard()).toBe('Lee, A., & Park, B. (2020). Cats & dogs: a study. J Pets, 5(2), 10–20. https://doi.org/10.1000/e2e.copy');

    await page.getByTestId('copy-citation-line').click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toBe('Lee A, Park B. Cats & dogs: a study. J Pets. 2020;5(2):10-20. doi:10.1000/e2e.copy');
  });
});

test.describe('11b. A retracted paper shows an amber warning', () => {
  let atomId = '';
  const title = `E2E retracted ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/atoms', {
      data: {
        projectId: PROJECT_ID,
        type: 'text',
        title,
        content: { rawText: title, text: title },
        metadata: {
          sourceUrl: 'https://example.org/retracted',
          pageTitle: 'Example',
          citation: { ...citation, doi: '10.1000/e2e.retracted', retracted: true },
        },
        tags: [],
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    atomId = json.data?.id || json.atom?.id || json.id;
  });

  test.afterAll(async ({ request }) => {
    if (atomId) await request.delete(`/api/atoms?id=${atomId}`);
  });

  test('the retraction box appears with the citation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const projects = await (await page.request.get('/api/projects')).json();
    const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
    await page.getByText(project.title, { exact: false }).first().click();
    await page.waitForTimeout(800);

    const card = page.locator(`text=${title}`).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const cardRoot = page.locator('div', { has: card }).filter({ has: page.locator('button[title="Show citation"]') }).last();
    await cardRoot.locator('button[title="Show citation"]').first().click();

    const warning = page.getByTestId('retraction-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('This paper has been retracted');
    // It is a separate box from the "might not be the source" warning.
    await expect(page.getByText('This might not be the source. Please verify.')).toHaveCount(0);
  });
});
