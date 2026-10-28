import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// Assembling a paper from clips: the sidebar lists the data-source project's clips; Insert and drag place a
// quote; Citations place a marker that follows the style; the reference list is built from what is cited.
// Needs a project whose clips carry a citation (the local seed has one). Papers made here are removed at the end.
const TAG = `E2E-SB ${Date.now()}`;

async function citedProject(request: APIRequestContext) {
  const projects = ((await (await request.get('/api/projects')).json()).data as any[]) ?? [];
  for (const p of projects) {
    const atoms = ((await (await request.get(`/api/atoms?projectId=${encodeURIComponent(p.id)}`)).json()).data as any[]) ?? [];
    if (atoms.some((a) => a.metadata?.citation && a.type !== 'note' && a.metadata?.evidenceKind !== 'ai-summary' && a.metadata?.evidenceKind !== 'mine')) return p;
  }
  return null;
}

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function openWithProject(page: Page, projectTitle: string, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-project').selectOption({ label: projectTitle });
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(page.getByTestId('paper-sidebar')).toBeVisible();
}

test.describe('27. Paper sidebar', () => {
  test('the sidebar lists clips; Insert places a quote and a citation; the style changes the marker; references follow', async ({ page, request }) => {
    const project = await citedProject(request);
    test.skip(!project, 'no project with cited clips in this data store');
    await openWithProject(page, project.title, `${TAG} insert`);

    await expect(page.getByTestId('sidebar-row').first()).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sidebar-tab-cites').click();
    const row = page.getByTestId('sidebar-row').first();
    await expect(row).toBeVisible();

    // a citation lands inline, drawn with a marker; the reference list gains the source
    await page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first().click();
    await row.getByTestId('sidebar-insert').click(); // first click lists the source in References
    await expect(page.getByTestId('paper-references').locator('li')).toHaveCount(1);
    await row.getByTestId('sidebar-insert').click(); // second click puts the citation in the text
    const cite = page.locator('.paper-cite').first();
    await expect(cite).toBeVisible();
    await expect(cite).toHaveAttribute('data-marker', /\(.+\d{4}.*\)/); // author-date marker, for example (Lee, 2020)
    await expect(page.getByTestId('paper-references').locator('li')).toHaveCount(1);
    await expect(row).toContainText('In the text');

    // switching the style changes the marker; the text stays
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('ieee');
    await expect(cite).toHaveAttribute('data-marker', '[1]');
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('vancouver');
    await expect(cite).toHaveAttribute('data-marker', '(1)');
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('ama');
    await expect(cite).toHaveAttribute('data-marker', '¹');
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('mla');
    await expect(cite).toHaveAttribute('data-marker', /^\([^\d]+\)$/); // author only, no year
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('chicago');
    await expect(cite).toHaveAttribute('data-marker', /^\([^,\d]+ \d{4}\)$/); // author year, no comma
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('harvard');
    await expect(cite).toHaveAttribute('data-marker', /\(.+\d{4}.*\)/);
    await page.getByTestId('paper-citations-button').click();
    await page.getByTestId('paper-style').selectOption('apa');
    await expect(cite).toHaveAttribute('data-marker', /\(.+\d{4}.*\)/);

    // a text clip placed with Insert becomes a quote with its marker
    await page.getByTestId('sidebar-tab-text').click();
    await page.getByTestId('sidebar-row').filter({ hasText: 'Quote' }).first().getByTestId('sidebar-insert').click();
    await expect(page.locator('blockquote.paper-quote').first()).toBeVisible();
    await expect(page.locator('blockquote.paper-quote').first()).toHaveCSS('border-left-width', '0px'); // no rule down the side
    await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });

    // it is still there after a reload, and the template headings are untouched
    await page.reload();
    await expect(page.locator('blockquote.paper-quote').first()).toBeVisible();
    await expect(page.locator('.paper-cite').first()).toBeVisible();
    await expect(page.getByTestId('paper-sheet').locator('.paper-h1')).toHaveCount(5);
  });

  test('dragging a row onto the page places it where it is dropped', async ({ page, request }) => {
    const project = await citedProject(request);
    test.skip(!project, 'no project with cited clips in this data store');
    await openWithProject(page, project.title, `${TAG} drag`);
    await expect(page.getByTestId('sidebar-row').first()).toBeVisible({ timeout: 10000 });
    const clipId = await page.getByTestId('sidebar-row').first().getAttribute('data-clip-id');

    // a synthetic drop: Playwright can not start a real OS drag, so the same events are dispatched
    await page.evaluate((id) => {
      const target = document.querySelectorAll('section.paper-section')[2].querySelector('p')!; // Results
      const r = target.getBoundingClientRect();
      const dt = new DataTransfer();
      dt.setData('application/x-researchie-clip', id!);
      const opts = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + 5, clientY: r.y + 5 };
      target.dispatchEvent(new DragEvent('dragover', opts));
      target.dispatchEvent(new DragEvent('drop', opts));
    }, clipId);

    const results = page.locator('section.paper-section').nth(2);
    await expect(results.locator('blockquote.paper-quote, figure, .paper-clipnote, p:not(:empty)').first()).toBeVisible();
    await expect(page.locator('section.paper-section').first().locator('blockquote.paper-quote')).toHaveCount(0); // not in Introduction
    await expect(page.getByTestId('paper-sheet').locator('.paper-h1')).toHaveCount(5);
  });

  test('a paper can point at another project and the sidebar follows', async ({ page, request }) => {
    const project = await citedProject(request);
    test.skip(!project, 'no project with cited clips in this data store');
    await openWithProject(page, project.title, `${TAG} source`);
    await page.getByTestId('sidebar-project').selectOption('');
    await expect(page.getByTestId('sidebar-list')).toContainText('Pick a project');
    await page.getByTestId('sidebar-project').selectOption(project.id);
    await expect(page.getByTestId('sidebar-row').first()).toBeVisible({ timeout: 10000 });
  });
});
