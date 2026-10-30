import { test, expect } from '@playwright/test';

// Paper Mode home: create from Blank and from a template, rename, copy, delete with undo, trash.
// Papers made here are removed for good at the end, so the local .papers-store.json stays clean.
const TAG = `E2E ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const trash = await request.get('/api/papers?trash=1');
  const live = await request.get('/api/papers');
  for (const p of [...(((await live.json()).data as any[]) ?? [])]) {
    if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  }
  for (const p of [...(((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? []), ...(((await trash.json()).data as any[]) ?? [])]) {
    if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
  }
});

test.describe('25. Paper workspace', () => {
  test('the dashboard opens Paper mode; a template shows its structure and the wizard creates a paper', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('paper-mode-button').click();
    await expect(page.getByTestId('paper-workspace')).toBeVisible();

    await page.getByTestId('new-paper-button').click();
    const flow = page.getByTestId('new-paper-flow');
    await expect(flow).toBeVisible();

    // The preview is a series of page wireframes; the details sit beside it. The size does not change per template.
    await page.getByTestId('template-imrad').click();
    const preview = page.getByTestId('template-preview');
    await expect(preview.locator('figure')).toHaveCount(6); // the whole paper fits in the small box
    await expect(preview.getByTitle('Page 1: title, authors, abstract')).toBeVisible();
    await expect(preview.getByTitle('Page 3: Methods')).toBeVisible();
    await expect(preview.getByTitle('Page 6: references')).toBeVisible();
    await expect(page.getByTestId('template-details').getByText('Participants or materials')).toBeVisible(); // the details are the main view
    await page.waitForTimeout(600); // let the window finish opening before measuring it
    const size = await flow.boundingBox();
    expect(size!.height).toBeGreaterThan(600);

    await page.getByTestId('template-systematic-review').click();
    const same = await flow.boundingBox();
    expect(same!.width).toBe(size!.width);
    expect(same!.height).toBe(size!.height);
    await expect(preview.getByTitle('Page 3: Methods')).toBeVisible();
    await expect(page.getByTestId('template-details').getByText('Checklist to follow: PRISMA 2020')).toBeVisible();

    await page.getByTestId('template-use').click();
    await page.getByTestId('new-paper-title').fill(`${TAG} review`);
    await page.getByTestId('new-paper-submit').click();
    await expect(flow).toBeHidden();
    await expect(page.getByTestId('paper-editor')).toBeVisible(); // a created paper opens in the editor
    await page.getByTestId('paper-back').click();
    await expect(page.getByTestId('paper-title').filter({ hasText: `${TAG} review` })).toBeVisible();

    // Papers open in grid view and show their first page, not an icon.
    await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('paper-row').first().getByTestId('paper-thumb')).toContainText(`${TAG} review`);

    // Trash: the way back has no trash icon.
    await page.getByTestId('paper-trash-toggle').click();
    await expect(page.getByTestId('paper-trash-toggle')).toHaveText('Back to papers');
    await expect(page.getByTestId('paper-trash-toggle').locator('svg')).toHaveCount(1); // the back arrow
  });

  test('Blank opens straight away, then rename, copy, delete, undo and the trash work', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('paper-mode-button').click();
    await page.getByTestId('new-paper-button').click();
    await page.getByTestId('template-blank').click();
    await page.getByTestId('template-use').click(); // no wizard for Blank
    await expect(page.getByTestId('new-paper-flow')).toBeHidden();
    await expect(page.getByTestId('paper-editor')).toBeVisible();
    await page.getByTestId('paper-back').click();
    const row = page.getByTestId('paper-row').first(); // the newest edit is listed first
    await expect(row).toContainText('Untitled paper');

    await row.hover();
    await row.getByRole('button', { name: 'Rename' }).click();
    const input = page.getByLabel('Paper name');
    await input.fill(`${TAG} notes`);
    await input.press('Enter');
    const renamed = page.getByTestId('paper-row').filter({ hasText: `${TAG} notes` });
    await expect(renamed).toBeVisible();

    await renamed.hover();
    await renamed.getByRole('button', { name: 'Make a copy' }).click();
    await expect(page.getByTestId('paper-row').filter({ hasText: `${TAG} notes (copy)` })).toBeVisible();

    await renamed.first().hover();
    await renamed.first().getByTestId('paper-delete').click();
    await expect(page.getByTestId('delete-toast')).toContainText('Deleted paper');
    await page.getByTestId('delete-toast').getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('paper-row').filter({ hasText: `${TAG} notes` }).first()).toBeVisible();

    await page.getByTestId('paper-row').filter({ hasText: `${TAG} notes (copy)` }).hover();
    await page.getByTestId('paper-row').filter({ hasText: `${TAG} notes (copy)` }).getByTestId('paper-delete').click();
    await page.getByTestId('paper-trash-toggle').click();
    await expect(page.getByTestId('paper-row').filter({ hasText: `${TAG} notes (copy)` })).toBeVisible();
  });
});
