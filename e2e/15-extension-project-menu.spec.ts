import { test, expect, type Page } from '@playwright/test';
import { launchExtension, closeExtension, connect, disconnect, ORIGIN, type Ext } from './helpers/extension';

// The real extension, in a throwaway Chrome profile. The three dots on the text pill open "Set project": a small
// label, the chosen project under it (highlighted), and the project list in the platform's style (a project has
// a folder, a sub-project has no icon and a guide line). The block, image and screenshot dialogs share one look,
// stay inside the window, and use the same "Set project" button plus a tag icon. Choosing a project sets the
// same active project the popup sets.
test.describe('15. The Set project panel and the capture dialogs', () => {
  let ext: Ext;

  test.beforeAll(async () => {
    ext = await launchExtension();
  });
  test.afterAll(async () => {
    await closeExtension(ext);
  });
  test.beforeEach(async () => {
    await connect(ext.worker);
  });

  const activeProjectId = () => ext.worker.evaluate(async () => (await chrome.storage.local.get('activeProjectId')).activeProjectId as string);

  type Project = { id: string; title: string; parentId?: string | null };
  async function twoProjects(request: any) {
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as Project[];
    const tops = projects.filter((p) => !p.parentId);
    expect(tops.length).toBeGreaterThanOrEqual(2);
    return { projects, first: tops[0], second: tops[1] };
  }

  async function setDestination(p: Project) {
    await ext.worker.evaluate(async (dest) => {
      await chrome.storage.local.set({ extensionEnabled: true, activeProjectId: dest.id, activeProjectTitle: dest.title, activeParentTitle: '' });
    }, p);
  }

  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
  const TEXT = 'The council approved a new bicycle lane network after a two year study of commuter traffic.';

  async function openPlainPage(extraBody = ''): Promise<Page> {
    const page = await ext.context.newPage();
    await page.route('http://article.example.test/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><head><title>Article</title></head><body><h1>A short article</h1><div id="card" style="padding:20px;width:300px"><p id="para">${TEXT}</p></div><img id="pic" src="${PIXEL}" width="120" height="80" style="display:block;margin-top:20px" />${extraBody}</body></html>`,
      }),
    );
    await page.goto('http://article.example.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    return page;
  }

  async function selectParagraph(page: Page) {
    await page.evaluate(() => {
      const target = document.getElementById('para') as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      const rect = target.getBoundingClientRect();
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: rect.right, clientY: rect.bottom }));
    });
    const pill = page.locator('.selection-container');
    await expect(pill).toBeVisible({ timeout: 10000 });
    return pill;
  }

  // Every part of the dialog, buttons included, sits inside the window.
  async function expectInsideWindow(page: Page, selector: string) {
    const fits = async () =>
      page.evaluate((sel) => {
        const box = (document.querySelector(sel) as HTMLElement).getBoundingClientRect();
        const send = document.querySelector(`${sel} .rm-btn-primary`) as HTMLElement;
        const sendBox = send.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const vh = window.innerHeight;
        const inside = (b: DOMRect) => b.left >= 0 && b.top >= 0 && b.right <= vw && b.bottom <= vh;
        return inside(box) && inside(sendBox);
      }, selector);
    await expect.poll(fits).toBe(true);
  }

  test('the pill is icons only with nothing between them, and the three dots open Set project', async ({ request }) => {
    const { projects, first, second } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);
    const pill = await selectParagraph(page);

    // No divider lines and no Ask AI anywhere on the pill.
    await expect(pill.locator('.selection-divider')).toHaveCount(0);
    await expect(pill).not.toContainText('Ask AI');

    // Hovering Send shows where the clip goes.
    await pill.locator('#pill-arrow-btn').hover();
    await expect(pill.locator('.rm-tooltip')).toHaveText(`Send to ${first.title}`);

    // The three dots open Set project: the label, the chosen project under it, then the list.
    await pill.locator('.rm-dots').click();
    const popup = pill.locator('.rm-popup');
    await expect(popup.locator('.rm-head-label')).toHaveText('Set project');
    await expect(popup.locator('.rm-head-name')).toHaveText(first.title);
    await expect(popup.locator('.rm-action')).toHaveCount(0); // no Ask AI row
    const items = popup.locator('.rm-list .rm-item');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
    expect(await items.count()).toBeGreaterThanOrEqual(projects.length);
    await expect(popup.locator('.rm-item[aria-checked="true"]')).toContainText(first.title);

    // The list draws no scrollbar.
    const list = popup.locator('.rm-list');
    expect(await list.evaluate((e) => getComputedStyle(e).scrollbarWidth)).toBe('none');

    // A project has a folder; a sub-project has no icon and hangs off a guide line, as on the platform.
    await expect(popup.locator('.rm-item.rm-top .rm-ico').first()).toBeVisible();
    await expect(popup.locator('.rm-item.rm-subitem .rm-ico')).toHaveCount(0);
    const subs = projects.filter((p) => p.parentId);
    if (subs.length > 0) {
      await expect(popup.locator('.rm-subs').first()).toBeVisible();
      expect(await popup.locator('.rm-subs').first().evaluate((e) => parseFloat(getComputedStyle(e).borderLeftWidth))).toBeGreaterThan(0);
    }

    // Choosing a project changes the active project, the highlighted name and the tooltip.
    await popup.locator('.rm-item', { hasText: second.title }).first().click();
    await expect.poll(activeProjectId).toBe(second.id);
    await pill.locator('#pill-arrow-btn').hover();
    await expect(pill.locator('.rm-tooltip')).toContainText(second.title);
    await page.close();
  });

  test('the tag field on the pill has no outline box', async ({ request }) => {
    const { first } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);
    const pill = await selectParagraph(page);
    await pill.locator('#pill-tag-trigger').click();
    const input = pill.locator('#pill-tag-input');
    await expect(input).toBeVisible();
    expect(await input.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('0px');
    await page.close();
  });

  test('when not connected, the project list says so and offers to connect', async ({ request }) => {
    const { first } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage();
    await disconnect(ext.worker);

    const pill = await selectParagraph(page);
    await pill.locator('.rm-dots').click();
    await expect(pill.locator('.rm-popup .rm-note')).toContainText('Not connected');
    await expect(pill.locator('.rm-popup .rm-connect-btn')).toBeVisible();
    await page.close();
  });

  test('sending while not connected shows a clear prompt, holds the clip, and sends it after connecting', async ({ request }) => {
    const { first } = await twoProjects(request);
    await setDestination(first);
    const title = `E2E held ${Date.now()}`;
    await ext.worker.evaluate(async () => {
      await chrome.storage.local.set({ offlineQueue: [] });
    });
    await disconnect(ext.worker);

    const page = await ext.context.newPage();
    await page.route('http://article.example.test/', (route) =>
      route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><title>${title}</title></head><body><p id="para">${TEXT} ${title}</p></body></html>` }),
    );
    await page.goto('http://article.example.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const pill = await selectParagraph(page);
    await pill.locator('#pill-arrow-btn').click();

    const prompt = page.locator('#researchie-connect-toast-host');
    await expect(prompt).toBeAttached({ timeout: 10000 });
    await expect(prompt.locator('.rm-connect-toast')).toContainText('Not connected');
    await expect(prompt.locator('.rm-connect-btn')).toBeVisible();

    // Held in the extension, not on the server.
    const held = await ext.worker.evaluate(async () => ((await chrome.storage.local.get('offlineQueue')).offlineQueue || []) as any[]);
    expect(held).toHaveLength(1);
    const onServer = async () => (((await (await request.get('/api/atoms?projectId=all')).json()).data || []) as any[]).some((a) => (a.title || '').includes(title) || JSON.stringify(a.content).includes(title));
    expect(await onServer()).toBe(false);

    // Connecting sends it.
    await connect(ext.worker);
    await expect.poll(onServer, { timeout: 30000 }).toBe(true);
    const all = ((await (await request.get('/api/atoms?projectId=all')).json()).data || []) as any[];
    for (const a of all.filter((x) => JSON.stringify(x.content).includes(title))) await request.delete(`/api/atoms?id=${a.id}`);
    await page.close();
  });

  test('the block dialog: Set project button and tag icon, one dialog look, fully inside the window', async ({ request }) => {
    const { first, second } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_BLOCK_PICKER')));
    await page.locator('#card').hover();
    await page.locator('#card').click();

    const dialog = page.locator('#researchie-block-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveClass(/rm-dialog/);
    const row = dialog.locator('.rm-dest');
    await expect(row.locator('.rm-chip-label')).toHaveText('Set project');
    await expect(row.locator('.rm-chip-name')).toHaveText(first.title);
    await expect(row.locator('.rm-chip-tag')).toBeVisible();
    await expect(dialog).not.toContainText('Ask AI');
    await expect(dialog.locator('#btn-block-cancel')).toHaveText('Cancel');
    await expect(dialog.locator('#btn-block-confirm')).toHaveText('Send');

    // The tag field stays hidden until the tag icon is pressed, and has no outline box.
    await expect(dialog.locator('#block-tag-input')).toBeHidden();
    await row.locator('.rm-chip-tag').click();
    await expect(dialog.locator('#block-tag-input')).toBeVisible();
    expect(await dialog.locator('#block-tag-input').evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('0px');
    await expectInsideWindow(page, '#researchie-block-dialog');

    // The project button opens Set project and the choice shows on the button.
    await row.locator('.rm-chip-project').click();
    await expect(row.locator('.rm-head-label')).toHaveText('Set project');
    await row.locator('.rm-list .rm-item', { hasText: second.title }).first().click();
    await expect(row.locator('.rm-chip-name')).toContainText(second.title);
    await expect.poll(activeProjectId).toBe(second.id);
    await page.close();
  });

  test('a dialog near the bottom right of the window stays fully inside it, buttons included', async ({ request }) => {
    const { first } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage('<div id="low" style="position:fixed;right:4px;bottom:4px;width:60px;height:40px;background:#444"><p>x</p></div>');
    await setDestination(first);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_BLOCK_PICKER')));
    await page.locator('#low').hover();
    await page.locator('#low').click();
    const dialog = page.locator('#researchie-block-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expectInsideWindow(page, '#researchie-block-dialog');

    // Opening the tag field makes the dialog taller; it is pulled back in.
    await dialog.locator('.rm-chip-tag').click();
    await expect(dialog.locator('#block-tag-input')).toBeVisible();
    await expectInsideWindow(page, '#researchie-block-dialog');
    await page.close();
  });

  test('the image dialog has the same look: project button and tag icon only', async ({ request }) => {
    const { first, second } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESEARCHIE_TRIGGER_IMAGE_SELECTOR')));
    await page.locator('#pic').hover();
    await page.locator('#pic').click();

    const dialog = page.locator('#researchie-crop-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveClass(/rm-dialog/);
    const row = dialog.locator('.rm-dest');
    await expect(row.locator('.rm-chip-name')).toHaveText(first.title);
    await expect(row.locator('.rm-chip-tag')).toBeVisible();
    await expect(dialog).not.toContainText('Ask AI');
    await expectInsideWindow(page, '#researchie-crop-dialog');
    await row.locator('.rm-chip-project').click();
    await row.locator('.rm-list .rm-item', { hasText: second.title }).first().click();
    await expect(row.locator('.rm-chip-name')).toContainText(second.title);
    await page.close();
  });

  test('the screenshot dialog has the same look: project button and tag icon only', async ({ request }) => {
    const { first } = await twoProjects(request);
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
    await expect(dialog).toHaveClass(/rm-dialog/);
    const row = dialog.locator('.rm-dest');
    await expect(row.locator('.rm-chip-name')).toHaveText(first.title);
    await expect(row.locator('.rm-chip-tag')).toBeVisible();
    await expect(dialog).not.toContainText('Ask AI');
    await expectInsideWindow(page, '#researchie-crop-dialog');
    await page.close();
  });

  test('the Link button in the popup says what happened, in the popup and on the page', async ({ request }) => {
    const { first } = await twoProjects(request);
    await setDestination(first);
    const page = await openPlainPage();
    await setDestination(first);
    const popup = await ext.context.newPage();
    await popup.goto(`chrome-extension://${ext.extensionId}/popup.html`);
    await page.bringToFront();
    // The popup page acts on the active tab, which is the article page here.
    await popup.evaluate(() => (document.getElementById('mode-link') as HTMLElement).click());
    await expect(popup.locator('#toast')).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('#toast')).toContainText('Page link saved');
    await expect(page.getByText(/Page link saved/)).toBeVisible({ timeout: 10000 });
    // Remove the clip this test made.
    const all = ((await (await request.get('/api/atoms?projectId=all')).json()).data || []) as any[];
    for (const a of all.filter((x) => JSON.stringify(x.content).includes('article.example.test'))) await request.delete(`/api/atoms?id=${a.id}`);
    await popup.close();
    await page.close();
  });

  test('the popup header has no dot beside "recent push"', async () => {
    const popup = await ext.context.newPage();
    await popup.goto(`chrome-extension://${ext.extensionId}/popup.html`);
    await expect(popup.locator('#header-push-status .pulse-dot')).toHaveCount(0);
    await popup.close();
  });
});

// Kept so a failing run names the server the extension was pointed at.
test.afterAll(() => {
  void ORIGIN;
});
