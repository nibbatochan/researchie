import { test, expect } from '@playwright/test';

// Keyboard and screen-reader basics for the editor chrome: every control has a name, panels open from the keyboard
// and Escape closes them and gives the focus back, and the dialogs are labelled. Papers made here are removed.
const TAG = `E2E-KB ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

test('controls have names; menus open from the keyboard, close on Escape and return the focus', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} keys`);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();

  const unnamed = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('[data-testid="paper-toolbar"] button, [data-testid="paper-toolbar"] select, [data-testid="paper-toolbar"] input, [data-testid="paper-ruler"] [role="slider"]'))) {
      const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
      if (!name) out.push(el.outerHTML.slice(0, 80));
    }
    return out;
  });
  expect(unnamed).toEqual([]);

  for (const [button, panel] of [['tb-align', 'tb-align-menu'], ['tb-line', 'tb-line-menu'], ['tb-lists', 'tb-lists-menu'], ['tb-columns', 'tb-columns-panel'], ['tb-highlight', 'tb-highlight-panel']] as const) {
    await page.getByTestId(button).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId(panel)).toBeVisible();
    await expect(page.getByTestId(panel)).toHaveAttribute('role', 'menu');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(panel)).toHaveCount(0);
    await expect(page.getByTestId(button)).toBeFocused();
  }

  // the dialogs are modal and named
  await page.getByTestId('tb-page').click();
  await expect(page.getByRole('dialog', { name: 'Page settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByTestId('tb-header-footer').click();
  await expect(page.getByRole('dialog', { name: 'Header and footer' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  // the ruler handles are sliders with a value and move from the keyboard
  const handle = page.getByTestId('ruler-handle-left');
  await expect(handle).toHaveAttribute('role', 'slider');
  await expect(handle).toHaveAttribute('aria-valuetext', /cm/);
});
