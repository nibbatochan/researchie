import { test, expect } from '@playwright/test';

// The accounts-required mode (AUTH_REQUIRED=true), signed out. Needs a second server:
//   AUTH_REQUIRED=true NEXT_PUBLIC_AUTH_REQUIRED=true NEXT_DIST_DIR=.next-auth npx next dev -p 3005
//   AUTH_BASE_URL=http://localhost:3005 npx playwright test e2e/18-auth-gate.spec.ts
// Skipped when AUTH_BASE_URL is not set, so the normal suite is unaffected. It creates no accounts and
// writes no data; the one login attempt uses an address that does not exist and is expected to fail.
const AUTH_BASE_URL = process.env.AUTH_BASE_URL;

test.describe('18. Signed-out visitors on the accounts-required site', () => {
  test.skip(!AUTH_BASE_URL, 'set AUTH_BASE_URL to a server running with AUTH_REQUIRED=true');

  const url = (p: string) => `${AUTH_BASE_URL}${p}`;

  test('every data route refuses a signed-out request', async ({ request }) => {
    const gets = ['/api/projects', '/api/atoms', '/api/documents', '/api/settings/ai-key', '/api/auth/tokens', '/api/share/anything'];
    for (const p of gets) {
      const res = await request.get(url(p));
      expect(res.status(), p).toBe(401);
      expect((await res.json()).success, p).toBe(false);
    }
    const posts: Array<[string, object]> = [
      ['/api/projects', { title: 'x' }],
      ['/api/atoms', { projectId: 'p', type: 'note' }],
      ['/api/documents', { projectId: 'p', title: 't' }],
      ['/api/atoms/search', { query: 'x' }],
      ['/api/ai/qna', { question: 'x', pageText: 'y' }],
      ['/api/ai/summarize', { pageText: 'y' }],
      ['/api/ai/synthesize', { atoms: [], instruction: 'x' }],
      ['/api/ocr', { imageUrl: 'https://example.org/a.png' }],
      ['/api/citations/resolve', { doi: '10.1000/xyz' }],
      ['/api/export/notion', { apiKey: 'x' }],
    ];
    for (const [p, body] of posts) {
      const res = await request.post(url(p), { data: body });
      expect(res.status(), p).toBe(401);
    }
    expect((await request.delete(url('/api/atoms?id=x'))).status()).toBe(401);
    expect((await request.delete(url('/api/projects?id=x'))).status()).toBe(401);
  });

  test('the Python knowledge graph is switched off for testers', async ({ request }) => {
    const res = await request.get(url('/api/ai/graph?projectId=x'));
    expect(res.status()).toBe(501);
  });

  test('an unknown or malformed bearer token is refused, and a cross-site write with a cookie is too', async ({ request }) => {
    for (const header of ['Bearer rst_notarealtoken0000000000000000', 'Bearer abc', 'Basic Zm9v']) {
      const res = await request.get(url('/api/projects'), { headers: { Authorization: header } });
      expect(res.status(), header).toBe(401);
    }
    const cross = await request.post(url('/api/projects'), {
      data: { title: 'x' },
      headers: { Origin: 'https://evil.example', Cookie: 'sb-fake-auth-token=abc' },
    });
    expect(cross.status()).toBe(401);
  });

  test('/api/auth/me says sign-in is required and nobody is signed in', async ({ request }) => {
    const res = await request.get(url('/api/auth/me'));
    expect(await res.json()).toEqual({ authRequired: true, user: null });
  });

  test('sign-up and login check their input and give one vague error for bad credentials', async ({ request }) => {
    const bad = await request.post(url('/api/auth/signup'), { data: { email: 'nope', password: 'longenough1' } });
    expect(bad.status()).toBe(400);
    const short = await request.post(url('/api/auth/signup'), { data: { email: 'a@b.co', password: 'short' } });
    expect(short.status()).toBe(400);
    const empty = await request.post(url('/api/auth/login'), { data: {} });
    expect(empty.status()).toBe(400);

    const wrong = await request.post(url('/api/auth/login'), { data: { email: `nobody-${Date.now()}@example.invalid`, password: 'not-a-real-password' } });
    expect(wrong.status()).toBe(401);
    expect((await wrong.json()).error).toBe('Email or password is incorrect.');
  });

  // Only when the server was started with SIGNUP_INVITE_CODE=<the same value as AUTH_INVITE_CODE>.
  test('with an invite code set, sign-up is refused without it and passes the gate with it', async ({ request }) => {
    test.skip(!process.env.AUTH_INVITE_CODE, 'set AUTH_INVITE_CODE to the code the server was started with');
    expect(((await (await request.get(url('/api/auth/me'))).json()) as { inviteRequired: boolean }).inviteRequired).toBe(true);
    const missing = await request.post(url('/api/auth/signup'), { data: { email: 'a@example.invalid', password: 'longenough1' } });
    expect(missing.status()).toBe(403);
    expect((await missing.json()).code).toBe('INVITE_INVALID');
    // Right code, deliberately bad email: it gets past the gate (400 for the email) and creates no account.
    const past = await request.post(url('/api/auth/signup'), { data: { email: 'not-an-email', password: 'longenough1', inviteCode: process.env.AUTH_INVITE_CODE } });
    expect(past.status()).toBe(400);
    expect((await past.json()).error).toBe('Enter a valid email address.');
  });

  test('logout works with no session and sets no session', async ({ request }) => {
    const res = await request.post(url('/api/auth/logout'), { data: {} });
    expect(res.ok()).toBeTruthy();
    expect((await request.get(url('/api/auth/me'))).ok()).toBeTruthy();
  });

  test('the app sends a signed-out visitor to the login page, which has no demo shortcut and a disabled Google button', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 60000 }); // the first load compiles the whole app
    await expect(page.getByRole('button', { name: /Sign In to Workspace/ })).toBeVisible();
    await expect(page.getByText('Launch Instant Pro Demo')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Google \(coming soon\)/ })).toBeDisabled();
    await expect(page.getByText('Alex Chen')).toHaveCount(0);

    // Nothing about the visitor is kept in browser storage.
    const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(stored.local.filter((k) => /user_session|token/i.test(k))).toEqual([]);
    expect(stored.session).toEqual([]);
  });

  test('a wrong password shows an error on the page and stays signed out', async ({ page }) => {
    await page.goto(url('/login'), { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('name@university.edu').fill(`nobody-${Date.now()}@example.invalid`);
    await page.getByPlaceholder('••••••••').fill('definitely-wrong');
    await page.getByRole('button', { name: /Sign In to Workspace/ }).click();
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
