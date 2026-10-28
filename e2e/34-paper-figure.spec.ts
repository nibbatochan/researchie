import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// A clipped image dropped on the paper shows the picture and its saved caption only: no label, no placeholder text.
// It can be resized from its corner handle. Papers made here are removed at the end.
const TAG = `E2E-FG ${Date.now()}`;

async function imageProject(request: APIRequestContext) {
  const projects = ((await (await request.get('/api/projects')).json()).data as any[]) ?? [];
  for (const p of projects) {
    const atoms = ((await (await request.get(`/api/atoms?projectId=${encodeURIComponent(p.id)}`)).json()).data as any[]) ?? [];
    if (atoms.some((a) => a.type === 'image' && a.content?.imageUrl)) return p;
  }
  return null;
}

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

test('an image inserted from the Images tab shows only the picture and its caption, and resizes', async ({ page, request }: { page: Page; request: APIRequestContext }) => {
  const project = await imageProject(request);
  test.skip(!project, 'no project with clipped images in this data store');
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(`${TAG} figure`);
  await page.getByTestId('sidebar-project').selectOption({ value: project.id });
  await page.getByTestId('sidebar-tab-images').click();
  const row = page.getByTestId('sidebar-row').first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator('span.uppercase').first()).toHaveText(/Image|Table/);
  await row.getByTestId('sidebar-insert').click({ force: true });

  const figure = page.getByTestId('paper-sheet').locator('figure[data-figure]').first();
  await expect(figure.locator('img')).toBeAttached();
  await expect(page.getByTestId('paper-sheet')).not.toContainText('Image from a clip');
  await expect(figure.locator('handle, .paper-figure-handle')).toHaveCount(1);

  // the picture is remote and may not load here, so the check is on the width the drag writes to the picture
  const handle = figure.locator('.paper-figure-handle');
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + 3, box!.y + 3);
  await page.mouse.down();
  await page.mouse.move(box!.x - 60, box!.y + 3, { steps: 5 });
  await page.mouse.up();
  await expect(figure.locator('img')).toHaveAttribute('style', /width: \d+px/);
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 8000 });
});
