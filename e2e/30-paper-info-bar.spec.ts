import { test, expect, type Page } from '@playwright/test';

// The info bar under the paper header (micro changes, step 2): shown once after a paper is created, has a close
// button, stays closed on reload, and shows again only for the next new paper. Logout and login need the
// tester accounts, so they are checked by hand (see the report). Papers made here are removed at the end.
const TAG = `E2E-IB ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function createPaper(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

test.describe('30. Paper info bar', () => {
  test('shown after a paper is created, closed with the X, and gone after a reload', async ({ page }) => {
    await createPaper(page, `${TAG} first`);
    const bar = page.getByTestId('info-bar');
    await expect(bar).toContainText('APA 7 shows (Lee & Patel, 2020) in the text.');
    await expect(page.getByTestId('info-close')).toBeVisible();

    await page.getByTestId('info-close').click();
    await expect(bar).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('paper-editor')).toBeVisible();
    await expect(bar).toHaveCount(0);
  });

  test('a new paper shows the note again, and an older paper opened later does not', async ({ page }) => {
    await createPaper(page, `${TAG} second`);
    await page.getByTestId('info-close').click();
    await page.getByTestId('paper-back').click();

    await createPaper(page, `${TAG} third`);
    await expect(page.getByTestId('info-bar')).toBeVisible();
    await page.getByTestId('info-close').click();
    await page.getByTestId('paper-back').click();

    await page.getByTestId('paper-row').filter({ hasText: `${TAG} second` }).first().getByTestId('paper-title').click();
    await expect(page.getByTestId('paper-editor')).toBeVisible();
    await expect(page.getByTestId('info-bar')).toHaveCount(0);
  });

  test('the note follows the style that is chosen', async ({ page }) => {
    await createPaper(page, `${TAG} style`);
    await page.getByTestId('paper-style').selectOption('vancouver');
    await expect(page.getByTestId('info-bar')).toContainText('Vancouver shows (1) in the text');
    await page.getByTestId('paper-style').selectOption('harvard');
    await expect(page.getByTestId('info-bar')).toContainText('Harvard shows (Lee and Patel, 2020) in the text');
  });
});
