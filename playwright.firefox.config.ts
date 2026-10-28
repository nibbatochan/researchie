import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Same specs as playwright.config.ts, run in Firefox. Use: npx playwright test -c playwright.firefox.config.ts
export default defineConfig({
  ...base,
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
