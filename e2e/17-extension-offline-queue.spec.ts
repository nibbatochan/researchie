import { test, expect, type BrowserContext, type Worker } from '@playwright/test';
import { launchExtension, closeExtension, connect, disconnect, type Ext } from './helpers/extension';

// The real extension's background worker, in a throwaway Chrome profile. "Offline" and server errors are
// simulated by swapping fetch inside the worker for atom saves; the final sync goes to the real app.
// The extension only sends once it is connected, so each test starts connected (a local pairing token).

test.describe('17. Offline queue sends itself when the connection returns', () => {
  let context: BrowserContext;
  let worker: Worker;
  let ext: Ext;
  const stamp = Date.now();
  const createdTitles: string[] = [];

  test.beforeAll(async () => {
    ext = await launchExtension();
    context = ext.context;
    worker = ext.worker;
  });

  test.beforeEach(async () => {
    await connect(worker);
  });

  test.afterAll(async ({ request }) => {
    const all = ((await (await request.get('/api/atoms?projectId=all')).json()).data || []) as any[];
    for (const a of all) if (createdTitles.includes(a.title)) await request.delete(`/api/atoms?id=${a.id}`);
    await closeExtension(ext);
  });

  const projectOf = async (request: any) => {
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as Array<{ id: string; title: string; parentId?: string | null }>;
    return projects.filter((p) => !p.parentId)[0];
  };

  const note = (title: string) => ({
    type: 'note',
    title,
    content: { text: title, markdownContent: title },
    metadata: { sourceUrl: 'https://example.org/queue', pageTitle: 'Queue test' },
    tags: [],
  });

  // Make atom POSTs fail the way a down server does, or answer with a status, or go through again.
  const setNetwork = (mode: 'down' | 'ok' | number) =>
    worker.evaluate((m) => {
      const w = self as any;
      w.__origFetch = w.__origFetch || w.fetch.bind(self);
      w.fetch = (url: any, opts: any) => {
        const isAtomPost = String(url).endsWith('/atoms') && opts && opts.method === 'POST';
        if (isAtomPost && m === 'down') return Promise.reject(new TypeError('Failed to fetch'));
        if (isAtomPost && typeof m === 'number') return Promise.resolve(new Response('{}', { status: m }));
        return w.__origFetch(url, opts);
      };
    }, mode);

  const queue = () => worker.evaluate(async () => ((await chrome.storage.local.get('offlineQueue')).offlineQueue || []) as any[]);
  const serverHas = async (request: any, title: string) => {
    const all = ((await (await request.get('/api/atoms?projectId=all')).json()).data || []) as any[];
    return all.some((a) => a.title === title);
  };

  test('a clip saved while the server is down is queued with its project, sent automatically, and removed', async ({ request }) => {
    const project = await projectOf(request);
    const title = `E2E queued ${stamp}`;
    createdTitles.push(title);
    await worker.evaluate(async (p) => {
      await chrome.storage.local.set({ offlineQueue: [], activeProjectId: p.id, activeProjectTitle: p.title, extensionEnabled: true });
    }, project);

    await setNetwork('down');
    const saved = await worker.evaluate((payload) => (self as any).saveAtomToPlatform(payload), note(title));
    expect(saved).toMatchObject({ success: false, queued: true });

    const q = await queue();
    expect(q).toHaveLength(1);
    expect(q[0].projectId).toBe(project.id); // fixed when the clip was taken
    expect(q[0].queueId).toBeTruthy();
    expect(await worker.evaluate(() => chrome.alarms.get('researchie-flush-offline').then((a) => Boolean(a)))).toBe(true);

    // Still down: the flush keeps the clip.
    const stillDown = await worker.evaluate(() => (self as any).flushOfflineQueue());
    expect(stillDown).toMatchObject({ synced: 0, remaining: 1, reachable: false });
    expect(await queue()).toHaveLength(1);
    expect(await serverHas(request, title)).toBe(false);

    // Connection back: the same flush the alarm runs sends it to the project it was clipped for.
    await setNetwork('ok');
    const back = await worker.evaluate(() => (self as any).flushOfflineQueue());
    expect(back).toMatchObject({ synced: 1, remaining: 0, reachable: true });
    expect(await queue()).toHaveLength(0);
    expect(await serverHas(request, title)).toBe(true);
    const sent = (((await (await request.get(`/api/atoms?projectId=${project.id}`)).json()).data || []) as any[]).find((a) => a.title === title);
    expect(sent).toBeTruthy();
    // Nothing waiting, so the retry alarm is switched off.
    expect(await worker.evaluate(() => chrome.alarms.get('researchie-flush-offline').then((a) => Boolean(a)))).toBe(false);
  });

  test('not connected: the clip is held without a network call, then sent when the account is connected', async ({ request }) => {
    const project = await projectOf(request);
    const title = `E2E held ${stamp}`;
    createdTitles.push(title);
    await worker.evaluate(async (p) => {
      await chrome.storage.local.set({ offlineQueue: [], activeProjectId: p.id, extensionEnabled: true });
    }, project);
    await setNetwork('ok');
    await disconnect(worker);

    const saved = await worker.evaluate((payload) => (self as any).saveAtomToPlatform(payload), note(title));
    expect(saved).toMatchObject({ success: false, queued: true, needsConnect: true });
    expect(await queue()).toHaveLength(1);
    // The automatic flush does not try while disconnected, and the retry alarm stays off.
    const flush = await worker.evaluate(() => (self as any).flushOfflineQueue());
    expect(flush).toMatchObject({ synced: 0, needsConnect: true });
    expect(await serverHas(request, title)).toBe(false);

    // Connecting sends the held clip by itself (the storage change triggers the flush).
    await connect(worker);
    await expect.poll(() => serverHas(request, title), { timeout: 30000 }).toBe(true);
    await expect.poll(async () => (await queue()).length).toBe(0);
  });

  test('a server error keeps the clip; a refusal marks it rejected, skips auto retry, and the Sync button retries it', async ({ request }) => {
    const project = await projectOf(request);
    const title500 = `E2E queued 500 ${stamp}`;
    const title400 = `E2E queued 400 ${stamp}`;
    createdTitles.push(title500, title400);
    await worker.evaluate(async (p) => {
      await chrome.storage.local.set({ offlineQueue: [], activeProjectId: p.id, extensionEnabled: true });
    }, project);

    await setNetwork(500);
    await worker.evaluate((payload) => (self as any).saveAtomToPlatform(payload), note(title500));
    let q = await queue();
    expect(q[0].rejected).toBeUndefined(); // 5xx is retryable

    await setNetwork(400);
    await worker.evaluate((payload) => (self as any).saveAtomToPlatform(payload), note(title400));
    q = await queue();
    expect(q).toHaveLength(2);
    expect(q[1]).toMatchObject({ rejected: true, lastError: 'HTTP 400' });

    // A flush against a server that still answers 500 loses nothing.
    await setNetwork(500);
    const r = await worker.evaluate(() => (self as any).flushOfflineQueue());
    expect(r.synced).toBe(0);
    expect(await queue()).toHaveLength(2);

    // Server healthy: the automatic flush sends the retryable clip and leaves the rejected one.
    await setNetwork('ok');
    const auto = await worker.evaluate(() => (self as any).flushOfflineQueue());
    expect(auto.synced).toBe(1);
    expect((await queue()).map((i) => i.title)).toEqual([title400]);
    expect(await serverHas(request, title500)).toBe(true);

    // The Sync button retries everything, rejected included.
    // Sent from an extension page, the way the side panel's button sends it.
    const extPage = await context.newPage();
    await extPage.goto(`chrome-extension://${worker.url().split('/')[2]}/popup.html`);
    const manual = await extPage.evaluate(() => (window as any).chrome.runtime.sendMessage({ action: 'FLUSH_OFFLINE_QUEUE', includeRejected: true }));
    await extPage.close();
    expect(manual).toMatchObject({ success: true, synced: 1, remaining: 0 });
    expect(await serverHas(request, title400)).toBe(true);
  });

  test('a clip saved while a flush is running is not lost', async ({ request }) => {
    const project = await projectOf(request);
    const first = `E2E queued race A ${stamp}`;
    const second = `E2E queued race B ${stamp}`;
    createdTitles.push(first, second);
    await worker.evaluate(async (p) => {
      await chrome.storage.local.set({ offlineQueue: [], activeProjectId: p.id, extensionEnabled: true });
    }, project);

    await setNetwork('down');
    await worker.evaluate((payload) => (self as any).saveAtomToPlatform(payload), note(first));
    await setNetwork('ok');
    // Start the flush and, at the same moment, queue another clip while the server is still down for it.
    const [, savedSecond] = await worker.evaluate(
      async ([payload]) => {
        const w = self as any;
        const flush = w.flushOfflineQueue();
        const origFetch = w.fetch;
        w.fetch = (u: any, o: any) => (String(u).endsWith('/atoms') && o && o.method === 'POST' ? Promise.reject(new TypeError('down')) : origFetch(u, o));
        const saved = await w.saveAtomToPlatform(payload);
        w.fetch = origFetch;
        return [await flush, saved];
      },
      [note(second)],
    );
    expect(savedSecond).toMatchObject({ queued: true });
    // Whatever order they ran in, both clips are accounted for: one on the server or in the queue, never neither.
    const left = (await queue()).map((i) => i.title);
    for (const t of [first, second]) {
      const onServer = await serverHas(request, t);
      expect(onServer || left.includes(t), t).toBe(true);
    }
  });
});
