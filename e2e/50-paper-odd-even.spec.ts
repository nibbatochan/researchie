import { test, expect, type Page } from '@playwright/test';

// Odd & even pages (Word's "Different odd & even pages") in the paper header and footer. The displayed number
// decides the zones: even numbers take the even boxes. Papers made here are removed at the end.
const TAG = `E2E-OE ${Date.now()}`;

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

/** Types enough lines to run past two A4 pages, so there are at least three pages. */
async function fillPastTwoPages(page: Page) {
  const first = page.getByTestId('paper-sheet').locator('.paper-prose p').first();
  await first.click();
  await page.waitForTimeout(300);
  await page.keyboard.type('Line 1');
  for (let i = 2; i <= 150; i++) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(`Line ${i}`);
  }
}

const pageBoxes = (page: Page) => page.locator('[data-page-box]');

test.describe('50. Paper odd & even pages', () => {
  test('odd pages take the odd footer and even pages the even footer', async ({ page }) => {
    await openBlank(page, `${TAG} odd even`);
    await fillPastTwoPages(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 20000 }).toBeGreaterThanOrEqual(3);
    await page.getByTestId('tb-header-footer').click();
    await page.getByTestId('hf-oddeven').check();
    await expect(page.getByTestId('hf-even-footer-center')).toBeVisible();
    await page.getByTestId('hf-footer-center').fill('ODD {page}');
    await page.getByTestId('hf-even-footer-center').fill('EVEN {page}');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(pageBoxes(page).nth(0).getByTestId('paper-footer')).toContainText('ODD 1');
    await expect(pageBoxes(page).nth(1).getByTestId('paper-footer')).toContainText('EVEN 2');
    await expect(pageBoxes(page).nth(2).getByTestId('paper-footer')).toContainText('ODD 3');
  });

  test('with numbering starting at 2, the first page counts as even', async ({ page }) => {
    await openBlank(page, `${TAG} start at two`);
    await fillPastTwoPages(page);
    await expect.poll(() => pageBoxes(page).count(), { timeout: 20000 }).toBeGreaterThanOrEqual(3);
    await page.getByTestId('tb-header-footer').click();
    await page.getByTestId('hf-start').fill('2');
    await page.getByTestId('hf-oddeven').check();
    await page.getByTestId('hf-footer-center').fill('ODD {page}');
    await page.getByTestId('hf-even-footer-center').fill('EVEN {page}');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(pageBoxes(page).nth(0).getByTestId('paper-footer')).toContainText('EVEN 2');
    await expect(pageBoxes(page).nth(1).getByTestId('paper-footer')).toContainText('ODD 3');
    await expect(pageBoxes(page).nth(2).getByTestId('paper-footer')).toContainText('EVEN 4');
  });
});
