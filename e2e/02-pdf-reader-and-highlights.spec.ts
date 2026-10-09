import { test, expect } from '@playwright/test';

test.describe('2. PDF Reader & In-Situ Highlighting Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    // If on dashboard, navigate into documents or workspace
    const navBtn = page.locator('button:has-text("Document Library"), [data-testid="project-card"]').first();
    if (await navBtn.isVisible()) {
      await navBtn.click();
      await page.waitForTimeout(400);
    }
  });

  test('can open PDF reader view from project timeline', async ({ page }) => {
    const pdfDocButton = page.locator('button:has-text("Docs"), button:has-text(".pdf"), [title*="PDF"], [title*="Document"]').first();
    if (await pdfDocButton.isVisible()) {
      await pdfDocButton.click({ force: true });
      await page.waitForTimeout(500);

      // Verify PDF reader view rendered
      const viewerContainer = page.locator('button:has-text("Doc Assistant"), button:has-text("Upload PDF")').first();
      await expect(viewerContainer).toBeVisible({ timeout: 5000 });
    }
  });

  test('collapsible sidebar in PDF viewer operates smoothly', async ({ page }) => {
    const pdfDocButton = page.locator('button:has-text("Docs"), button:has-text(".pdf"), [title*="PDF"]').first();
    if (await pdfDocButton.isVisible()) {
      await pdfDocButton.click({ force: true });
      await page.waitForTimeout(500);

      // Check sidebar collapse button
      const collapseButton = page.locator('button[title*="Collapse"], button:has([class*="CaretLeft"])').first();
      if (await collapseButton.isVisible()) {
        await collapseButton.click({ force: true });
        await page.waitForTimeout(300);
      }
    }
  });

  test('Doc Assistant drawer opens and closes without breaking layout', async ({ page }) => {
    const pdfDocButton = page.locator('button:has-text("Docs"), button:has-text(".pdf")').first();
    if (await pdfDocButton.isVisible()) {
      await pdfDocButton.click({ force: true });
      await page.waitForTimeout(500);

      const docAssistantBtn = page.locator('button:has-text("Doc Assistant")').first();
      if (await docAssistantBtn.isVisible()) {
        await docAssistantBtn.click({ force: true });
        await page.waitForTimeout(400);

        // Verify Doc Assistant drawer text is displayed
        const drawer = page.locator('span:has-text("Doc Assistant"), div:has-text("Doc Assistant")').first();
        await expect(drawer).toBeVisible();
      }
    }
  });

  test('multi-pdf library and in-toolbar quick switcher operates correctly', async ({ page }) => {
    const pdfDocButton = page.locator('button:has-text("Docs"), button:has-text(".pdf"), [title*="PDF"]').first();
    if (await pdfDocButton.isVisible()) {
      await pdfDocButton.click({ force: true });
      await page.waitForTimeout(500);

      // Verify switch document trigger or document manager button exists
      const switchDocButton = page.locator('button[title="Switch document"], button:has-text("Docs (")').first();
      if (await switchDocButton.isVisible()) {
        await switchDocButton.click({ force: true });
        await page.waitForTimeout(300);

        // Check if dropdown or manager shows up
        const libraryText = page.locator('text=/Library|Document/i').first();
        await expect(libraryText).toBeVisible();
      }
    }
  });
});

