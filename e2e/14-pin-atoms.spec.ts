import { test, expect, type Page } from '@playwright/test';

// Pinning: the pin icon on a card moves it to the top of the feed (like a pinned chat) and it stays
// there after a reload. The pin icon in the header, next to the type filter, shows pinned atoms only;
// clicking it again turns that mode off. The three clips are created for the test and deleted afterwards.
const PROJECT_ID = 'proj-always-on-agents-dots';

test.describe('14. Pin atoms to the top of the feed', () => {
  const stamp = Date.now();
  const titles = { first: `E2E pin first ${stamp}`, second: `E2E pin second ${stamp}`, third: `E2E pin third ${stamp}` };
  const atomIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Created in order, so "first" is the oldest and the feed lists it last.
    for (const title of [titles.first, titles.second, titles.third]) {
      const res = await request.post('/api/atoms', {
        data: {
          projectId: PROJECT_ID,
          type: 'text',
          title,
          content: { rawText: title, text: title },
          metadata: { sourceUrl: 'https://example.org/pin', pageTitle: 'Pin test' },
          tags: [],
        },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      atomIds.push(json.data?.id || json.atom?.id || json.id);
    }
  });

  test.afterAll(async ({ request }) => {
    for (const id of atomIds) if (id) await request.delete(`/api/atoms?id=${id}`);
  });

  async function openFeed(page: Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const projects = await (await page.request.get('/api/projects')).json();
    const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
    expect(project).toBeTruthy();
    await page.getByText(project.title, { exact: false }).first().click();
    await expect(page.getByText(titles.third).first()).toBeVisible({ timeout: 15000 });
  }

  // The card root is the innermost block that holds both the clip's title and a pin button.
  const card = (page: Page, title: string) =>
    page.locator('div').filter({ hasText: title }).filter({ has: page.locator('button[title="Pin to top"], button[title="Unpin"]') }).last();
  const top = async (page: Page, title: string) => (await card(page, title).boundingBox())!.y;

  test('pin moves a card to the top, survives a reload, and unpin puts it back', async ({ page }) => {
    await openFeed(page);
    // Before pinning, the oldest clip is below the newest.
    expect(await top(page, titles.first)).toBeGreaterThan(await top(page, titles.third));

    await card(page, titles.first).getByRole('button', { name: 'Pin to top' }).click();
    await expect(card(page, titles.first).getByRole('button', { name: 'Unpin' })).toBeVisible();
    await expect.poll(async () => (await top(page, titles.first)) < (await top(page, titles.third))).toBeTruthy();

    await openFeed(page);
    expect(await top(page, titles.first)).toBeLessThan(await top(page, titles.third));

    await card(page, titles.first).getByRole('button', { name: 'Unpin' }).click();
    await expect.poll(async () => (await top(page, titles.first)) > (await top(page, titles.third))).toBeTruthy();
  });

  test('the header pin icon shows pinned atoms only, and turns off again', async ({ page }) => {
    await openFeed(page);
    await card(page, titles.second).getByRole('button', { name: 'Pin to top' }).click();
    await expect(card(page, titles.second).getByRole('button', { name: 'Unpin' })).toBeVisible();

    await page.getByRole('button', { name: 'Show pinned only' }).click();
    await expect(page.getByText(titles.second).first()).toBeVisible();
    await expect(page.getByText(titles.third)).toHaveCount(0);
    await expect(page.getByText('pinned only')).toBeVisible();

    await page.getByRole('button', { name: /Showing pinned only/ }).click();
    await expect(page.getByText(titles.third).first()).toBeVisible();

    // Leave the clip unpinned for the next run.
    await card(page, titles.second).getByRole('button', { name: 'Unpin' }).click();
    await expect(card(page, titles.second).getByRole('button', { name: 'Pin to top' })).toBeVisible();
  });
});
