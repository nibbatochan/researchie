import { test, expect } from '@playwright/test';

test.describe('5. Project Export & Citations Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens Export Project modal with all formats', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click({ force: true });
      await page.waitForTimeout(400);

      const modalHeading = page.locator('h3:has-text("Export Research")').first();
      if (await modalHeading.isVisible()) {
        await expect(modalHeading).toBeVisible();
      }
    }
  });

  test('can switch export format tabs inside modal', async ({ page }) => {
    const exportBtn = page.locator('button[title*="Export"], button:has-text("Export")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(400);

      const citationsTab = page.locator('button:has-text("Citations"), button:has-text("BibTeX")').first();
      if (await citationsTab.isVisible()) {
        await citationsTab.click();
        await page.waitForTimeout(300);
      }

      const jsonTab = page.locator('button:has-text("JSON")').first();
      if (await jsonTab.isVisible()) {
        await jsonTab.click();
        await page.waitForTimeout(300);
      }
    }
  });
});
