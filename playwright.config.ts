import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

// The welcome guide opens on a first visit; every spec starts as someone who already closed it.
// e2e/23 clears this to test the first visit itself.
export const seenWelcome = {
  cookies: [],
  origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: 'researchie_welcome_seen', value: '1' }] }],
};

export default defineConfig({
  testDir: './e2e',
  timeout: 45 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    storageState: seenWelcome,
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },
  /* webServer: {
    command: 'npm run dev -- -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  }, */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
