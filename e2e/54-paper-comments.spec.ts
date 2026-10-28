import { test, expect, type Page } from '@playwright/test';

// Comments on selected text (Word-style): select words, press Comment, write the note. The words get a highlight and the
// note sits in the right margin. The eye button hides and shows the notes; Delete on a note removes it and its highlight.
// Papers made here are removed at the end.
const TAG = `E2E-CM ${Date.now()}`;

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
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(name);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

test('select text, comment, hide and show the notes, and delete a note', async ({ page }) => {
  test.setTimeout(90000);
  await open(page, `${TAG} comment`);
  const p = page.getByTestId('paper-sheet').locator('.paper-prose p').first();
  await p.click();
  await page.keyboard.type('The sample was small and the effect was clear.');
  await expect(page.getByTestId('tb-comment')).toBeDisabled();
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('tb-comment')).toBeEnabled();
  await page.getByTestId('tb-comment').click();
  await page.getByTestId('tb-comment-text').fill('Check the sample size.');
  await page.getByTestId('tb-comment-add').click();
  await expect(page.locator('.paper-comment')).toHaveText('The ');
  await expect(page.getByTestId('comment-pin')).toContainText('Check the sample size.');

  await page.getByTestId('tb-comments-toggle').click();
  await expect(page.getByTestId('comment-pin')).toHaveCount(0);
  await page.getByTestId('tb-comments-toggle').click();
  await expect(page.getByTestId('comment-pin')).toHaveCount(1);

  await page.getByTestId('comment-pin-delete').click();
  await page.getByTestId('comment-pin-cancel').click();
  await expect(page.getByTestId('comment-pin')).toHaveCount(1);
  await page.getByTestId('comment-pin-delete').click();
  await page.getByTestId('comment-pin-confirm').click();
  await expect(page.locator('.paper-comment')).toHaveCount(0);
  await expect(page.getByTestId('comment-pin')).toHaveCount(0);
});

test('a comment survives a reload', async ({ page }) => {
  test.setTimeout(90000);
  await open(page, `${TAG} keep`);
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.keyboard.type('Keep this sentence.');
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.getByTestId('tb-comment').click();
  await page.getByTestId('tb-comment-text').fill('Stays after reload.');
  await page.getByTestId('tb-comment-add').click();
  await page.waitForTimeout(2500);
  await page.reload();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(page.locator('.paper-comment')).toHaveCount(1);
  await expect(page.getByTestId('comment-pin')).toContainText('Stays after reload.');
});

test('with comments hidden the highlight is gone; the link on a note makes the commented text breathe', async ({ page }) => {
  test.setTimeout(90000);
  await open(page, `${TAG} link`);
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.keyboard.type('Breathing text here.');
  await page.keyboard.press('Home');
  for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.getByTestId('tb-comment').click();
  await page.getByTestId('tb-comment-text').fill('Look here.');
  await page.getByTestId('tb-comment-add').click();
  const bg = () => page.locator('.paper-comment').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg()).not.toBe('rgba(0, 0, 0, 0)');
  await page.getByTestId('tb-comments-toggle').click();
  expect(await bg()).toBe('rgba(0, 0, 0, 0)');
  await page.getByTestId('tb-comments-toggle').click();
  await page.getByTestId('comment-pin-link').click();
  await expect(page.locator('.paper-comment-breathe')).toHaveCount(1);
});
