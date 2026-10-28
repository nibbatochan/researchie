import { test, expect } from '@playwright/test';

// Step 6: Columns. Insert at the cursor (2 to 6), type in a column, drag a divider to resize, the paper still saves,
// and the widths come back after a reload. Papers made here are removed at the end.
const TAG = `E2E-CO ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

test('columns insert, take text, resize from a divider, and keep their widths', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} cols`);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();

  await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click();
  const sheet = page.getByTestId('paper-sheet');
  await expect(sheet.locator('.paper-column')).toHaveCount(3);

  await sheet.locator('.paper-column').nth(1).locator('p').click();
  await page.keyboard.type('Middle column text.');
  await expect(sheet.locator('.paper-column').nth(1)).toContainText('Middle column text.');

  const divider = sheet.locator('.paper-columns-divider').first();
  const box = await divider.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 6);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + 6, { steps: 6 });
  await page.mouse.up();
  await expect(sheet.locator('.paper-columns-wrap').first()).not.toHaveAttribute('data-widths', '');
  const widths = await sheet.locator('.paper-columns-wrap').first().getAttribute('data-widths');
  expect(widths).not.toBe('');
  const [a, b] = widths!.split(',').map(Number);
  expect(a).toBeGreaterThan(b);

  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 10000 });
  await page.reload();
  await expect(page.getByTestId('paper-sheet').locator('.paper-columns-wrap').first()).toHaveAttribute('data-widths', widths!);
  await expect(page.getByTestId('paper-sheet').locator('.paper-column').nth(1)).toContainText('Middle column text.');
});

test('the Columns panel sets the count and widths, resets them, and removes the columns keeping the text', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} panel`);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  const sheet = page.getByTestId('paper-sheet');
  await sheet.locator('section.paper-section').first().locator('p').first().click();

  await page.getByTestId('tb-columns').click();
  await expect(page.getByTestId('col-equal')).toHaveCount(0); // not in columns yet, so no "these columns" actions
  await page.getByTestId('col-count-4').click();
  await page.getByTestId('col-preset-first').check();
  await page.getByTestId('col-insert').click();
  await expect(sheet.locator('.paper-column')).toHaveCount(4);
  await expect(sheet.locator('.paper-columns-wrap').first()).toHaveAttribute('data-widths', '2,1,1,1');

  await page.keyboard.type('Stay put.');
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-equal').click();
  await expect(sheet.locator('.paper-columns-wrap').first()).toHaveAttribute('data-widths', '');

  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-remove').click();
  await expect(sheet.locator('.paper-column')).toHaveCount(0);
  await expect(sheet).toContainText('Stay put.');
});

test('the toolbar fits in two rows at a laptop width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} width`);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-toolbar')).toBeVisible();
  const box = await page.getByTestId('paper-toolbar').boundingBox();
  console.log('TOOLBAR HEIGHT', box!.height);
  expect(box!.height).toBeLessThan(80);
});
