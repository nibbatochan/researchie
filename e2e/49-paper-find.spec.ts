import { test, expect, type Page } from '@playwright/test';

// Find and replace: Ctrl+F or the toolbar button opens the bar; matches are marked; Enter walks through them; Replace
// and Replace all change the text; Replace all is one step for Ctrl+Z. Papers made here are removed at the end.
const TAG = `E2E-FR ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function withText(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
  await page.waitForTimeout(300);
  await page.keyboard.type('Cat sat. The cat saw a Cat. Concatenate.');
}

test('Ctrl+F opens the bar, counts and marks matches, and Enter walks through them', async ({ page }) => {
  await withText(page, `${TAG} find`);
  await page.keyboard.press('Control+f');
  await expect(page.getByTestId('find-bar')).toBeVisible();
  await expect(page.getByTestId('find-input')).toBeFocused();
  await page.getByTestId('find-input').fill('cat');
  await expect(page.getByTestId('find-count')).toHaveText('1 of 4'); // Cat, cat, Cat, Concatenate
  await expect(page.locator('.paper-find')).toHaveCount(4);
  await expect(page.locator('.paper-find-current')).toHaveCount(1);
  await page.getByTestId('find-word').check();
  await expect(page.getByTestId('find-count')).toHaveText('1 of 3'); // not inside Concatenate
  await page.getByTestId('find-case').check();
  await expect(page.getByTestId('find-count')).toHaveText('1 of 1'); // small "cat" as a whole word: only the second one
  await page.getByTestId('find-input').fill('Cat');
  await expect(page.getByTestId('find-count')).toHaveText('1 of 2');
  await page.getByTestId('find-input').press('Enter');
  await expect(page.getByTestId('find-count')).toHaveText('1 of 2');
  await page.getByTestId('find-input').press('Enter');
  await expect(page.getByTestId('find-count')).toHaveText('2 of 2');
  await page.getByTestId('find-input').press('Enter'); // wraps
  await expect(page.getByTestId('find-count')).toHaveText('1 of 2');
  await page.getByTestId('find-input').press('Escape');
  await expect(page.getByTestId('find-bar')).toHaveCount(0);
  await expect(page.locator('.paper-find')).toHaveCount(0); // the marks go with the bar
});

test('the toolbar button opens it with the selected text', async ({ page }) => {
  await withText(page, `${TAG} button`);
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(300);
  await page.getByTestId('tb-find').click();
  await expect(page.getByTestId('find-input')).toHaveValue('Cat');
});

test('Replace changes one match, Replace all changes the rest in one step that undo reverses', async ({ page }) => {
  await withText(page, `${TAG} replace`);
  await page.getByTestId('tb-find').click();
  await page.getByTestId('find-input').fill('cat');
  await page.getByTestId('replace-input').fill('dog');
  await page.getByTestId('find-word').check();
  await page.getByTestId('find-input').press('Enter');
  await page.getByTestId('replace-one').click();
  const sheet = page.getByTestId('paper-sheet');
  await expect(sheet).toContainText('dog sat. The cat saw a Cat.');
  await page.getByTestId('replace-all').click();
  await expect(sheet).toContainText('dog sat. The dog saw a dog. Concatenate.');
  await expect(page.getByTestId('find-count')).toHaveText('No matches');
  await page.getByTestId('find-close').click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Control+z'); // Replace all was one step
  await expect(sheet).toContainText('dog sat. The cat saw a Cat.');
});
