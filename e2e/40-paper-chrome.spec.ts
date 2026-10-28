import { test, expect } from '@playwright/test';

// Paper mode starts with the app sidebar collapsed and gives it back on leaving; the front-matter panel is a side
// drawer that leaves the page its width; the header & footer button has a word on it.
const TAG = `E2E-CH ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

test('paper mode collapses the app sidebar, and the front-matter drawer does not squeeze the page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const nav = page.getByPlaceholder('Search streams...');
  await expect(nav).toBeVisible();
  await page.getByTestId('paper-mode-button').click();
  await expect(nav).toHaveCount(0);
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} chrome`);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(nav).toHaveCount(0);
  await expect(page.getByTestId('tb-header-footer')).toContainText('Header');

  const before = (await page.getByTestId('paper-sheet').boundingBox())!.width;
  await page.getByTestId('front-matter-toggle').click();
  const panel = page.getByTestId('front-matter-panel');
  await expect(panel).toBeVisible();
  const after = (await page.getByTestId('paper-sheet').boundingBox())!.width;
  expect(after).toBe(before);
  const box = (await panel.boundingBox())!;
  expect(box.x + box.width).toBeGreaterThan(1270); // against the right edge
});
