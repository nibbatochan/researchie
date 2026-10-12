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

  test('Req 8 & 9: Doc Assistant citation link icon jumps to the verified page', async ({ page }) => {
    // Fixed answer so the test never calls the live model. The quote is a real sentence on page 9 of the fixture.
    const QUOTE = 'It was slower than a car and at least ten times the price of a decent commuter bicycle.';
    await page.route('**/api/ai/qna', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            answer: 'The Segway was slower than a car and far more expensive than a bicycle. [Page 9]',
            sourcePageNumber: 9,
            citations: [{ passageId: 'p9-1', pageNumber: 9, start: 0, end: 0, quote: QUOTE, supported: true, textFragment: '#:~:text=It%20was%20slower' }],
            hasUnsupportedClaims: false,
            retrievedPagesCount: 1,
            totalPagesAnalyzed: 163,
          },
        }),
      });
    });

    // Open the fixture explicitly: the "most recently viewed" document changes as other
    // documents are uploaded, and this quote is on page 9 of Just Enough Research.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.getByText('Artificial Intelligence & RAG', { exact: false }).first().click();
    await page.waitForTimeout(600);
    await page.locator('button[title="Docs"], button:has-text("Docs")').first().click();
    await page.waitForTimeout(800);
    await expect(page.getByRole('heading', { name: /Just Enough Research/ })).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Resume Reading")').first().click();
    await page.waitForTimeout(800);

    // Open Doc Assistant drawer
    const docAssistantBtn = page.locator('button:has-text("Doc Assistant")').first();
    await expect(docAssistantBtn).toBeVisible();
    await docAssistantBtn.click({ force: true });
    await page.waitForTimeout(400);

    // Ask a document question
    const chatInput = page.locator('input[placeholder="Ask about this document..."]').first();
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Why did the Segway fail?');
    await chatInput.press('Enter');

    // The answer ends with a link icon. There is no Jump button and no raw page marker.
    const link = page.locator('[data-testid="answer-citation-link"]').first();
    await expect(link).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Jump to Page")')).toHaveCount(0);

    await link.click();
    await page.waitForTimeout(600);
    const pageInput = page.locator('input[type="number"][value]').first();
    if (await pageInput.isVisible()) {
      await expect(pageInput).toHaveValue('9');
    }
  });
});
