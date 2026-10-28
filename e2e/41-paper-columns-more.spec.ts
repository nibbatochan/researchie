import { test, expect, type Page } from '@playwright/test';

// Columns, second pass: a delete icon beside the set (undo brings it back), and text of other styles and sizes in a
// column takes line spacing the same way as on the page. Papers made here are removed at the end.
const TAG = `E2E-C2 ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function withColumns(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click();
}

test('the delete icon removes the whole set of columns, and undo brings it back', async ({ page }) => {
  await withColumns(page, `${TAG} delete`);
  const sheet = page.getByTestId('paper-sheet');
  await page.keyboard.type('Inside the columns.');
  await expect(sheet.locator('.paper-column')).toHaveCount(3);
  const wrap = sheet.locator('.paper-columns-wrap').first();
  await wrap.hover();
  await expect(wrap.getByTestId('columns-delete')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await wrap.getByTestId('columns-delete').click();
  await expect(sheet.locator('.paper-column')).toHaveCount(0);
  await expect(sheet).not.toContainText('Inside the columns.');
  await page.keyboard.press('Control+z');
  await expect(sheet.locator('.paper-column')).toHaveCount(3);
  await expect(sheet).toContainText('Inside the columns.');
});

test('empty columns delete with no confirm', async ({ page }) => {
  await withColumns(page, `${TAG} empty`);
  const sheet = page.getByTestId('paper-sheet');
  await expect(sheet.locator('.paper-column')).toHaveCount(3);
  let dialogSeen = false;
  page.on('dialog', (d) => { dialogSeen = true; void d.dismiss(); });
  const wrap = sheet.locator('.paper-columns-wrap').first();
  await wrap.hover();
  await wrap.getByTestId('columns-delete').click();
  await expect(sheet.locator('.paper-column')).toHaveCount(0);
  expect(dialogSeen).toBe(false);
});

test('cancelling the confirm keeps the columns and their text', async ({ page }) => {
  await withColumns(page, `${TAG} cancel`);
  const sheet = page.getByTestId('paper-sheet');
  await page.keyboard.type('Keep me.');
  const dialogShown = new Promise<string>((resolve) => page.once('dialog', (d) => { void d.dismiss(); resolve(d.message()); }));
  const wrap = sheet.locator('.paper-columns-wrap').first();
  await wrap.hover();
  await wrap.getByTestId('columns-delete').click();
  expect(await dialogShown).toBe('Delete these columns and everything in them? You can undo it with Ctrl+Z.');
  await expect(sheet.locator('.paper-column')).toHaveCount(3);
  await expect(sheet).toContainText('Keep me.');
});

test('styles and sizes inside a column take line spacing like the page does', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await withColumns(page, `${TAG} spacing`);
  const sheet = page.getByTestId('paper-sheet');
  const col = sheet.locator('.paper-column').first();
  await page.keyboard.type('Heading words');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Caption words that run long enough to wrap onto a second line in a narrow column.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Large words that also wrap onto several lines in the narrow column here.');

  const ratio = (loc: ReturnType<typeof col.locator>) => loc.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize));
  const setSpacing = async (value: string) => {
    await page.getByTestId('tb-line').click();
    await page.getByTestId(`tb-line-${value}`).click();
  };

  // 1) a sub-heading inside the column (the Style menu must work here)
  await col.locator('p').first().click();
  await page.waitForTimeout(300); // the editor takes the click's selection a moment later
  await page.getByTestId('tb-style').selectOption('h2');
  await expect(col.locator('h2')).toHaveCount(1);
  await setSpacing('2');
  expect(Math.abs((await ratio(col.locator('h2'))) - 2)).toBeLessThan(0.05);

  // 2) a caption (8 pt) keeps its own size and takes the spacing
  const caption = col.locator('p').first();
  await caption.click();
  await page.waitForTimeout(300);
  await page.getByTestId('tb-style').selectOption('caption');
  await setSpacing('3');
  await expect(caption).toHaveAttribute('data-variant', 'caption');
  expect(Math.abs((await ratio(caption)) - 3)).toBeLessThan(0.05);

  // 3) body text at 16 pt: the size mark does not break the spacing
  const body = col.locator('p').nth(1);
  await body.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.waitForTimeout(300);
  await page.getByTestId('tb-size').selectOption('16');
  await expect(body.locator('span[data-size="16"]').first()).toBeAttached();
  await setSpacing('2.5');
  expect(Math.abs((await ratio(body)) - 2.5)).toBeLessThan(0.05);
  const spanSize = await body.locator('span[data-size="16"]').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const bodyHeight = (await body.boundingBox())!.height;
  expect(bodyHeight).toBeGreaterThan(spanSize * 2.5); // at least one 16 pt line at 2.5

  expect(errors).toEqual([]);
});
