import { test, expect, type Page } from '@playwright/test';

// Pasting from Google Docs and Word into the page and into a column, and a touch drag on a column divider.
// Papers made here are removed at the end.
const TAG = `E2E-PT ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function open(page: Page, name: string, withColumns: boolean) {
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
  if (withColumns) {
    await page.getByTestId('tb-columns').click();
    await page.getByTestId('col-insert').click();
    await page.waitForTimeout(300);
  }
}

const GOOGLE_DOCS = '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;vertical-align:baseline;white-space:pre-wrap;">First Google line.</span></p><p dir="ltr" style="line-height:1.38;"><span style="font-size:11pt;font-family:Arial,sans-serif;font-weight:700;">Bold Google line.</span></p></b>';
const WORD = '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><!--StartFragment--><p class=MsoNormal style="margin-bottom:8.0pt;line-height:107%"><span style=\'font-size:12.0pt;font-family:"Calibri",sans-serif;mso-ascii-theme-font:minor-latin\'>First Word line.</span><o:p></o:p></p><p class=MsoNormal><b><span style=\'font-family:"Calibri",sans-serif\'>Bold Word line.</span></b></p><!--EndFragment--></body></html>';

async function paste(page: Page, html: string, plain: string) {
  await page.evaluate(([h, t]) => {
    const dt = new DataTransfer();
    dt.setData('text/html', h);
    dt.setData('text/plain', t);
    document.querySelector('.ProseMirror')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, [html, plain]);
}

for (const [label, withColumns] of [['the page', false], ['a column', true]] as const) {
  test(`Google Docs and Word text pasted into ${label} keeps its words and paragraphs, and brings no foreign fonts or backgrounds`, async ({ page }) => {
    await open(page, `${TAG} ${label}`, withColumns);
    const scope = withColumns ? page.locator('.paper-column').first() : page.getByTestId('paper-sheet').locator('section.paper-section').first();
    await paste(page, GOOGLE_DOCS, 'First Google line.\nBold Google line.');
    await expect(scope).toContainText('First Google line.');
    await expect(scope).toContainText('Bold Google line.');
    // the wrapper bold of Google Docs (font-weight normal) is not bold; the real bold is
    await expect(scope.locator('strong, b').filter({ hasText: 'First Google line.' })).toHaveCount(0);
    await expect(scope.locator('strong, b').filter({ hasText: 'Bold Google line.' })).toHaveCount(1);
    await paste(page, WORD, 'First Word line.\nBold Word line.');
    await expect(scope).toContainText('First Word line.');
    await expect(scope.locator('strong, b').filter({ hasText: 'Bold Word line.' })).toHaveCount(1);
    await expect(scope.locator('strong, b').filter({ hasText: 'First Word line.' })).toHaveCount(0);
    // no foreign typeface or highlight, and no Office markup left in the page
    await expect(page.locator('.paper-prose span[data-font], .paper-prose mark')).toHaveCount(0);
    const html = await scope.innerHTML();
    expect(html).not.toMatch(/mso-|MsoNormal|docs-internal|<o:p|Calibri/i);
    // each pasted line is its own paragraph
    await expect(scope.locator('p').filter({ hasText: 'First Word line.' })).toHaveCount(1);
    await expect(scope.locator('p').filter({ hasText: 'Bold Word line.' })).toHaveCount(1);
  });
}

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 1400, height: 900 } });

  test('a column divider can be dragged by touch', async ({ page }) => {
    await open(page, `${TAG} touch`, true);
    const sheet = page.getByTestId('paper-sheet');
    const wrap = sheet.locator('.paper-columns-wrap').first();
    await expect(wrap).toHaveAttribute('data-widths', '');
    const result = await page.evaluate(() => {
      const divider = document.querySelector('.paper-columns-divider') as HTMLElement;
      const r = divider.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + 6;
      const fire = (target: EventTarget, type: string, cx: number) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: y, bubbles: true, cancelable: true }));
      fire(divider, 'pointerdown', x);
      for (let i = 1; i <= 6; i++) fire(window, 'pointermove', x + i * 14);
      fire(window, 'pointerup', x + 84);
      return true;
    });
    expect(result).toBe(true);
    await expect(wrap).not.toHaveAttribute('data-widths', '');
    const [a, b] = ((await wrap.getAttribute('data-widths')) ?? '').split(',').map(Number);
    expect(a).toBeGreaterThan(b);
  });
});
