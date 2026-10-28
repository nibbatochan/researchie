import { test, expect, type APIRequestContext } from '@playwright/test';

// Step 5, part 3: on the Citations tab the first + puts a source on References, the second inserts it in the text.
// "Add all verified" lists every source with a DOI. Papers made here are removed at the end.
const TAG = `E2E-RF ${Date.now()}`;

async function citedProject(request: APIRequestContext) {
  const projects = ((await (await request.get('/api/projects')).json()).data as any[]) ?? [];
  for (const p of projects) {
    const atoms = ((await (await request.get(`/api/atoms?projectId=${encodeURIComponent(p.id)}`)).json()).data as any[]) ?? [];
    if (atoms.some((a) => a.metadata?.citation)) return p;
  }
  return null;
}

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

test('the first + lists a source in References, the second inserts it', async ({ page, request }) => {
  const project = await citedProject(request);
  test.skip(!project, 'no project with cited clips in this data store');
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} refs`);
  await page.getByTestId('new-paper-project').selectOption(project.id);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-sidebar')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('sidebar-tab-cites').click();
  const row = page.getByTestId('sidebar-row').first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.hover();
  const plus = row.getByTestId('sidebar-insert');
  await expect(plus).toHaveAttribute('aria-label', 'Add to References');
  await plus.click();
  await expect(plus).toHaveAttribute('aria-label', 'Insert citation');
  await expect(page.getByTestId('paper-references').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('paper-sheet').locator('.paper-cite')).toHaveCount(0);
  await plus.click();
  await expect(page.getByTestId('paper-sheet').locator('.paper-cite').first()).toBeVisible();
});
