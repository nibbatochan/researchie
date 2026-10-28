import { test, expect } from '@playwright/test';

// Zoom: the toolbar buttons and Alt + mouse wheel change the sheet's zoom; the page layout keeps working at every zoom,
// and a comment note stays inside the window. Papers made here are removed at the end.
const TAG = `E2E-ZOOM ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
});

test('zoom buttons and Alt + wheel zoom the sheet, and the layout still settles', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} zoom`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(page.getByTestId('tb-zoom-reset')).toHaveText('100%');

  await page.getByTestId('tb-zoom-in').click();
  await expect(page.getByTestId('tb-zoom-reset')).toHaveText('110%');
  await page.getByTestId('tb-zoom-out').click();
  await page.getByTestId('tb-zoom-out').click();
  await expect(page.getByTestId('tb-zoom-reset')).toHaveText('90%');
  await page.getByTestId('tb-zoom-reset').click();
  await expect(page.getByTestId('tb-zoom-reset')).toHaveText('100%');

  await page.locator('[data-testid="paper-editor"]').hover();
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Alt');
  await expect(page.getByTestId('tb-zoom-reset')).toHaveText('110%');
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 300);
  await page.mouse.wheel(0, 300);
  await page.keyboard.up('Alt');
  await expect(page.getByTestId('tb-zoom-reset')).toHaveText('90%');

  // the sheet is drawn at the zoom, and the pages are laid out with it
  const zoomStyle = await page.getByTestId('paper-sheet').evaluate((el) => (el as HTMLElement).style.zoom);
  expect(zoomStyle).toBe('0.9');
  await expect(page.getByTestId('tall-block-note')).toHaveCount(0);
  await page.getByTestId('tb-zoom-reset').click();
});

test('a comment note stays on screen at the default zoom', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} note`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.keyboard.type('The sample was small and the effect was clear.');
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.getByTestId('tb-comment').click();
  await page.getByTestId('tb-comment-text').fill('Fits on screen.');
  await page.getByTestId('tb-comment-add').click();
  const pin = page.getByTestId('comment-pin');
  await expect(pin).toHaveCount(1);
  const box = await pin.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
});
