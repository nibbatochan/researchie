import { test, expect, type Page } from '@playwright/test';

// The editor toolbar (rethought from a real journal article): paragraph styles with the article's type scale, font
// size, alignment, spacing, indent, structure tools that add and remove sections and headings, and page layout.
// Papers made here are removed for good at the end.
const TAG = `E2E-TB ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function newPaper(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

const intro = (page: Page) => page.getByTestId('paper-sheet').locator('section.paper-section').first();

test.describe('28. Paper toolbar', () => {
  test('the toolbar has the tools the article needs and none of the insert tools left for paste', async ({ page }) => {
    await newPaper(page, `${TAG} tools`);
    const bar = page.getByTestId('paper-toolbar');
    for (const name of ['Undo', 'Redo', 'Bold', 'Italic', 'Underline', 'More text formats', 'Alignment', 'Line spacing', 'Lists', 'Columns', 'Header and footer', 'Page', 'Link', 'Remove the heading']) {
      await expect(bar.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(bar.getByLabel('Paragraph style')).toBeVisible();
    await expect(bar.getByLabel('Font size')).toBeVisible();
    await page.getByTestId('tb-more-text').click();
    for (const name of ['Subscript', 'Superscript', 'Clear formatting']) await expect(page.getByRole('menuitemradio', { name })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('tb-lists').click();
    for (const name of ['Bulleted list', 'Numbered list']) await expect(page.getByRole('menuitemradio', { name })).toBeVisible();
    await page.keyboard.press('Escape');
    // alignment, spacing, columns, header & footer and page settings are one button each
    for (const name of ['Align left', 'Centre', 'Align right', 'Justify', 'Add page', 'Delete page']) await expect(bar.getByRole('button', { name, exact: true })).toHaveCount(0);
    // not yet: these arrive by paste
    await expect(bar.getByRole('button', { name: 'Insert table' })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: 'Insert formula' })).toHaveCount(0);
  });

  test('a paragraph style carries the journal type scale; alignment, indent, spacing and size apply', async ({ page }) => {
    await newPaper(page, `${TAG} style`);
    const p = intro(page).locator('p').first();
    await p.click();
    await page.keyboard.type('Fig 1. A caption for a figure.');
    // body text is 10 pt (13.33 px)
    await expect(p).toHaveCSS('font-size', '13.3333px');

    await page.getByTestId('tb-style').selectOption('caption');
    await expect(p).toHaveAttribute('data-variant', 'caption');
    await expect(p).toHaveCSS('font-size', '10.6667px'); // 8 pt

    await page.getByTestId('tb-style').selectOption('body');
    await page.getByTestId('tb-align').click();
    await page.getByTestId('tb-align-justify').click();
    await expect(p).toHaveAttribute('data-align', 'justify');
    await page.getByTestId('tb-line').click();
    await page.getByTestId('tb-indent').click();
    await expect(p).toHaveAttribute('data-indent', 'first');
    await page.getByTestId('tb-line').click();
    await page.getByTestId('tb-line-2').click();
    await expect(p).toHaveAttribute('data-line', '2');

    // a font size on a selected word
    await p.click();
    await page.keyboard.press('Home');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight'); // select the first four characters
    await expect(page.getByTestId('tb-size')).toBeEnabled();
    await page.getByTestId('tb-size').selectOption('16');
    await expect(p.locator('span[data-size="16"]')).toHaveCount(1);

    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
    await page.reload();
    await expect(intro(page).locator('p').first()).toHaveAttribute('data-align', 'justify');
    await expect(intro(page).locator('span[data-size="16"]')).toHaveCount(1);
  });

  test('a heading can be removed from the toolbar; Section and Delete Section are gone', async ({ page }) => {
    await newPaper(page, `${TAG} structure`);
    const sheet = page.getByTestId('paper-sheet');
    const headings = sheet.locator('.paper-h1');
    await expect(headings).toHaveCount(5);

    await intro(page).locator('p').first().click();
    await page.keyboard.type('Keep this text.');
    await page.getByTestId('tb-remove-heading').click();
    await expect(headings).toHaveCount(4);
    await expect(intro(page)).toContainText('Keep this text.'); // the text stays

    // the toolbar no longer has Section or Delete Section; a section goes by selecting it and deleting
    await expect(page.getByTestId('tb-add-section')).toHaveCount(0);
    await expect(page.getByTestId('tb-remove-section')).toHaveCount(0);
  });

  test('blocks of the page can be taken away and brought back; columns, margins and typeface change the sheet', async ({ page }) => {
    await newPaper(page, `${TAG} layout`);
    await page.getByTestId('front-matter-toggle').click();
    const panel = page.getByTestId('front-matter-panel');
    await expect(page.getByTestId('paper-printed-title')).toBeVisible();
    await panel.getByText('Structure: show or remove').click();
    await panel.getByTestId('fm-show-title').uncheck();
    await expect(page.getByTestId('paper-printed-title')).toHaveCount(0);
    await panel.getByTestId('fm-show-references').uncheck();
    await expect(page.getByTestId('paper-references')).toHaveCount(0);
    await panel.getByTestId('fm-show-references').check();
    await expect(page.getByTestId('paper-references')).toBeVisible();

    await panel.getByText('Layout', { exact: true }).click();
    await page.getByTestId('tb-columns').click();
    await page.getByTestId('col-paper-2').click();
    await expect(page.getByTestId('paper-sheet')).toHaveAttribute('data-columns', '2');
    await expect(page.locator('.paper-prose').first()).toHaveCSS('column-count', '2');
    await page.keyboard.press('Escape');
    await page.getByTestId('tb-page').click();
    await page.getByTestId('ps-margin').selectOption('narrow');
    await expect(page.getByTestId('paper-sheet')).toHaveAttribute('data-margin', 'narrow');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await panel.getByTestId('fm-font').selectOption('serif');
    await expect(page.getByTestId('paper-sheet')).toHaveAttribute('data-font', 'serif');
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
  });
});
