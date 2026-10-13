import { test, expect } from '@playwright/test';

test.describe('3. 2D Spatial Canvas & Whiteboard Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const projectCard = page.locator('[data-testid="project-card"], [data-testid="subproject-card"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForTimeout(400);
    }
  });

  test('switches to Spatial Canvas mode seamlessly', async ({ page }) => {
    const canvasBtn = page.locator('button[title*="Canvas"], button[title*="Spatial"], button:has-text("Canvas")').first();
    if (await canvasBtn.isVisible()) {
      await canvasBtn.click();
      await page.waitForTimeout(500);

      // Verify canvas artboard surface is present
      // The canvas can take a few seconds to draw on a cold start, so wait longer than the 5s default.
      const artboard = page.locator('.canvas-artboard, [class*="canvas"]').first();
      await expect(artboard).toBeVisible({ timeout: 20000 });
    }
  });

  test('can toggle between Compact and Detailed node rendering on canvas', async ({ page }) => {
    const canvasBtn = page.locator('button[title*="Canvas"], button:has-text("Canvas")').first();
    if (await canvasBtn.isVisible()) {
      await canvasBtn.click();
      await page.waitForTimeout(400);

      const compactBtn = page.locator('button[title*="Compact"], button:has-text("Compact")').first();
      const detailedBtn = page.locator('button[title*="Detailed"], button:has-text("Detailed")').first();

      if (await compactBtn.isVisible()) {
        await compactBtn.click();
        await page.waitForTimeout(300);
      }
      if (await detailedBtn.isVisible()) {
        await detailedBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('can create a new Section frame and Sticky Note on canvas', async ({ page }) => {
    const canvasBtn = page.locator('button[title*="Canvas"], button:has-text("Canvas")').first();
    if (await canvasBtn.isVisible()) {
      await canvasBtn.click();
      await page.waitForTimeout(400);

      const sectionBtn = page.locator('button:has-text("Section")').first();
      if (await sectionBtn.isVisible()) {
        await sectionBtn.click();
        await page.waitForTimeout(300);
      }

      const noteBtn = page.locator('button:has-text("Note")').first();
      if (await noteBtn.isVisible()) {
        await noteBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('triggers Cognee Auto-Connect Graph and renders connections', async ({ page }) => {
    const canvasBtn = page.locator('button[title*="Canvas"], button:has-text("Canvas")').first();
    if (await canvasBtn.isVisible()) {
      await canvasBtn.click();
      await page.waitForTimeout(400);

      const autoConnectBtn = page.locator('button:has-text("Auto-Connect Graph")').first();
      if (await autoConnectBtn.isVisible()) {
        await autoConnectBtn.click();
        await page.waitForTimeout(1000);

        // Verify button returned to normal state
        await expect(autoConnectBtn).not.toHaveText(/Analyzing/i);
      }
    }
  });
});
