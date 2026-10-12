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

  test('the style tabs show what Copy will copy, and Copy confirms it', async ({ page, context }) => {
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

    // Windows turns line breaks into CRLF on the clipboard; compare with plain LF.
    const readClipboard = async () => (await page.evaluate(() => navigator.clipboard.readText())).split('\r\n').join('\n');
    const preview = page.getByTestId('citation-preview');
    const copy = page.getByTestId('citation-copy');
    const VANCOUVER = 'Lee A, Park B. Cats & dogs: a study. J Pets. 2020;5(2):10-20. doi:10.1000/e2e.copy';
    const APA = 'Lee, A., & Park, B. (2020). Cats & dogs: a study. J Pets, 5(2), 10–20. https://doi.org/10.1000/e2e.copy';

    // The style tabs and Copy sit on the same line as the status badge.
    const badge = page.getByText('verified doi', { exact: false }).first();
    await expect(badge).toBeVisible();
    const badgeBox = (await badge.boundingBox())!;
    const copyBox = (await copy.boundingBox())!;
    expect(Math.abs(copyBox.y - badgeBox.y)).toBeLessThan(30);

    // Vancouver is selected first and the preview shows the exact line.
    await expect(page.getByTestId('citation-style-line')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('citation-style-apa')).toHaveAttribute('aria-pressed', 'false');
    await expect(preview).toHaveText(VANCOUVER);

    // Choosing APA changes the selection and the preview.
    await page.getByTestId('citation-style-apa').click();
    await expect(page.getByTestId('citation-style-apa')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('citation-style-line')).toHaveAttribute('aria-pressed', 'false');
    await expect(preview).toHaveText(APA);

    // Copy puts exactly the previewed text on the clipboard and says so.
    await expect(copy).toContainText('Copy');
    await copy.click();
    await expect(copy).toContainText('Copied');
    expect(await readClipboard()).toBe(APA);

    // Switching style clears the "Copied" state, because it was for the old text.
    await page.getByTestId('citation-style-bibtex').click();
    await expect(copy).not.toContainText('Copied');
    const bibText = (await preview.textContent())!;
    expect(bibText).toMatch(/^@article\{lee2020cats,/);
    expect(bibText).toContain('pages = {10--20}');
    expect(bibText).toContain('title = {{Cats \\& dogs: a study}}');
    await copy.click();
    await expect(copy).toContainText('Copied');
    expect(await readClipboard()).toBe(bibText);

    await page.getByTestId('citation-style-ris').click();
    const risText = (await preview.textContent())!;
    expect(risText.split('\n')[0].trimEnd()).toBe('TY  - JOUR');
    await copy.click();
    const ris = await readClipboard();
    expect(ris).toContain('AU  - Lee, Ann');
    expect(ris.trimEnd().endsWith('ER  -')).toBeTruthy();

    // The chosen style is remembered for the next card.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.getByText(project.title, { exact: false }).first().click();
    await page.waitForTimeout(800);
    const again = page.locator('div', { has: page.locator(`text=${title}`).first() }).filter({ has: page.locator('button[title="Show citation"]') }).last();
    await again.locator('button[title="Show citation"]').first().click();
    await expect(page.getByTestId('citation-style-ris')).toHaveAttribute('aria-pressed', 'true');
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

test.describe('11c. Save anyway on the mismatch screen', () => {
  let atomId = '';
  const title = `E2E mismatch ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/atoms', {
      data: {
        projectId: PROJECT_ID,
        type: 'text',
        title,
        content: { rawText: title, text: title },
        metadata: { sourceUrl: 'https://example.org/mismatch', pageTitle: 'Example', pageInfo: { url: 'https://example.org/mismatch', title: 'Cats and dogs: a study of household pets' } },
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

  test('a mismatched source is not saved until the user chooses Save anyway, and then keeps its warning', async ({ page }) => {
    await page.route('**/api/citations/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          record: { ...citation, doi: '10.1000/other', title: 'Quantum dots in photovoltaic cells', retracted: undefined },
          reason: null,
          lookupsUsed: 1,
          lookupCap: 10,
        }),
      });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const projects = await (await page.request.get('/api/projects')).json();
    const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
    await page.getByText(project.title, { exact: false }).first().click();
    await page.waitForTimeout(800);

    const card = page.locator(`text=${title}`).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const root = page.locator('div', { has: card }).filter({ has: page.locator('button[title="Get citation"]') }).last();
    await root.locator('button[title="Get citation"]').first().click();

    await page.getByPlaceholder('DOI, PMID or paper title').fill('10.1000/other');
    await page.getByRole('button', { name: /Look up/ }).click();

    // The warning screen shows, and nothing is saved yet.
    await expect(page.getByText('This might not be the source. Please verify.')).toBeVisible();
    const before = await (await page.request.get(`/api/atoms?projectId=${PROJECT_ID}`)).json();
    const stored = (before.data || before.atoms || []).find((a: any) => a.id === atomId);
    expect(stored?.metadata?.citation).toBeUndefined();

    // Save anyway keeps it, with the warning still showing.
    await page.getByTestId('save-anyway').click();
    await expect(page.getByTestId('citation-preview')).toContainText('Quantum dots in photovoltaic cells');
    await expect(page.getByText('This might not be the source. Please verify.')).toBeVisible();
    await expect.poll(async () => {
      const after = await (await page.request.get(`/api/atoms?projectId=${PROJECT_ID}`)).json();
      const a = (after.data || after.atoms || []).find((x: any) => x.id === atomId);
      return a?.metadata?.citation?.doi;
    }).toBe('10.1000/other');
  });
});
