import { test, expect, type Page } from '@playwright/test';

// Print / PDF: the button lays the pages out with no gap, puts a copy of the sheet in a print-only container, and calls
// the browser's print. The print itself is stubbed here; Chromium's own PDF output of the print layout is checked. The
// page is put back when printing ends. Papers made here are removed at the end.
const TAG = `E2E-PR ${Date.now()}`;

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
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(name);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
}

test('Print / PDF puts the pages in a print-only copy, in the right order, and restores the screen afterwards', async ({ page, browserName }) => {
  test.setTimeout(120000);
  await open(page, `${TAG} pdf`);
  await page.evaluate(() => { (window as any).__printCalls = 0; window.print = () => { (window as any).__printCalls++; }; });
  const sheet = page.getByTestId('paper-sheet');
  await sheet.locator('.paper-prose p').first().click();
  await page.waitForTimeout(300);
  await page.keyboard.type('FIRSTPAGEWORD');
  for (let i = 2; i <= 75; i++) { await page.keyboard.press('Enter'); await page.keyboard.type(`Line ${i}`); }
  await page.keyboard.type('COLUMNWORD');
  await page.getByTestId('tb-columns').click();
  await page.getByTestId('col-paper-2').click();
  await expect.poll(() => page.locator('[data-page-box]').count(), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
  const screenPages = await page.locator('[data-page-box]').count();

  await page.getByTestId('paper-export').click();
  await page.getByTestId('paper-print').click();
  await expect.poll(() => page.evaluate(() => (window as any).__printCalls), { timeout: 10000 }).toBe(1);
  await expect(page.locator('#paper-print-root')).toHaveCount(1);
  // pages touch each other while printing: no 24 px gap between boxes
  const gap = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('#paper-print-root [data-page-box]')).map((b) => parseFloat((b as HTMLElement).style.top));
    return boxes.length > 1 ? boxes[1] - boxes[0] : 0;
  });
  expect(gap).toBe(1123);

  await page.emulateMedia({ media: 'print' });
  // the app around the sheet is not printed
  const visibleApp = await page.evaluate(() => Array.from(document.body.children).filter((c) => c.id !== 'paper-print-root' && c.tagName !== 'STYLE' && getComputedStyle(c).display !== 'none').length);
  expect(visibleApp).toBe(0);
  const printBoxes = await page.locator('#paper-print-root [data-page-box]').count();
  expect(printBoxes).toBeGreaterThanOrEqual(screenPages);
  // page.pdf is Chromium only: the PDF checks run there, the print copy above runs in every browser
  if (browserName === "chromium") {
    // Chromium fires afterprint while it renders the PDF, which is when the page is put back
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
    expect(doc.numPages).toBe(printBoxes);
    const texts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) texts.push((await (await doc.getPage(i)).getTextContent()).items.map((x: any) => x.str).join(' '));
    expect(texts[0]).toContain('FIRSTPAGEWORD');
    expect(texts.join(' ')).toContain('Line 75');
    expect(texts.join(' ')).toContain('COLUMNWORD');
    expect(texts.join(' ')).not.toContain('Edit front matter'); // editor controls are not printed
    expect(texts.join(' ')).not.toContain('The problem, what is already known'); // nor the grey hints
    const first = await doc.getPage(1);
    const [, , w, h] = first.view;
    expect(Math.round(w)).toBe(596); // 794 px = 595.5 pt
    expect(Math.round(h)).toBe(842);
  }

  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#paper-print-root')).toHaveCount(0);
  await expect(page.getByTestId('paper-print')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-page-box]')).map((x) => parseFloat((x as HTMLElement).style.top)); return b.length > 1 ? b[1] - b[0] : 0; }), { timeout: 5000 }).toBe(1147);
});
