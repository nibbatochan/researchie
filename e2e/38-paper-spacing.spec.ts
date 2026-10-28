import { test, expect, type Page } from '@playwright/test';

// Line spacing: the menu names what it shows ("Spacing 2"), and the spacing really changes the lines, in the page
// text and inside a column. Papers made here are removed at the end.
const TAG = `E2E-SP ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function open(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

async function setSpacing(page: Page, value: string) {
  await page.getByTestId('tb-line').click();
  await page.getByTestId(`tb-line-${value}`).click();
}

const lineHeightPx = (p: ReturnType<Page['locator']>) => p.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));

test('spacing changes the lines of a page paragraph', async ({ page }) => {
  await open(page, `${TAG} page`);
  const p = page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first();
  await p.click();
  await page.keyboard.type('Spacing words in the page text.');
  const before = await lineHeightPx(p);
  await setSpacing(page, '2');
  await expect.poll(() => lineHeightPx(p)).toBeGreaterThan(before * 1.2);
  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-line-2')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
});

test('spacing changes the lines of a paragraph inside a column', async ({ page }) => {
  await open(page, `${TAG} column`);
  await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click();
  await page.keyboard.type('Spacing words in a column.');
  const p = page.getByTestId('paper-sheet').locator('.paper-column').first().locator('p').first();
  const before = await lineHeightPx(p);
  await setSpacing(page, '2');
  await expect.poll(() => lineHeightPx(p)).toBeGreaterThan(before * 1.2);
  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-line-2')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
});

test('a chosen spacing wins over a caption style, and the menu names the normal spacing', async ({ page }) => {
  await open(page, `${TAG} caption`);
  const p = page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first();
  await p.click();
  await page.keyboard.type('A caption with spacing.');
  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-line-1.4')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await page.getByTestId('tb-style').selectOption('caption');
  const before = await lineHeightPx(p);
  await setSpacing(page, '3');
  await expect.poll(() => lineHeightPx(p)).toBeGreaterThan(before * 2);
});

test('spacing touches only the selected paragraphs, or the cursor paragraph when nothing is selected', async ({ page }) => {
  await open(page, `${TAG} only`);
  const first = page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first();
  await first.click();
  await page.keyboard.type('One.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Two.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Three.');
  const paras = page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('.paper-prose p, p').filter({ hasText: /^(One|Two|Three)\.$/ });
  await expect(paras).toHaveCount(3);
  const base = await lineHeightPx(paras.nth(0));
  // cursor in "Two." and nothing selected: only that paragraph changes
  await paras.nth(1).click();
  await setSpacing(page, '3');
  await expect.poll(() => lineHeightPx(paras.nth(1))).toBeGreaterThan(base * 1.5);
  expect(await lineHeightPx(paras.nth(0))).toBe(base);
  expect(await lineHeightPx(paras.nth(2))).toBe(base);
  // select "Three." to the end of "One."? select only paragraph 1 and 2: the third stays
  await paras.nth(0).click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+ArrowDown');
  await setSpacing(page, '2');
  await expect.poll(() => lineHeightPx(paras.nth(0))).toBeGreaterThan(base * 1.2);
  expect(await lineHeightPx(paras.nth(2))).toBe(base);
});
