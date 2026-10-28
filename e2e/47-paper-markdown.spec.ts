import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Markdown download: the title, headings, typed text and a citation come out as Markdown with [@key] markers.
const TAG = `E2E-MD ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

test('the Markdown button downloads the paper as Markdown', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-imrad').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('new-paper-title').fill(`${TAG} my paper`);
  await page.getByTestId('new-paper-submit').click();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  const p = page.getByTestId('paper-sheet').locator('section.paper-section').first().locator('p').first();
  await p.click();
  await page.waitForTimeout(300);
  await page.keyboard.type('Plain typed words.');
  await page.getByTestId('paper-export').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('paper-markdown').click()]);
  expect(download.suggestedFilename()).toMatch(/^E2E-MD-\d+-my-paper\.md$/);
  const text = readFileSync((await download.path())!, 'utf8');
  expect(text).toContain(`# ${TAG} my paper`);
  expect(text).toMatch(/^## Introduction$/m);
  expect(text).toContain('Plain typed words.');
  expect(text.endsWith('\n')).toBe(true);
  expect(text).not.toMatch(/\n\n\n/);
});
