import { test, expect } from '@playwright/test';

// The page is white in both themes, so every piece of text on it must be dark. In dark mode the app's own text colour
// is light, and anything on the sheet that does not set its own colour used to turn white-on-white.
const TAG = `E2E-CT ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

for (const dark of [false, true]) {
  test(`text on the sheet is readable (${dark ? 'dark' : 'light'} mode)`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
    await page.getByTestId('paper-mode-button').click();
    await page.getByTestId('new-paper-button').click();
    await page.getByTestId('template-imrad').click();
    await page.getByTestId('template-use').click();
    await page.getByTestId('new-paper-title').fill(`${TAG} contrast`);
    await page.getByTestId('new-paper-submit').click();
    await expect(page.getByTestId('paper-editor')).toBeVisible();
    await page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
    await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
    await page.keyboard.type('Body text under test.');
    await page.getByTestId('tb-columns').click();
    await page.getByTestId('col-insert').click();
    await page.keyboard.type('Column text under test.');

    const bad = await page.evaluate(() => {
      const lum = (c: string) => {
        const m = c.match(/[\d.]+/g)!.map(Number);
        const [r, g, b] = m.slice(0, 3).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const out: string[] = [];
      const sheet = document.querySelector('[data-testid="paper-sheet"]')!;
      for (const el of Array.from(sheet.querySelectorAll('*'))) {
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        if (!own) continue;
        const cs = getComputedStyle(el);
        // the page is white; contrast of the text against white
        const ratio = 1.05 / (lum(cs.color) + 0.05);
        if (ratio < 4.5) out.push(`${el.tagName}.${(el as HTMLElement).className} ${cs.color} ${ratio.toFixed(1)}`);
      }
      return out;
    });
    expect(bad).toEqual([]);
  });
}
