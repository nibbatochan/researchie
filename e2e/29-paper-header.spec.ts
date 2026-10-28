import { test, expect, type Page } from '@playwright/test';

// Paper header (micro changes, step 1): Citations and Bibliography sit left of the save status, the header has no
// word count and no Clips button, the Clips sidebar hides and comes back from its strip. Papers made here are removed.
const TAG = `E2E-HD ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function openPaper(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

test.describe('29. Paper header', () => {
  test('save status, Citations and Bibliography sit on the right; no word count or Clips button in the header', async ({ page }) => {
    await openPaper(page, `${TAG} header`);
    const header = page.getByTestId('paper-editor').locator('div').first();
    await expect(header.getByTestId('word-count')).toHaveCount(0);
    await expect(header.getByTestId('sidebar-toggle')).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Bibliography' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Front matter' })).toHaveCount(0);

    const name = (await page.getByTestId('paper-name').boundingBox())!;
    const cite = (await page.getByTestId('paper-style').boundingBox())!;
    const bib = (await page.getByRole('button', { name: 'Bibliography' }).boundingBox())!;
    const save = (await page.getByTestId('save-status').boundingBox())!;
    // the right-hand group: save status, then Citations, then Bibliography
    expect(name.x).toBeLessThan(save.x);
    expect(save.x).toBeLessThan(cite.x);
    expect(cite.x).toBeLessThan(bib.x);
    expect(bib.x + bib.width).toBeGreaterThan(900); // at the right edge of the header
  });

  test('the word count is still shown, under the editor', async ({ page }) => {
    await openPaper(page, `${TAG} count`);
    await expect(page.getByTestId('word-count')).toContainText('words');
    await expect(page.getByTestId('paper-editor').locator('div').first().getByTestId('word-count')).toHaveCount(0);
  });

  test('the Clips sidebar hides with its close button and comes back from the strip', async ({ page }) => {
    await openPaper(page, `${TAG} sidebar`);
    await expect(page.getByTestId('paper-sidebar')).toBeVisible();
    await page.getByTestId('sidebar-close').click();
    await expect(page.getByTestId('paper-sidebar')).toHaveCount(0);
    await page.getByTestId('sidebar-open').click();
    await expect(page.getByTestId('paper-sidebar')).toBeVisible();
  });

  test('Bibliography opens the front-matter panel; changing the citation style keeps the paper text', async ({ page }) => {
    await openPaper(page, `${TAG} style`);
    await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
    await page.keyboard.type('Kept text.');
    await page.getByRole('button', { name: 'Bibliography' }).click();
    await expect(page.getByTestId('front-matter-panel')).toBeVisible();
    await page.getByTestId('paper-style').selectOption('harvard');
    await expect(page.getByTestId('paper-sheet')).toContainText('Kept text.');
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
  });
});
