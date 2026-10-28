import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { templateToDoc, defaultMeta } from '../src/lib/paper/docModel';
import { getTemplate } from '../src/lib/paper/templates';

// Long papers: a reference list of 80 entries and long front matter break across pages without crossing a page edge; a
// heading stays with its first entry; a very long paste stays fast; a block taller than a page is flagged.
const TAG = `E2E-LP ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function makePaper(request: APIRequestContext, title: string, refs: number, abstractWords: number) {
  const template = getTemplate('imrad');
  let n = 0;
  const doc = templateToDoc(template, () => `s${++n}`);
  const meta = defaultMeta(template, title);
  const cites: Record<string, string> = {};
  const manualRefs: Array<{ id: string; record: unknown }> = [];
  const inline: unknown[] = [];
  for (let i = 1; i <= refs; i++) {
    cites[`K${i}`] = `manual:m${i}`;
    manualRefs.push({ id: `m${i}`, record: { type: 'article', title: `A study of topic number ${i} and what it means for the field`, authors: [{ family: `Author${i}`, given: 'A' }], year: 2000 + (i % 25), journal: 'Journal of Tests', missingFields: [] } });
    inline.push({ type: 'citation', attrs: { keys: [`K${i}`], locator: null } });
  }
  const sec = (doc.pm.content as any[])[0];
  sec.content.push({ type: 'paragraph', content: inline });
  const m: any = { ...meta, cites, manualRefs };
  // an abstract of several parts, each a paragraph that fits a page (one paragraph taller than a page is flagged instead)
  const part = (k: number) => ({ label: `Part ${k}`, text: Array.from({ length: Math.round(abstractWords / 8) }, (_, i) => `word${k}x${i}`).join(' ') });
  m.front = { ...m.front, abstract: { parts: Array.from({ length: 8 }, (_, k) => part(k + 1)) } };
  const res = await request.post('/api/papers', { data: { title, templateId: 'imrad', citationStyle: 'ieee', doc, meta: m } });
  return (await res.json()).data.id as string;
}

async function inPage(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const boxes = Array.from(document.querySelectorAll('[data-page-box]')).map((b) => b.getBoundingClientRect());
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll(sel))) {
      const raw = el.getBoundingClientRect();
      const lift = parseFloat((el as HTMLElement).style.paddingTop) || 0; // the box starts above its text by the padding that moved it
      const r = { top: raw.top + lift, bottom: raw.bottom };
      const box = boxes.find((b) => r.top >= b.top - 1 && r.top < b.bottom);
      if (!box) { bad.push(`no page for ${(el.textContent ?? '').slice(0, 20)}`); continue; }
      if (r.top < box.top + 96 - 1 || r.bottom > box.bottom - 96 + 1) bad.push(`${(el.textContent ?? '').slice(0, 24)} crosses a page edge (${Math.round(r.top - box.top)}..${Math.round(r.bottom - box.top)})`);
    }
    return bad;
  }, selector);
}

test('80 references and a long abstract flow over several pages and never cross a page edge', async ({ page, request }) => {
  const id = await makePaper(request, `${TAG} refs`, 80, 1400);
  await page.goto(`/?paper=${id}`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect.poll(() => page.locator('[data-page-box]').count(), { timeout: 20000 }).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(1500); // let the layout settle
  expect(await inPage(page, '[data-testid="paper-references"] li')).toEqual([]);
  expect(await inPage(page, '[data-testid="paper-abstract"] p')).toEqual([]);
  // the References heading is on the same page as the first entry
  const same = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('[data-page-box]')).map((b) => b.getBoundingClientRect());
    const pageOf = (el: Element) => { const t = el.getBoundingClientRect().top + (parseFloat((el as HTMLElement).style.paddingTop) || 0); return boxes.findIndex((b) => t >= b.top - 1 && t < b.bottom); };
    return pageOf(document.querySelector('[data-testid="paper-references"] h2')!) === pageOf(document.querySelector('[data-testid="paper-references"] li')!);
  });
  expect(same).toBe(true);
  await expect(page.getByTestId('tall-block-note')).toHaveCount(0);
});

test('a long paste stays quick to type in', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} paste`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    const sentence = 'Pasted words that go on and on so this paragraph wraps onto several lines of the page. ';
    dt.setData('text/html', Array.from({ length: 1200 }, (_, i) => `<p>${i + 1}. ${sentence.repeat(1 + (i % 3))}</p>`).join(''));
    dt.setData('text/plain', 'x');
    document.querySelector('.ProseMirror')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect.poll(() => page.locator('[data-page-box]').count(), { timeout: 60000 }).toBeGreaterThan(30);
  await page.waitForTimeout(2000);
  const lat: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = Date.now();
    await page.keyboard.type('x');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
    lat.push(Date.now() - t);
  }
  lat.sort((a, b) => a - b);
  console.log('KEY LATENCY (median ms) at', await page.locator('[data-page-box]').count(), 'pages:', lat[3]);
  expect(lat[3]).toBeLessThan(400);
  // one layout pass of the whole paper (measure every block, place the page breaks) is cheap; the rest of a key's time is the browser's
  const pass = Number(await page.getByTestId('paper-editor').getAttribute('data-paginate-ms'));
  console.log('PAGINATE pass ms:', pass);
  expect(pass).toBeLessThan(100);
});

const pasteLong = (page: Page) =>
  page.evaluate(() => {
    const dt = new DataTransfer();
    const long = 'A single paragraph that never stops and keeps wrapping line after line after line. '.repeat(120);
    dt.setData('text/html', `<p>${long}</p>`);
    dt.setData('text/plain', long);
    document.querySelector('.ProseMirror')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });

test('one paragraph taller than a page is split across pages, line by line, and stays put', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} split`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.waitForTimeout(300); // the editor takes the click's selection a moment later
  await pasteLong(page);
  await expect.poll(() => page.locator('.paper-split').count(), { timeout: 15000 }).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(1500);
  const gaps = await page.locator('.paper-split').count();
  expect(gaps).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId('tall-block-note')).toHaveCount(0);
  await expect(page.locator('.paper-oversize')).toHaveCount(0);
  // every line of the paragraph lies inside a page's text area
  const bad = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('[data-page-box]')).map((b) => b.getBoundingClientRect());
    const p = document.querySelector('.paper-prose p')!;
    const out: string[] = [];
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width === 0) continue;
        const box = boxes.find((b) => r.top >= b.top - 1 && r.top < b.bottom);
        if (!box || r.top < box.top + 96 - 4 || r.bottom > box.bottom - 96 + 4) out.push(`${Math.round(r.top - (box?.top ?? 0))}..${Math.round(r.bottom - (box?.top ?? 0))}`);
      }
    }
    return out;
  });
  expect(bad).toEqual([]);
  // the layout settles: nothing moves again, and typing at the end of the paragraph still works
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' The end.');
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('paper-sheet')).toContainText('The end.');
  expect(await page.locator('.paper-split').count()).toBeGreaterThanOrEqual(1);
});

test('columns taller than a page cannot be split: they are flagged, in the editor and in the status line', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} tall`);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-insert').click();
  await page.waitForTimeout(300);
  await pasteLong(page);
  await expect(page.getByTestId('tall-block-note')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.paper-oversize').first()).toBeAttached();
});
