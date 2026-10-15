import { chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Shared by the extension specs. The real extension is loaded into a throwaway Chrome profile (nothing of the
// user's is touched). The extension only sends clips once it is connected, so the tests connect it the way a
// person does: with the token, which on a local server is a pairing code that carries the server's address.

export const EXTENSION_DIR = path.resolve(__dirname, '..', '..', 'extension');
export const ORIGIN = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** What POST /api/auth/tokens returns on a local server. */
export const localToken = (origin = ORIGIN) => 'rst_local.' + Buffer.from(origin, 'utf8').toString('base64url');

export interface Ext {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  dir: string;
}

export async function launchExtension(): Promise<Ext> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'researchie-ext-'));
  const context = await chromium.launchPersistentContext(dir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  return { context, worker, extensionId: worker.url().split('/')[2], dir };
}

export async function closeExtension(ext: Ext) {
  await ext.context.close();
  fs.rmSync(ext.dir, { recursive: true, force: true });
}

export const connect = (worker: Worker, origin = ORIGIN) =>
  worker.evaluate(
    async ([o, token]) => {
      await chrome.storage.local.set({ serverUrl: o, authToken: token, apiBaseUrl: o + '/api', extensionEnabled: true });
    },
    [origin, localToken(origin)] as const,
  );

export const disconnect = (worker: Worker) =>
  worker.evaluate(async () => {
    await chrome.storage.local.remove(['serverUrl', 'authToken', 'apiBaseUrl']);
  });
