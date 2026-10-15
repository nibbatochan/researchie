import { test, expect } from '@playwright/test';
import { launchExtension, closeExtension, disconnect, ORIGIN, localToken, type Ext } from './helpers/extension';

// Connect with the token only: the web app makes it, the popup's link icon takes it, and the server address
// comes from inside the token. Works against the local server.
test.describe('20. Connecting the extension with a token', () => {
  let ext: Ext;
  test.beforeAll(async () => {
    ext = await launchExtension();
  });
  test.afterAll(async () => {
    await closeExtension(ext);
  });

  test('the web app hands out a token that carries this server address', async ({ request }) => {
    const res = await request.post('/api/auth/tokens', { data: { label: 'e2e' } });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.token).toBe(localToken(ORIGIN));
  });

  test('the main popup has no connect form; the link icon opens it; one paste and Connect finishes', async () => {
    await disconnect(ext.worker);
    const popup = await ext.context.newPage();
    await popup.goto(`chrome-extension://${ext.extensionId}/popup.html`);

    await expect(popup.locator('#connect-panel')).toBeHidden();
    await expect(popup.locator('#connect-server, input[type="url"]')).toHaveCount(0); // no server address field
    await expect(popup.locator('#connect-dot')).toHaveClass(/off/);

    await popup.locator('#connect-toggle').click();
    await expect(popup.locator('#connect-panel')).toBeVisible();
    await expect(popup.locator('#connect-status')).toHaveText('Not connected');

    // A token with no address is refused with a plain message.
    await popup.locator('#connect-token').fill('rst_nosuffix');
    await expect(popup.locator('#connect-target')).toContainText('no server address');
    await popup.locator('#connect-save').click();
    await expect(popup.locator('#connect-msg')).toContainText('no server address');

    // The real token shows where it connects, then connects.
    await popup.locator('#connect-token').fill(localToken(ORIGIN));
    await expect(popup.locator('#connect-target')).toContainText(new URL(ORIGIN).host);
    await popup.locator('#connect-save').click();
    await expect(popup.locator('#connect-msg')).toContainText('Connected', { timeout: 15000 });
    await expect(popup.locator('#connect-dot')).toHaveClass(/on/);

    const stored = await ext.worker.evaluate(() => chrome.storage.local.get(['serverUrl', 'authToken', 'apiBaseUrl', 'activeProjectId']));
    expect(stored.serverUrl).toBe(ORIGIN);
    expect(stored.authToken).toBe(localToken(ORIGIN));
    expect(stored.activeProjectId).toBeTruthy();

    // Disconnect clears it.
    await popup.locator('#connect-clear').click();
    await expect(popup.locator('#connect-dot')).toHaveClass(/off/);
    expect((await ext.worker.evaluate(() => chrome.storage.local.get('authToken'))).authToken).toBeUndefined();
    await popup.close();
  });

  test('the side panel has the same connect panel: link icon, paste the token, Connect', async () => {
    await disconnect(ext.worker);
    const panel = await ext.context.newPage();
    await panel.goto(`chrome-extension://${ext.extensionId}/sidepanel.html`);

    await expect(panel.locator('#connect-panel')).toBeHidden();
    await expect(panel.locator('#sp-sync-status-text')).toHaveText('Not connected', { timeout: 15000 });
    await panel.locator('#connect-toggle').click();
    await expect(panel.locator('#connect-panel')).toBeVisible();
    await panel.locator('#connect-token').fill(localToken(ORIGIN));
    await expect(panel.locator('#connect-target')).toContainText(new URL(ORIGIN).host);
    await panel.locator('#connect-save').click();
    await expect(panel.locator('#connect-msg')).toContainText('Connected', { timeout: 15000 });
    await expect(panel.locator('#connect-dot')).toHaveClass(/on/);
    await expect(panel.locator('#sp-sync-status-text')).toHaveText('Connected', { timeout: 15000 });
    expect((await ext.worker.evaluate(() => chrome.storage.local.get('authToken'))).authToken).toBe(localToken(ORIGIN));
    await panel.close();
  });

  test('a token for a server that is not running says so', async () => {
    const popup = await ext.context.newPage();
    await popup.goto(`chrome-extension://${ext.extensionId}/popup.html`);
    await popup.locator('#connect-toggle').click();
    await popup.locator('#connect-token').fill(localToken('http://localhost:1'));
    await popup.locator('#connect-save').click();
    await expect(popup.locator('#connect-msg')).toContainText('Could not reach', { timeout: 15000 });
    await popup.close();
  });
});
