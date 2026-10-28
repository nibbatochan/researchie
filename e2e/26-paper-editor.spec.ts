import { test, expect, type Page } from '@playwright/test';

// The paper editor: a created paper opens on a page with the template's headings, text saves and survives a
// reload, template headings can not be typed over, front matter shows on the sheet, header tokens fill in.
// Papers made here are removed for good at the end, so the local .papers-store.json stays clean.
const TAG = `E2E-ED ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function createPaper(page: Page, templateId: string, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId(`template-${templateId}`).click();
  await page.getByTestId('template-use').click();
  if (templateId === 'blank') {
    // Blank has no wizard; it opens as "Untitled paper", so name it here to keep the clean-up working.
    await expect(page.getByTestId('paper-editor')).toBeVisible();
    await page.getByTestId('paper-name').fill(name);
    return;
  }
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

test.describe('26. Paper editor', () => {
  test('a new paper opens on a page with the template headings, saves what you type, and keeps it after a reload', async ({ page }) => {
    await createPaper(page, 'imrad', `${TAG} one`);
    const sheet = page.getByTestId('paper-sheet');
    for (const h of ['Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion']) {
      await expect(sheet.locator('.paper-h1', { hasText: h })).toBeVisible();
    }
    const opened = await page.getByTestId('paper-editor').getAttribute('data-open-ms');
    console.log(`paper editor open time (dev server, cold): ${opened} ms`);

    const intro = sheet.locator('section.paper-section').first().locator('p').first();
    await intro.click();
    await page.keyboard.type('Sleep matters for memory.');
    await expect(page.getByTestId('word-count')).toContainText('4 words');
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });

    await page.reload();
    await expect(page.getByTestId('paper-sheet')).toContainText('Sleep matters for memory.');
    await expect(page).toHaveURL(/paper=/);
  });

  test('nothing is locked: a template heading can be typed over, and select-all and delete empties the paper but keeps one place to type', async ({ page }) => {
    await createPaper(page, 'imrad', `${TAG} two`);
    const sheet = page.getByTestId('paper-sheet');
    const heading = sheet.locator('.paper-h1', { hasText: 'Methods' });
    await heading.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' and materials');
    await expect(heading).toHaveText('Methods and materials');

    await sheet.locator('p').first().click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(sheet.locator('section.paper-section')).toHaveCount(1);
    await page.keyboard.type('Only this.');
    await expect(sheet).toContainText('Only this.');
  });

  test('front matter shows on the sheet; the header fills in its tokens; the style note appears', async ({ page }) => {
    await createPaper(page, 'imrad', `${TAG} three`);
    await page.getByTestId('front-matter-toggle').click();
    const panel = page.getByTestId('front-matter-panel');
    await panel.getByTestId('fm-title').fill('Sleep and memory in adolescents');
    await expect(page.getByTestId('paper-printed-title')).toHaveText('Sleep and memory in adolescents');

    await panel.getByTestId('fm-add-author').click();
    await panel.getByLabel('Author name').fill('Jane Lee');
    await expect(page.getByTestId('paper-front')).toContainText('Jane Lee');

    await page.getByTestId('tb-header-footer').click();
    await page.getByTestId('hf-header-left').fill('{author} · {page}/{pages}');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('paper-header').first()).toContainText(/Lee · 1\/\d+/);

    await expect(page.getByTestId('paper-style').locator('option')).toHaveText(['APA 7', 'Harvard', 'MLA 9', 'Chicago', 'IEEE', 'Vancouver', 'AMA']);
    await expect(page.getByText('APA 7 shows (Lee & Patel, 2020) in the text.').first()).toBeVisible();
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
  });

  test('a paper changed elsewhere gives a choice instead of being overwritten', async ({ page, request }) => {
    await createPaper(page, 'blank', `${TAG} four`);
    const id = new URL(page.url()).searchParams.get('paper')!;
    await page.getByTestId('paper-sheet').locator('p').first().click();
    await page.keyboard.type('first');
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });

    await request.patch(`/api/papers/${id}`, { data: { title: `${TAG} four elsewhere` } }); // another tab saves
    await page.keyboard.type(' second');
    await expect(page.getByTestId('conflict-keep')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('conflict-keep').click();
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
  });
});
