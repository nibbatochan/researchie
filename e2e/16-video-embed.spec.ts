import { test, expect, type Page } from '@playwright/test';

// Saved video links play inline. The provider hosts are stubbed so the test needs no network:
// the Vimeo stub is a working player, the YouTube stub reports "embedding disabled" like a real one does.
// The clips are created for the test and deleted afterwards.
const PROJECT_ID = 'proj-always-on-agents-dots';

test.describe('16. Video embeds on link clips', () => {
  const stamp = Date.now();
  const vimeoUrl = 'https://vimeo.com/76979871';
  const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s';
  const plainUrl = 'https://example.org/article';
  const titles = { vimeo: `E2E video vimeo ${stamp}`, youtube: `E2E video youtube ${stamp}`, plain: `E2E video plain ${stamp}` };
  const atomIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    for (const [title, url] of [[titles.vimeo, vimeoUrl], [titles.youtube, youtubeUrl], [titles.plain, plainUrl]]) {
      const res = await request.post('/api/atoms', {
        data: {
          projectId: PROJECT_ID,
          type: 'link',
          title,
          content: { targetUrl: url },
          metadata: { sourceUrl: url, pageTitle: title },
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
    await page.route('https://player.vimeo.com/**', (r) =>
      r.fulfill({ contentType: 'text/html', body: '<!doctype html><body>vimeo player stub</body>' }),
    );
    await page.route('https://www.youtube-nocookie.com/**', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><body>youtube stub<script>parent.postMessage(JSON.stringify({event:"onError",info:150}),"*")</script></body>',
      }),
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const projects = await (await page.request.get('/api/projects')).json();
    const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
    expect(project).toBeTruthy();
    await page.getByText(project.title, { exact: false }).first().click();
    await expect(page.getByText(titles.plain).first()).toBeVisible({ timeout: 15000 });
  }

  const card = (page: Page, title: string) =>
    page.locator('div').filter({ hasText: title }).filter({ has: page.getByRole('group', { name: 'Show video as' }) }).last();

  test('a Vimeo link plays inline in a sandboxed lazy iframe, and the toggle and minimize work', async ({ page }) => {
    await openFeed(page);
    const c = card(page, titles.vimeo);
    const frame = c.locator('iframe');
    await expect(frame).toBeVisible({ timeout: 15000 });
    await expect(frame).toHaveAttribute('src', /^https:\/\/player\.vimeo\.com\/video\/76979871/);
    await expect(frame).toHaveAttribute('loading', 'lazy');
    const sandbox = (await frame.getAttribute('sandbox')) || '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-top-navigation');
    expect(sandbox).not.toContain('allow-forms');

    // Minimize hides the player, Show player brings it back.
    await c.getByRole('button', { name: 'Minimize' }).click();
    await expect(frame).toHaveCount(0);
    await c.getByRole('button', { name: 'Show player' }).click();
    await expect(c.locator('iframe')).toBeVisible();

    // Link mode shows no player, and the choice survives a reload.
    await c.getByRole('button', { name: 'Link', exact: true }).click();
    await expect(c.locator('iframe')).toHaveCount(0);
    await openFeed(page);
    await expect(card(page, titles.vimeo).locator('iframe')).toHaveCount(0);
    await card(page, titles.vimeo).getByRole('button', { name: 'Player', exact: true }).click();
    await expect(card(page, titles.vimeo).locator('iframe')).toBeVisible();
  });

  test('a YouTube video that refuses to embed falls back to the plain link', async ({ page }) => {
    await openFeed(page);
    const c = card(page, titles.youtube);
    await expect(c.getByText("This video can't play here", { exact: false })).toBeVisible({ timeout: 15000 });
    await expect(c.locator('iframe')).toHaveCount(0);
    await expect(c.getByRole('link', { name: /Open the original/ })).toHaveAttribute('href', youtubeUrl);
  });

  test('a normal link gets no player controls, and the saved URL is unchanged', async ({ page, request }) => {
    await openFeed(page);
    // Only the two video clips have the Player / Link toggle; the plain link and the seeded article links do not.
    await expect(page.getByRole('group', { name: 'Show video as' })).toHaveCount(2);
    await expect(page.getByText(titles.plain).first()).toBeVisible();

    const atoms = ((await (await request.get(`/api/atoms?projectId=${PROJECT_ID}`)).json()).data || []) as any[];
    const youtube = atoms.find((a) => a.title === titles.youtube);
    expect(youtube.metadata.sourceUrl).toBe(youtubeUrl);
    expect(youtube.content.targetUrl).toBe(youtubeUrl);
  });
});
