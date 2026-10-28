import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// Columns, third pass: the dividers are easy to grab and move from the keyboard too; a picture inserted with the
// cursor in a column goes into that column and the set of columns grows to fit it. Papers made here are removed.
const TAG = `E2E-C3 ${Date.now()}`;

async function imageClip(request: APIRequestContext) {
  const projects = ((await (await request.get('/api/projects')).json()).data as any[]) ?? [];
  for (const p of projects) {
    const atoms = ((await (await request.get(`/api/atoms?projectId=${encodeURIComponent(p.id)}`)).json()).data as any[]) ?? [];
    const a = atoms.find((x) => x.type === 'image' && x.content?.imageUrl);
    if (a) return { project: p, url: String(a.content.imageUrl) };
  }
  return null;
}

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function start(page: Page, name: string, projectId?: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(name);
  if (projectId) await page.getByTestId('sidebar-project').selectOption({ value: projectId });
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

test('the divider is a wide strip that is always visible, and the arrow keys move it', async ({ page }) => {
  await start(page, `${TAG} divider`);
  const sheet = page.getByTestId('paper-sheet');
  await sheet.locator('.paper-prose p').first().click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click();
  const divider = sheet.locator('.paper-columns-divider').first();
  const box = (await divider.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(16);
  expect(Number(await divider.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.1); // visible at rest
  await divider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const widths = (await sheet.locator('.paper-columns-wrap').first().getAttribute('data-widths'))!.split(',').map(Number);
  expect(widths[0]).toBeGreaterThan(widths[1]);
  // the Columns panel offers widths too when the cursor is in the columns
  await sheet.locator('.paper-column').first().locator('p').click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-width-last').click();
  const last = (await sheet.locator('.paper-columns-wrap').first().getAttribute('data-widths'))!.split(',').map(Number);
  expect(last[2]).toBe(2);
});

test('a picture inserted with the cursor in a column goes in that column and the columns grow to fit it', async ({ page, request }) => {
  const clip = await imageClip(request);
  test.skip(!clip, 'no project with clipped images in this data store');
  // the picture is remote; serve a tall one so the height is real in the test browser
  await page.route(clip!.url, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#325FEC"/></svg>' })
  );
  await start(page, `${TAG} picture`, clip!.project.id);
  const sheet = page.getByTestId('paper-sheet');
  await sheet.locator('.paper-prose p').first().click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click();
  await page.keyboard.type('Text above the picture.');
  const wrap = sheet.locator('.paper-columns-wrap').first();
  const before = (await wrap.boundingBox())!.height;

  await page.getByTestId('sidebar-tab-images').click();
  const row = page.getByTestId('sidebar-row').first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.getByTestId('sidebar-insert').click({ force: true });

  await expect(sheet.locator('.paper-column').first().locator('figure[data-figure]')).toHaveCount(1);
  await expect(sheet.locator('.paper-column').first().locator('img')).toBeAttached();
  await expect.poll(async () => (await wrap.boundingBox())!.height, { timeout: 10000 }).toBeGreaterThan(before + 100);
  // the picture fits the column: never wider than it
  const fit = await sheet.locator('.paper-column').first().evaluate((col) => {
    const img = col.querySelector('img')!.getBoundingClientRect();
    return img.width <= col.getBoundingClientRect().width + 1;
  });
  expect(fit).toBe(true);
});
