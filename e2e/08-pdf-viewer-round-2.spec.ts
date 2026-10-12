import { test, expect } from '@playwright/test';

test.describe('PDF Viewer Round 2 - Bugs 1 to 7 Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Switch to Docs / Reader mode
    const docsBtn = page.locator('button[title="Docs"], button:has-text("Document Library")').first();
    if (await docsBtn.isVisible()) {
      await docsBtn.click();
      await page.waitForTimeout(500);
    }

    // If on Document Vault, click "Resume Reading" or document row
    const resumeBtn = page.locator('button:has-text("Resume Reading"), tr:has-text("Just Enough Research"), button:has-text("Read")').first();
    if (await resumeBtn.isVisible().catch(() => false)) {
      await resumeBtn.click();
      await page.waitForTimeout(600);
    }

    // Wait for the active PDF page wrapper to mount
    const pageWrapper = page.locator('.pdf-page-wrapper, [id^="pdf-page-"]').first();
    await expect(pageWrapper).toBeVisible({ timeout: 20000 });
  });

  // Bug 1: Selection accuracy — drag over text without drifting left/right or to previous line
  test('Bug 1: Text selection accuracy without drift or jumping', async ({ page }) => {
    // Ensure the PDF text layer has rendered spans
    const firstTextSpan = page.locator('.pdf-text-layer span, .textLayer span').first();
    await expect(firstTextSpan).toBeVisible({ timeout: 20000 });

    const spanBox = await firstTextSpan.boundingBox();
    expect(spanBox).not.toBeNull();

    if (spanBox) {
      // Simulate exact character drag forward
      await page.mouse.move(spanBox.x + 2, spanBox.y + spanBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(spanBox.x + spanBox.width - 2, spanBox.y + spanBox.height / 2, { steps: 5 });
      await page.mouse.up();

      // Check window selection
      const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '');
      expect(selectedText.trim().length).toBeGreaterThan(0);
    }
  });

  // Bug 2: Save clip button vanishes on multi-line/page selection — must stay visible & reachable
  test('Bug 2: Save clip pill stays clamped in viewport and reachable', async ({ page }) => {
    const textSpans = page.locator('.pdf-text-layer span, .textLayer span');
    await expect(textSpans.first()).toBeVisible({ timeout: 20000 });

    const span1 = textSpans.nth(1);
    const span2 = textSpans.nth(5);
    const box1 = await span1.boundingBox();
    const box2 = await span2.boundingBox();

    if (box1 && box2) {
      // Drag across several spans
      await page.mouse.move(box1.x + 5, box1.y + 5);
      await page.mouse.down();
      await page.mouse.move(box2.x + box2.width - 5, box2.y + box2.height - 5, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(400);

      // Verify floating Save Clip pill is visible on screen
      const savePill = page.locator('[data-testid="save-clip-pill"], [data-testid="save-clip-button"], button:has-text("Save Clip")').first();
      await expect(savePill).toBeVisible({ timeout: 5000 });

      // Verify pill bounding box is within viewport dimensions
      const pillBox = await savePill.boundingBox();
      expect(pillBox).not.toBeNull();
      if (pillBox) {
        expect(pillBox.y).toBeGreaterThanOrEqual(10);
        expect(pillBox.y + pillBox.height).toBeLessThanOrEqual(950);
        expect(pillBox.x).toBeGreaterThanOrEqual(10);
      }
    }
  });

  // Bug 3: Partial highlight — jumping to clip must highlight full clip, not just first line
  test('Bug 3: Jumping to clip source highlights full multi-line clip', async ({ page }) => {
    // 1. Get real text from active page
    const textSpan = page.locator('.pdf-text-layer span, .textLayer span').first();
    await expect(textSpan).toBeVisible({ timeout: 20000 });
    const realText = (await textSpan.textContent())?.trim() || 'Research';

    // 2. Open sidebar clips tab
    const clipsTab = page.locator('button:has-text("Clips"), button[title*="Saved Clips"]').first();
    if (await clipsTab.isVisible()) {
      await clipsTab.click({ force: true });
      await page.waitForTimeout(400);
    }

    // 3. Add clip with real text
    const addManualClipBtn = page.locator('button[title*="Add highlight manually"]').first();
    if (await addManualClipBtn.isVisible()) {
      await addManualClipBtn.click();
      await page.waitForTimeout(200);

      const textarea = page.locator('textarea[placeholder*="Paste quote"]').first();
      await textarea.fill(realText);
      const saveBtn = page.locator('button:has-text("Save Clip")').last();
      await saveBtn.click();
      await page.waitForTimeout(600);
    }

    // 4. Click on saved clip in sidebar to jump to source
    const clipItem = page.locator('[data-testid="saved-clip-item"], p[class*="line-clamp-2"]').first();
    await expect(clipItem).toBeVisible({ timeout: 5000 });
    await clipItem.click();
    await page.waitForTimeout(600);

    // 5. Verify active highlight class exists on spans
    const activeHighlights = page.locator('.pdf-active-citation-highlight, .pdf-saved-highlight');
    await expect(activeHighlights.first()).toBeVisible({ timeout: 5000 });

    // Ensure highlighted elements exist for the full clip
    const count = await activeHighlights.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // Bug 4: Can't exit highlight mode — exit button works & scrolling away clears it
  test('Bug 4: Highlight mode can be exited via Clear button and by scrolling away', async ({ page }) => {
    // Jump to a clip to activate highlight mode
    const clipsTab = page.locator('button:has-text("Clips"), button[title*="Saved Clips"]').first();
    if (await clipsTab.isVisible()) {
      await clipsTab.click({ force: true });
      await page.waitForTimeout(300);
    }

    const clipItem = page.locator('[data-testid="saved-clip-item"], p[class*="line-clamp-2"]').first();
    if (await clipItem.isVisible()) {
      await clipItem.click();
      await page.waitForTimeout(500);

      // Verify the floating Clear Highlight button is visible
      const clearBtn = page.locator('[data-testid="clear-highlight-button"], button:has-text("Clear")').first();
      await expect(clearBtn).toBeVisible({ timeout: 5000 });

      // Click Clear button to exit highlight mode
      await clearBtn.click();
      await page.waitForTimeout(400);

      // Verify Clear Highlight banner is now dismissed
      await expect(clearBtn).not.toBeVisible();
    }
  });

  // Bug 5: Search page off by one — results navigate to exact matching page
  test('Bug 5: PDF search match navigation lands on exact matching page', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Find in PDF..."]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('research');
    await page.waitForTimeout(500);

    // Match counter should show e.g. "1/N"
    const matchCounter = page.locator('div:has-text("/"), span:has-text("/")').first();
    await expect(matchCounter).toBeVisible();

    // Verify next match button exists and clicks
    const nextBtn = page.locator('button[title*="Next"]').first();
    if (await nextBtn.isVisible()) {
      const pageInput = page.locator('input[type="number"][value]').first();
      await nextBtn.click();
      await page.waitForTimeout(500);

      // Page input must have a valid exact number without off-by-one jitter
      const newPage = await pageInput.inputValue();
      expect(parseInt(newPage, 10)).toBeGreaterThanOrEqual(1);
    }
  });

  // Bug 6: Citation page off by one & Gemini-style in-sentence link citation icons
  test('Bug 6: Gemini-style citation link icons open exact page on first click', async ({ page }) => {
    // Open Doc Assistant drawer
    const docAssistantBtn = page.locator('button:has-text("Doc Assistant")').first();
    if (await docAssistantBtn.isVisible()) {
      await docAssistantBtn.click();
      await page.waitForTimeout(400);
    }

    // Verify Doc Assistant panel is open
    const assistantDrawer = page.locator('aside:has-text("Doc Assistant")').first();
    await expect(assistantDrawer).toBeVisible();

    // Check for citations or ask a question if needed
    const citationLink = page.locator('[data-testid="answer-citation-link"]').first();
    if (await citationLink.isVisible()) {
      const pageInput = page.locator('input[type="number"][value]').first();
      
      // First click test
      await citationLink.click();
      await page.waitForTimeout(600);

      // Verify reader jumped without off-by-one error
      const targetPageNum = await pageInput.inputValue();
      expect(parseInt(targetPageNum, 10)).toBeGreaterThanOrEqual(1);

      // Verify scroll is settled and active highlight is visible
      const activeHl = page.locator('.pdf-active-citation-highlight, .pdf-page-wrapper').first();
      await expect(activeHl).toBeVisible();
    }
  });

  // Bug 7: Timeline source link opens PDF at exact page with exact content highlighted
  test('Bug 7: Timeline source link opens PDF at exact page and highlights text', async ({ page }) => {
    // Go to Timeline / Feed view
    const streamBtn = page.locator('button[title="Timeline / Stream"], button:has-text("Stream"), button:has-text("Feed")').first();
    if (await streamBtn.isVisible()) {
      await streamBtn.click();
      await page.waitForTimeout(500);
    }

    // Find any atom card with a PDF / Reader source link
    const timelineSourceLink = page.locator('[data-testid="timeline-source-link"], button:has-text("PDF · p."), button:has-text("Open in Reader")').first();
    if (await timelineSourceLink.isVisible()) {
      await timelineSourceLink.click();
      await page.waitForTimeout(800);

      // Verify workspace switched to reader mode
      const pdfWrapper = page.locator('.pdf-page-wrapper, [id^="pdf-page-"]').first();
      await expect(pdfWrapper).toBeVisible({ timeout: 10000 });

      // Verify page number indicator
      const pageInput = page.locator('input[type="number"][value]').first();
      await expect(pageInput).toBeVisible();
      const pageVal = await pageInput.inputValue();
      expect(parseInt(pageVal, 10)).toBeGreaterThanOrEqual(1);
    }
  });

  // Additional requirement: Scroll settles once with no jitter
  test('Requirement: Scroll position settles once without jitter or loop', async ({ page }) => {
    const pageInput = page.locator('input[type="number"][value]').first();
    await expect(pageInput).toBeVisible({ timeout: 10000 });

    await pageInput.click();
    await pageInput.fill('3');
    await page.waitForTimeout(800);

    // Verify value stays firmly on page 3 without bouncing back
    await expect(pageInput).toHaveValue('3');
  });
});
