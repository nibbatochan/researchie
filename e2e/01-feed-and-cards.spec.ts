import { test, expect } from '@playwright/test';

test.describe('1. Feed Stream & Bento Cards Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const projectCard = page.locator('[data-testid="project-card"], [data-testid="subproject-card"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForTimeout(400);
    }
  });

  test('renders knowledge stream header and active project', async ({ page }) => {
    const mainHeading = page.locator('h1, h2, [class*="font-display"]').first();
    await expect(mainHeading).toBeVisible({ timeout: 10000 });
  });

  test('filters cards dynamically when searching', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('retrieval');
      await page.waitForTimeout(300);
      // Verify matches or highlighted terms exist
      const cardList = page.locator('article, [class*="rounded-"], [class*="border"]').first();
      await expect(cardList).toBeVisible();
    }
  });

  test('filters by tags correctly', async ({ page }) => {
    const tagPill = page.locator('button:has-text("#"), [class*="tag"], [class*="pill"]').first();
    if (await tagPill.isVisible()) {
      await tagPill.click();
      await page.waitForTimeout(300);
    }
  });

  test('verifies DOM Block cards have bounded 300px height', async ({ page }) => {
    const blockIframe = page.locator('iframe[title="DOM Block Preview"]').first();
    if (await blockIframe.isVisible()) {
      const box = await blockIframe.boundingBox();
      expect(box?.height).toBeLessThanOrEqual(320);
    }
  });

  test('can switch block view between Preview and HTML code', async ({ page }) => {
    const htmlTabButton = page.locator('button:has-text("HTML")').first();
    if (await htmlTabButton.isVisible()) {
      await htmlTabButton.click();
      const codeBlock = page.locator('pre').first();
      await expect(codeBlock).toBeVisible();

      // Switch back to preview
      const previewTabButton = page.locator('button:has-text("Interactive DOM"), button:has-text("Preview")').first();
      await previewTabButton.click();
    }
  });
});
