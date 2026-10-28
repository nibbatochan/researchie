import { test, expect, type Page } from '@playwright/test';

// Step 3 (micro changes): text colour from swatches, a full picker and a hex box; the selection on the paper sheet
// keeps dark text in dark mode; Section and Delete Section are gone from the toolbar. Papers made here are removed.
const TAG = `E2E-CL ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function openPaperWithText(page: Page, name: string, text: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  const p = page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first();
  await p.click();
  await page.keyboard.type(text);
  await page.waitForTimeout(400); // let the page layout settle before selecting (it moves blocks after typing)
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  return p;
}

test.describe('31. Paper colour and selection', () => {
  test('a swatch colours the selected text', async ({ page }) => {
    const p = await openPaperWithText(page, `${TAG} swatch`, 'Coloured words here.');
    await page.getByTestId('tb-color').click();
    await page.getByRole('button', { name: 'Colour #DC2626' }).click();
    await expect(p.locator('span[style*="color"]')).toContainText('Coloured words here.');
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
  });

  test('a hex code typed in colours the selection; a bad one is refused', async ({ page }) => {
    const p = await openPaperWithText(page, `${TAG} hex`, 'Hex words here.');
    await page.getByTestId('tb-color').click();
    await page.getByTestId('tb-hex').fill('#zz0000');
    await page.getByTestId('tb-hex').press('Enter');
    await expect(page.getByTestId('tb-color-panel')).toContainText('Use six digits');
    await page.getByTestId('tb-hex').fill('#325fec');
    await page.getByTestId('tb-hex').press('Enter');
    await expect(p.locator('span[style*="color"]')).toContainText('Hex words here.');
    await expect(p.locator('span[style*="rgb(50, 95, 236)"]')).toHaveCount(1);
  });

  test('the selection style keeps dark text on the white sheet, in dark mode too', async ({ page }) => {
    await openPaperWithText(page, `${TAG} select`, 'Selected words.');
    const rule = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        for (const r of Array.from(sheet.cssRules as CSSRuleList)) {
          const rr = r as CSSStyleRule;
          if (rr.selectorText && rr.selectorText.includes('.paper-sheet ::selection') && !rr.selectorText.includes('-moz')) {
            return { selector: rr.selectorText, color: rr.style.color, background: rr.style.backgroundColor };
          }
        }
      }
      return null;
    });
    expect(rule).not.toBeNull();
    expect(rule!.color).toBe('rgb(15, 23, 42)');
  });

  test('Section and Delete Section are not in the toolbar; Remove heading is', async ({ page }) => {
    await openPaperWithText(page, `${TAG} tools`, 'Tools words.');
    const bar = page.getByTestId('paper-toolbar');
    await expect(bar.getByRole('button', { name: 'Remove the heading' })).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Remove the section' })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: 'Add a section' })).toHaveCount(0);
  });
});
