import { test, expect, type Page } from '@playwright/test';

// Pages (micro changes, step 3): fixed A4 pages, content flows onto a new page, Add page, Delete page (with confirm),
// Go to page, and Header & footer (different first page, start numbering, page number tokens). Papers made here are
// removed at the end.
const TAG = `E2E-PG ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function openBlank(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(name);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

/** Types enough lines to run past the first A4 page. */
async function fillPastOnePage(page: Page) {
  const first = page.getByTestId('paper-sheet').locator('.paper-prose p').first();
  await first.click();
  await page.keyboard.type('Line 1');
  for (let i = 2; i <= 70; i++) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(`Line ${i}`);
  }
}

const pageBoxes = (page: Page) => page.locator('[data-page-box]');

test.describe('32. Paper pages', () => {
  test('text that runs past one A4 page flows onto a second page', async ({ page }) => {
    await openBlank(page, `${TAG} flow`);
    await expect(pageBoxes(page)).toHaveCount(1);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    // a paragraph was moved down to the top of page 2 with padding
    await expect(page.locator('.paper-prose p[style*="padding-top"]').first()).toBeAttached();
  });

  test('Add page puts a page break at the cursor and starts a new page after it', async ({ page }) => {
    await openBlank(page, `${TAG} add`);
    await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
    await page.keyboard.type('Before the break.');
    await page.getByTestId('tb-page').click();
    await page.getByTestId('ps-add').click();
    await expect(page.locator('[data-page-break]')).toHaveCount(1);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 10000 }).toBeGreaterThanOrEqual(2);
    await page.keyboard.type('After the break.');
    await expect(page.getByTestId('paper-sheet')).toContainText('After the break.');
  });

  test('Delete page removes the page picked in the list after a confirm', async ({ page }) => {
    await openBlank(page, `${TAG} delete`);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('paper-sheet')).toContainText('Line 70');
    const last = await pageBoxes(page).count(); // the cursor is at the end, on the last page
    await page.getByTestId('tb-page').click();
    page.once('dialog', (d) => d.accept());
    await page.getByTestId(`ps-delete-${last}`).click(); // picked from the list
    await expect(page.getByTestId('paper-sheet')).not.toContainText('Line 70');
    await expect(page.getByTestId('paper-sheet')).toContainText('Line 1');
  });

  test('Delete page does nothing when the person says no', async ({ page }) => {
    await openBlank(page, `${TAG} cancel`);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    await page.getByTestId('tb-page').click();
    page.once('dialog', (d) => d.dismiss());
    await page.getByTestId('ps-delete-2').click();
    await expect(page.getByTestId('paper-sheet')).toContainText('Line 70');
  });

  test('Header & footer: no header or footer on page 1 when different first page is on; numbering starts where set', async ({ page }) => {
    await openBlank(page, `${TAG} header`);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    await page.getByTestId('tb-header-footer').click();
    await page.getByTestId('hf-footer-center').fill('{page}');
    await page.getByTestId('hf-first').check();
    await page.getByTestId('hf-start').fill('3');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(pageBoxes(page).nth(0).getByTestId('paper-footer')).toHaveCount(0);
    await expect(pageBoxes(page).nth(1).getByTestId('paper-footer')).toContainText('4');
  });

  test('Go to page scrolls to the page box', async ({ page }) => {
    await openBlank(page, `${TAG} goto`);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    await page.getByTestId('tb-page').click();
    await page.getByTestId('ps-go-2').click();
    await expect(pageBoxes(page).nth(1)).toBeInViewport({ ratio: 0.1 });
  });

  test('Delete page can pick page 1 while the cursor is on page 2', async ({ page }) => {
    await openBlank(page, `${TAG} pick`);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    await page.getByTestId('tb-page').click();
    await expect(page.getByTestId(`ps-page-${await pageBoxes(page).count()}`)).toContainText('cursor is here');
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('ps-delete-1').click();
    await expect(page.getByTestId('paper-sheet')).not.toContainText(/Line 1(?!\d)/);
    await expect(page.getByTestId('paper-sheet')).toContainText('Line 70');
  });

  test('Delete page can be undone with Ctrl+Z', async ({ page }) => {
    await openBlank(page, `${TAG} undo`);
    await fillPastOnePage(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    const last = await pageBoxes(page).count();
    await page.getByTestId('tb-page').click();
    page.once('dialog', (d) => d.accept());
    await page.getByTestId(`ps-delete-${last}`).click();
    await expect(page.getByTestId('paper-sheet')).not.toContainText('Line 70');
    await page.waitForTimeout(800);
    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('paper-sheet')).toContainText('Line 70');
    await expect(page.getByTestId('paper-sheet')).toContainText('Line 40');
  });
});
