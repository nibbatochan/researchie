import { test, expect } from '@playwright/test';

test.describe('21. Get the Chrome extension from the dashboard', () => {
  test('the top-right button opens the download and install steps', async ({ page }) => {
    await page.goto('/');
    const button = page.getByTestId('get-extension-button');
    await expect(button).toBeVisible();
    // Wait for hydration before clicking.
    await expect(async () => {
      await button.click();
      await expect(page.getByTestId('get-extension-modal')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });

    const link = page.getByTestId('download-extension');
    await expect(link).toHaveAttribute('href', '/researchie-extension.zip');
    await expect(page.getByText('Load unpacked').first()).toBeVisible();

    const res = await page.request.get('/researchie-extension.zip');
    expect(res.status()).toBe(200);
    expect((await res.body()).length).toBeGreaterThan(10000);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('get-extension-modal')).toHaveCount(0);
  });
});
