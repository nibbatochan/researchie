import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

// The real extension, loaded into a throwaway Chrome profile (nothing of the user's is touched).
// Selecting text shows the pill. Hovering Send shows where the clip will go, and the three-dot menu
// next to "+ Tag" lists every project; choosing one changes the active project, the same one the popup sets.
const EXTENSION_DIR = path.resolve(__dirname, '..', 'extension');

test.describe('15. In-page project switching on the selection pill', () => {
  let context: BrowserContext;
  let worker: Worker;
  let userDataDir: string;

  test.beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'researchie-ext-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  });

  test.afterAll(async () => {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  const activeProjectId = () => worker.evaluate(async () => (await chrome.storage.local.get('activeProjectId')).activeProjectId as string);

  test('Send shows the destination, and the three-dot menu changes it', async ({ request }) => {
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as Array<{ id: string; title: string; parentId?: string | null }>;
    const [first, second] = projects.filter((p) => !p.parentId);
    expect(first && second).toBeTruthy();

    await worker.evaluate(async (p) => {
      await chrome.storage.local.set({
        extensionEnabled: true,
        activeProjectId: p.id,
        activeProjectTitle: p.title,
        activeParentTitle: '',
      });
    }, first);

    const page = await context.newPage();
    // A plain page of our own, so the app's own scripts cannot interfere with the extension.
    await page.route('http://article.example.test/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><title>Article</title></head><body><h1>A short article</h1><p id="para">The council approved a new bicycle lane network after a two year study of commuter traffic.</p></body></html>',
      }),
    );
    await page.goto('http://article.example.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await worker.evaluate(async (p) => {
      await chrome.storage.local.set({ activeProjectId: p.id, activeProjectTitle: p.title, activeParentTitle: '' });
    }, first);

    // Select a block of text and release the mouse, which is what shows the pill.
    await page.evaluate(() => {
      const target = document.getElementById('para') as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      const rect = target.getBoundingClientRect();
      // Dispatched on the paragraph, as a real mouse release would be; it bubbles up to the page.
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: rect.right, clientY: rect.bottom }));
    });

    const pill = page.locator('.selection-container');
    await expect(pill).toBeVisible({ timeout: 10000 });

    // Hovering Send shows the destination.
    await pill.locator('#pill-arrow-btn').hover();
    await expect(pill.locator('.rm-tooltip')).toHaveText(`Send to ${first.title}`);

    // The three-dot menu lists every project, with the current one ticked.
    await pill.locator('.rm-dots').click();
    const items = pill.locator('.rm-list .rm-item');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
    expect(await items.count()).toBeGreaterThanOrEqual(projects.length);
    await expect(pill.locator(`.rm-item[aria-checked="true"]`)).toContainText(first.title);

    // Choosing another project changes the active project and the tooltip.
    await pill.locator('.rm-item', { hasText: second.title }).first().click();
    await expect.poll(activeProjectId).toBe(second.id);
    await pill.locator('#pill-arrow-btn').hover();
    await expect(pill.locator('.rm-tooltip')).toContainText(second.title);
    await page.close();
  });

  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

  async function openPlainPage() {
    const page = await context.newPage();
    await page.route('http://article.example.test/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><head><title>Article</title></head><body><h1>A short article</h1><div id="card" style="padding:20px;width:300px"><p>The council approved a new bicycle lane network.</p></div><img id="pic" src="${PIXEL}" width="120" height="80" style="display:block;margin-top:20px" /></body></html>`,
      }),
    );
    await page.goto('http://article.example.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    return page;
  }

  async function setDestination(p: { id: string; title: string }) {
    await worker.evaluate(async (dest) => {
      await chrome.storage.local.set({
        extensionEnabled: true,
        activeProjectId: dest.id,
        activeProjectTitle: dest.title,
        activeParentTitle: '',
      });
    }, p);
  }

  test('the DOM block dialog shows its destination, changes it, and can open Ask AI', async ({ request }) => {
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as Array<{ id: string; title: string; parentId?: string | null }>;
    const [first, second] = projects.filter((p) => !p.parentId);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_BLOCK_PICKER')));
    await page.locator('#card').hover();
    await page.locator('#card').click();

    const dialog = page.locator('#researchie-block-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('.rm-dest')).toContainText(`Sends to ${first.title}`);

    await dialog.locator('.rm-dots').click();
    await dialog.locator('.rm-list .rm-item', { hasText: second.title }).first().click();
    await expect(dialog.locator('.rm-dest')).toContainText(`Sends to ${second.title}`);
    await expect.poll(activeProjectId).toBe(second.id);

    // Ask AI opens the Q&A drawer.
    await dialog.locator('.rm-dots').click();
    await dialog.locator('.rm-item', { hasText: 'Ask AI' }).click();
    await expect(page.locator('#researchie-sidebar-host')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)/);
    await page.close();
  });

  test('the image dialog shows its destination and the menu changes it', async ({ request }) => {
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as Array<{ id: string; title: string; parentId?: string | null }>;
    const [first, second] = projects.filter((p) => !p.parentId);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_IMAGE_SELECTOR')));
    await page.locator('#pic').hover();
    await page.locator('#pic').click();

    const dialog = page.locator('#researchie-crop-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('.rm-dest')).toContainText(`Sends to ${first.title}`);
    await dialog.locator('.rm-dots').click();
    await dialog.locator('.rm-list .rm-item', { hasText: second.title }).first().click();
    await expect(dialog.locator('.rm-dest')).toContainText(`Sends to ${second.title}`);
    await page.close();
  });

  test('the screenshot dialog shows its destination', async ({ request }) => {
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as Array<{ id: string; title: string; parentId?: string | null }>;
    const [first] = projects.filter((p) => !p.parentId);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_IMAGE_CROPPER')));
    await page.mouse.move(40, 40);
    await page.mouse.down();
    await page.mouse.move(200, 160, { steps: 5 });
    await page.mouse.up();

    const dialog = page.locator('#researchie-crop-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('.rm-dest')).toContainText(`Sends to ${first.title}`);
    await page.close();
  });
});
