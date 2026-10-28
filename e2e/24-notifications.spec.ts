import { test, expect } from '@playwright/test';

// The notification box next to Settings. Sign-in is faked at the network edge (the box only exists on the accounts
// deployment), so this runs against the local server.
type N = { id: string; kind: string; title: string; body: string; projectId: string | null; createdAt: string; read: boolean };

const now = () => new Date().toISOString();

test.describe('24. Notification box', () => {
  let list: N[];
  const calls: string[] = [];

  test.beforeEach(async ({ page }) => {
    calls.length = 0;
    list = [
      { id: 'n1', kind: 'shared', title: 'Maya shared "Thesis notes" with you', body: 'You can view it. Find it under Shared with me.', projectId: 'proj-x', createdAt: now(), read: false },
      { id: 'n2', kind: 'access_requested', title: 'Ravi asked for access to "Review"', body: 'Please let me in', projectId: 'proj-y', createdAt: now(), read: false },
    ];
    await page.route('**/api/auth/me', (r) =>
      r.fulfill({ json: { authRequired: true, inviteRequired: false, user: { id: 'u1', email: 'me@example.com', name: 'Me', provider: 'email', createdAt: now() } } })
    );
    await page.route('**/api/settings', (r) => r.fulfill({ json: { success: true, data: { prefs: { researchie_welcome_seen: '1' } } } }));
    await page.route('**/api/notifications**', async (route) => {
      const req = route.request();
      calls.push(`${req.method()} ${new URL(req.url()).search}`);
      if (req.method() === 'GET') return route.fulfill({ json: { success: true, data: list, unread: list.filter((n) => !n.read).length } });
      if (req.method() === 'DELETE') {
        const id = new URL(req.url()).searchParams.get('id');
        list = list.filter((n) => n.id !== id);
        return route.fulfill({ json: { success: true } });
      }
      const body = JSON.parse(req.postData() || '{}');
      if (body.action === 'read-all') list = list.map((n) => ({ ...n, read: true }));
      if (body.action === 'clear') list = [];
      return route.fulfill({ json: { success: true } });
    });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('researchie_welcome_seen', '1'));
    await page.reload();
  });

  test('the bell shows the unread count; opening lists them and marks them read', async ({ page }) => {
    const bell = page.getByTestId('notification-bell');
    await expect(page.getByTestId('notification-count')).toHaveText('2');
    await bell.click();
    const items = page.getByTestId('notification-item');
    await expect(items).toHaveCount(2);
    await expect(page.getByTestId('notification-box')).toContainText('Maya shared "Thesis notes" with you');
    await expect(page.getByTestId('notification-box')).toContainText('Open project');
    await expect(page.getByTestId('notification-box')).toContainText('Review request');
    await expect(page.getByTestId('notification-count')).toHaveCount(0);
    expect(calls.some((c) => c.startsWith('POST'))).toBe(true);
  });

  test('a notification can be removed, and Clear all removes the rest', async ({ page }) => {
    await page.getByTestId('notification-bell').click();
    await page.getByRole('button', { name: 'Remove this notification' }).first().click();
    await expect(page.getByTestId('notification-item')).toHaveCount(1);
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(true);
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByTestId('notification-item')).toHaveCount(0);
    await expect(page.getByTestId('notification-box')).toContainText('Nothing new');
  });

  test('a new one that arrives while the app is open pops up, and stays in the box until removed', async ({ page }) => {
    await expect(page.getByTestId('notification-count')).toHaveText('2');
    list = [{ id: 'n3', kind: 'request_approved', title: 'Maya approved your request for "Atlas"', body: 'You can edit it. Find it under Shared with me.', projectId: 'proj-z', createdAt: now(), read: false }, ...list];
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const toast = page.getByTestId('notification-toast');
    await expect(toast).toContainText('Maya approved your request for "Atlas"');
    await expect(page.getByTestId('notification-count')).toHaveText('3');
    await page.getByTestId('notification-bell').click();
    await expect(page.getByTestId('notification-item')).toHaveCount(3);
    await expect(toast).toHaveCount(0);
  });
});
