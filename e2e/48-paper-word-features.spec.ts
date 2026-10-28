import { test, expect, type Page } from '@playwright/test';

// Word-style functions: a typeface and a highlight for a run of text (only our own values are stored, so pasted fonts
// and backgrounds are ignored), and Add or Remove space before or after a paragraph. Papers made here are removed.
const TAG = `E2E-WF ${Date.now()}`;

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
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

const para = (page: Page) => page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first();

async function typeAndSelect(page: Page, text: string) {
  const p = para(page);
  await p.click();
  await page.waitForTimeout(300);
  await page.keyboard.type(text);
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.waitForTimeout(300);
  return p;
}

test('a typeface and a highlight apply to the selected text only', async ({ page }) => {
  await open(page, `${TAG} marks`);
  const p = await typeAndSelect(page, 'Styled words here.');
  await page.getByTestId('tb-font').selectOption('georgia');
  await expect(p.locator('span[data-font="georgia"]')).toContainText('Styled words here.');
  expect(await p.locator('span[data-font="georgia"]').evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Georgia');
  await page.getByTestId('tb-highlight').click();
  await page.getByTestId('hl-yellow').click();
  await expect(p.locator('mark[data-hl="yellow"]')).toContainText('Styled words here.');
  expect(await p.locator('mark').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(254, 240, 138)');
  await page.getByTestId('tb-highlight').click();
  await page.getByTestId('hl-none').click();
  await expect(p.locator('mark')).toHaveCount(0);
  await page.getByTestId('tb-font').selectOption('');
  await expect(p.locator('span[data-font]')).toHaveCount(0);
});

test('a font and a background pasted from elsewhere are ignored', async ({ page }) => {
  await open(page, `${TAG} paste`);
  await para(page).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<p><span style="font-family: Comic Sans MS; background-color: red">Foreign words</span> <span data-font="evil">x</span> <mark data-hl="red">y</mark></p>');
    dt.setData('text/plain', 'Foreign words x y');
    document.querySelector('.ProseMirror')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByTestId('paper-sheet')).toContainText('Foreign words');
  await expect(page.locator('.paper-prose span[data-font], .paper-prose mark')).toHaveCount(0);
});

test('Add and Remove space before and after a paragraph', async ({ page }) => {
  await open(page, `${TAG} space`);
  const p = await typeAndSelect(page, 'Spaced paragraph.');
  const margin = (side: 'Top' | 'Bottom') => p.evaluate((el, s) => parseFloat(getComputedStyle(el)[`margin${s}` as 'marginTop']), side);
  expect(await margin('Top')).toBe(0);
  const afterDefault = await margin('Bottom');
  expect(afterDefault).toBeGreaterThan(0);

  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-space-before')).toContainText('Add space before');
  await page.getByTestId('tb-space-before').click();
  await expect.poll(() => margin('Top')).toBe(16); // 12 pt
  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-space-before')).toContainText('Remove space before');
  await page.keyboard.press('Escape');

  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-space-after')).toContainText('Remove space after');
  await page.getByTestId('tb-space-after').click();
  await expect.poll(() => margin('Bottom')).toBe(0);
  await page.getByTestId('tb-line').click();
  await expect(page.getByTestId('tb-space-after')).toContainText('Add space after');
  await page.getByTestId('tb-space-after').click();
  await expect.poll(() => margin('Bottom')).toBe(16);
});

test('select all, then line spacing, changes every paragraph of the paper', async ({ page }) => {
  await open(page, `${TAG} all`);
  const p = para(page);
  await p.click();
  await page.waitForTimeout(300);
  await page.keyboard.type('One.');
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(300);
  await page.getByTestId('tb-line').click();
  await page.getByTestId('tb-line-3').click();
  const ratios = await page.locator('.paper-prose p').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).lineHeight) / parseFloat(getComputedStyle(e).fontSize)));
  expect(ratios.length).toBeGreaterThan(2);
  for (const r of ratios) expect(Math.abs(r - 3)).toBeLessThan(0.05);
});
