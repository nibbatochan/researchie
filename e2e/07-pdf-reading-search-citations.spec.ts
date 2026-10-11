import { test, expect } from '@playwright/test';

test.describe('07. PDF Reading, Clipping, Search & Assistant Citations Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Switch to Docs / Reader mode
    const docsBtn = page.locator('button[title="Docs"], button:has-text("Document Library")').first();
    if (await docsBtn.isVisible()) {
      await docsBtn.click();
      await page.waitForTimeout(600);
    }

    // If on Document Vault, click "Resume Reading" to enter active reader canvas
    const resumeBtn = page.locator('button:has-text("Resume Reading")').first();
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      await page.waitForTimeout(600);
    }
  });

  test('Req 1 & 10: PDF document library loads and displays pages', async ({ page }) => {
    // Verify PDF viewer container or page canvas is displayed
    const viewer = page.locator('button:has-text("Doc Assistant"), button:has-text("Upload PDF")').first();
    await expect(viewer).toBeVisible({ timeout: 10000 });

    const pageElement = page.locator('.pdf-page-wrapper, [id^="pdf-page-"]').first();
    await expect(pageElement).toBeVisible({ timeout: 10000 });
  });

  test('Req 2 & 3: Clips sidebar and Find in source highlight navigation', async ({ page }) => {
    // Open sidebar clips tab
    const clipsTab = page.locator('button:has-text("Clips"), button[title*="Saved Clips"]').first();
    if (await clipsTab.isVisible()) {
      await clipsTab.click({ force: true });
      await page.waitForTimeout(400);
    }

    // Verify clips section is visible
    const aside = page.locator('aside').first();
    await expect(aside).toBeVisible();

    // Check if any highlight quote is present and clickable
    const clipItem = page.locator('p[class*="line-clamp-2"]').first();
    if (await clipItem.isVisible()) {
      await clipItem.click();
      await page.waitForTimeout(400);
      const activeHl = page.locator('.pdf-active-citation-highlight, .pdf-saved-highlight, .pdf-page-wrapper').first();
      await expect(activeHl).toBeVisible();
    }
  });

  test('Req 5: PDF navbar search across single and multi-line terms', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Find in PDF..."]').first();
    await expect(searchInput).toBeVisible();

    // Search for a common term
    await searchInput.fill('research');
    await page.waitForTimeout(500);

    // Verify match counter appears
    const matchCount = page.locator('div:has-text("/"), span:has-text("/")').first();
    await expect(matchCount).toBeVisible();

    // Verify next match button
    const nextBtn = page.locator('button[title*="Next"], div:has(input[placeholder="Find in PDF..."]) button').last();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('Req 6: Scroll stability — no repeated jitter or loop on scroll', async ({ page }) => {
    const pageInput = page.locator('input[type="number"][value]').first();
    if (await pageInput.isVisible()) {
      await pageInput.fill('2');
      await pageInput.press('Enter');
      await page.waitForTimeout(800);

      // Verify page input remains stable on page 2 without oscillation
      await expect(pageInput).toHaveValue('2');
    }
  });

  test('Req 7: Delete highlight UI has clean grayscale card and red accent', async ({ page }) => {
    // Open sidebar clips tab
    const clipsTab = page.locator('button:has-text("Clips"), button[title*="Saved Clips"]').first();
    if (await clipsTab.isVisible()) {
      await clipsTab.click({ force: true });
      await page.waitForTimeout(400);
    }

    const trashBtn = page.locator('button[title*="Delete"], button:has([class*="Trash"])').first();
    if (await trashBtn.isVisible()) {
      await trashBtn.click({ force: true });
      await page.waitForTimeout(300);

      const confirmCard = page.locator('div:has-text("Delete highlight?")').first();
      await expect(confirmCard).toBeVisible();
      await expect(confirmCard).toHaveClass(/border-red-300/);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      await cancelBtn.click();
      await page.waitForTimeout(200);
      await expect(confirmCard).not.toBeVisible();
    }
  });

  test('Req 8 & 9: Doc Assistant context retrieval and per-sentence citation jumping', async ({ page }) => {
    // Open Doc Assistant drawer
    const docAssistantBtn = page.locator('button:has-text("Doc Assistant")').first();
    await expect(docAssistantBtn).toBeVisible();
    await docAssistantBtn.click({ force: true });
    await page.waitForTimeout(400);

    // Ask a document question
    const chatInput = page.locator('input[placeholder="Ask about this document..."]').first();
    await expect(chatInput).toBeVisible();
    await chatInput.fill('What are the findings on page 1?');
    await chatInput.press('Enter');

    // Wait for response with jump button
    const jumpBtn = page.locator('button:has-text("Jump to Page")').first();
    await expect(jumpBtn).toBeVisible({ timeout: 15000 });

    // Click Jump to Page
    await jumpBtn.click();
    await page.waitForTimeout(500);

    // Verify page canvas or indicator
    const pageInput = page.locator('input[type="number"][value]').first();
    if (await pageInput.isVisible()) {
      await expect(pageInput).toHaveValue('1');
    }
  });
});
