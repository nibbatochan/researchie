import { test, expect } from '@playwright/test';

// Comment notes sit in the right margin beside the text they are on, and are not printed. Papers made here are removed.
const TAG = `E2E-PIN ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
});

test('a comment shows as a note in the right margin, next to its text', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} margin`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  const p = page.getByTestId('paper-sheet').locator('.paper-prose p').first();
  await p.click();
  await page.keyboard.type('The sample was small and the effect was clear.');
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.getByTestId('tb-comment').click();
  await page.getByTestId('tb-comment-text').fill('Check the sample size.');
  await page.getByTestId('tb-comment-add').click();
  const pin = page.getByTestId('comment-pin');
  await expect(pin).toHaveCount(1);
  await expect(pin).toContainText('Check the sample size.');
  const sheet = await page.getByTestId('paper-sheet').boundingBox();
  const box = await pin.boundingBox();
  expect(box!.x).toBeGreaterThan(sheet!.x + sheet!.width - 1);
  const pinTop = box!.y;
  const textTop = (await p.boundingBox())!.y;
  expect(Math.abs(pinTop - textTop)).toBeLessThan(120);
  await page.screenshot({ path: `${process.env.SHOTDIR ?? 'test-results'}/comment-pin.png` });
});
