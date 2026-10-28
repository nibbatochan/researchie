import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// Clips sidebar (micro changes, step 5, part 1): search placeholder per tab; the kind word sits above the text with no
// background; the + is hidden until the row is hovered and stays inside the card; citations show a verified or web
// badge. Papers made here are removed at the end.
const TAG = `E2E-SL ${Date.now()}`;

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

async function openWithProject(page: Page, projectTitle: string, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(name);
  await page.getByTestId('new-paper-project').selectOption({ label: projectTitle });
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-sidebar')).toBeVisible({ timeout: 10000 });
}

test.describe('33. Paper sidebar look', () => {
  test('the search box says what each tab searches; Images has none', async ({ page, request }) => {
    const project = await citedProject(request);
    test.skip(!project, 'no project with cited clips in this data store');
    await openWithProject(page, project.title, `${TAG} search`);
    const box = page.getByLabel('Search clips');
    await expect(box).toHaveAttribute('placeholder', 'Search by text or quote');
    await page.getByTestId('sidebar-tab-images').click();
    await expect(page.getByLabel('Search clips')).toHaveCount(0); // no tags yet, so no tag search
    await page.getByTestId('sidebar-tab-cites').click();
    await expect(box).toHaveAttribute('placeholder', 'Search by citation');
  });

  test('the + is hidden until hover and does not change the card size', async ({ page, request }) => {
    const project = await citedProject(request);
    test.skip(!project, 'no project with cited clips in this data store');
    await openWithProject(page, project.title, `${TAG} plus`);
    const row = page.getByTestId('sidebar-row').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    const plus = row.getByTestId('sidebar-insert');
    await expect(plus).toHaveCSS('opacity', '0');
    const before = await row.boundingBox();
    await row.hover();
    await expect(plus).toHaveCSS('opacity', '1');
    const after = await row.boundingBox();
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBe(before!.height);
  });

  test('the kind word is plain text above the clip, with no background', async ({ page, request }) => {
    const project = await citedProject(request);
    test.skip(!project, 'no project with cited clips in this data store');
    await openWithProject(page, project.title, `${TAG} tag`);
    const row = page.getByTestId('sidebar-row').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    const word = row.locator('span.uppercase').first();
    await expect(word).toBeVisible();
    await expect(word).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
});
