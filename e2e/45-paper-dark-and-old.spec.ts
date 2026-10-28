import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { templateToDoc, defaultMeta } from '../src/lib/paper/docModel';
import { getTemplate } from '../src/lib/paper/templates';

// Dark mode: the toolbar menus, panels and dialogs keep readable text. Old papers: one saved before listed references,
// the ruler margin and columns existed opens and works. Papers made here are removed at the end.
const TAG = `E2E-DK ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function open(page: Page, name: string, dark: boolean) {
  await page.goto('/');
  await page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
}

/** Text in `root` whose colour is too close to the colour behind it (WCAG ratio under 3 for text, which is lenient). */
async function lowContrast(page: Page, rootSelector: string) {
  return page.evaluate((sel) => {
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const backdrop = (el: Element): number[] => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.length >= 3 && (c[3] === undefined || c[3] > 0.6)) return c;
      }
      return [255, 255, 255];
    };
    const out: string[] = [];
    for (const root of Array.from(document.querySelectorAll(sel))) {
      for (const el of Array.from(root.querySelectorAll('*'))) {
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const a = lum(parse(cs.color));
        const b = lum(backdrop(el));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < 3) out.push(`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 24)}" ${cs.color} on ${backdrop(el).join(',')} = ${ratio.toFixed(1)}`);
      }
    }
    return out;
  }, rootSelector);
}

test('menus, panels and dialogs are readable in dark mode', async ({ page }) => {
  await open(page, `${TAG} dark`, true);
  await page.getByTestId('paper-sheet').locator('p').first().click();
  const menus: Array<[string, string]> = [
    ['tb-align', '[data-testid="tb-align-menu"]'],
    ['tb-line', '[data-testid="tb-line-menu"]'],
    ['tb-lists', '[data-testid="tb-lists-menu"]'],
    ['tb-more-text', '[data-testid="tb-more-text-menu"]'],
    ['tb-columns', '[data-testid="tb-columns-panel"]'],
    ['tb-color', '[data-testid="tb-color-panel"]'],
  ];
  for (const [button, panel] of menus) {
    await page.getByTestId(button).click();
    await expect(page.locator(panel)).toBeVisible();
    expect(await lowContrast(page, panel), `${button} menu`).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator(panel)).toHaveCount(0);
  }
  for (const [button, dialog] of [['tb-page', '[data-testid="page-settings-dialog"]'], ['tb-header-footer', '[data-testid="header-footer-dialog"]']] as const) {
    await page.getByTestId(button).click();
    await expect(page.locator(dialog)).toBeVisible();
    expect(await lowContrast(page, dialog), `${button} dialog`).toEqual([]);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await page.getByTestId('front-matter-toggle').click();
  await expect(page.getByTestId('front-matter-panel')).toBeVisible();
  expect(await lowContrast(page, '[data-testid="front-matter-panel"]')).toEqual([]);
  expect(await lowContrast(page, '[data-testid="paper-toolbar"]')).toEqual([]);
  expect(await lowContrast(page, '[data-testid="paper-sidebar"]')).toEqual([]);
});

async function oldPaper(request: APIRequestContext, title: string) {
  const template = getTemplate('imrad');
  let n = 0;
  const doc = templateToDoc(template, () => `s${++n}`);
  const meta: any = defaultMeta(template, title);
  // what a paper saved before these features looked like: no listed, no marginPx, no startAt
  delete meta.listed;
  delete meta.page.marginPx;
  delete meta.page.startAt;
  const res = await request.post('/api/papers', { data: { title, templateId: 'imrad', citationStyle: 'apa', doc, meta } });
  return (await res.json()).data.id as string;
}

test('a paper saved before listed references, ruler margins and columns opens and works', async ({ page, request }) => {
  const id = await oldPaper(request, `${TAG} old`);
  await page.goto(`/?paper=${id}`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(page.getByTestId('paper-ruler')).toHaveAttribute('data-margin-px', '96');
  await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
  await page.keyboard.type('Typed in an old paper.');
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click(); // columns can be added to an old paper
  await expect(page.getByTestId('paper-sheet').locator('.paper-column')).toHaveCount(3);
  await page.getByTestId('tb-page').click();
  await page.getByTestId('ps-margin').selectOption('narrow');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('paper-ruler')).toHaveAttribute('data-margin-px', '48');
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 10000 });
  await page.reload();
  await expect(page.getByTestId('paper-sheet')).toContainText('Typed in an old paper.');
  await expect(page.getByTestId('paper-sheet').locator('.paper-column')).toHaveCount(3);
  await expect(page.getByTestId('paper-ruler')).toHaveAttribute('data-margin-px', '48');
});
