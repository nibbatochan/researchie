import { test, expect, type Page } from '@playwright/test';

// A refused or failed save: the server unreachable (the text stays, the save retries and recovers), and a paper over the
// size limit (the message says so and the text stays). The requests are intercepted in the browser; nothing is changed
// on the server. Papers made here are removed at the end.
const TAG = `E2E-SF ${Date.now()}`;

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
  await page.getByTestId('paper-sheet').locator('.paper-prose p').first().click();
  await page.waitForTimeout(300);
}

const isSave = (url: string, method: string) => method === 'PATCH' && /\/api\/papers\/[^/?]+$/.test(new URL(url).pathname);

test('with the server unreachable the text stays, the status says it is not saved, and the save recovers', async ({ page }) => {
  test.setTimeout(90000);
  await open(page, `${TAG} down`);
  let down = true;
  await page.route('**/api/papers/*', (route) => (isSave(route.request().url(), route.request().method()) && down ? route.abort('connectionrefused') : route.continue()));
  await page.keyboard.type('Words typed while the server is down.');
  await expect(page.getByTestId('save-status')).not.toContainText('Saved', { timeout: 20000 });
  await expect(page.getByTestId('paper-sheet')).toContainText('Words typed while the server is down.');
  down = false;
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 40000 }); // the retries reach the server again
});

test('a paper over the size limit says so, keeps its text, and does not retry forever', async ({ page }) => {
  await open(page, `${TAG} big`);
  let saves = 0;
  await page.route('**/api/papers/*', (route) => {
    if (!isSave(route.request().url(), route.request().method())) return route.continue();
    saves++;
    return route.fulfill({ status: 413, contentType: 'application/json', body: JSON.stringify({ success: false, code: 'TOO_LARGE', error: 'This paper is 2.4 MB, over the 2 MB that can be saved. Remove large pasted images and try again.' }) });
  });
  await page.keyboard.type('Text in a paper that is too big to save.');
  await expect(page.getByTestId('save-status')).toContainText('over the 2 MB', { timeout: 20000 });
  await expect(page.getByTestId('paper-sheet')).toContainText('Text in a paper that is too big to save.');
  const seen = saves;
  await page.waitForTimeout(4000);
  expect(saves).toBe(seen); // a refused save is not retried on a timer
});
