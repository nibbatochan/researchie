import { test, expect } from '@playwright/test';

test.describe('4. AI Assistant & Synthesis Engine Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // If on dashboard landing hub, click into workspace feed that has clips
    const cardOrItem = page.locator('[data-testid="project-card"]:has-text("clips"), [data-testid="subproject-card"]:has-text("clips"), [data-testid="project-card"]').first();
    await cardOrItem.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    if (await cardOrItem.isVisible()) {
      await cardOrItem.click();
      await page.waitForTimeout(600);
    }
  });

  test('opens docked Researchie AI sidebar when triggered', async ({ page }) => {
    // Click the bottom-right floating AI action button
    const fabButton = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await expect(fabButton).toBeVisible();
    await fabButton.click();
    await page.waitForTimeout(500);

    // Verify AI Sidebar panel is open
    const asidePanel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await expect(asidePanel).toBeVisible({ timeout: 5000 });
  });

  test('can switch between Ask AI and Summarize tabs in assistant', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await fabButton.click();
    
    const asidePanel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await expect(asidePanel).toBeVisible({ timeout: 5000 });

    const summarizeTab = asidePanel.locator('button:has-text("Deliverables"), button:has-text("Summarize")').first();
    await expect(summarizeTab).toBeVisible({ timeout: 5000 });
    await summarizeTab.click({ force: true });
    await page.waitForTimeout(300);

    const matrixButton = asidePanel.locator('button:has-text("Literature Review Matrix"), button:has-text("PRD")').first();
    await expect(matrixButton).toBeVisible({ timeout: 5000 });
  });

  test('can generate Literature Review Matrix and render structured table', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await fabButton.click();
    
    const asidePanel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await expect(asidePanel).toBeVisible({ timeout: 5000 });

    // Switch to summarize tab
    const summarizeTab = asidePanel.locator('button:has-text("Deliverables"), button:has-text("Summarize")').first();
    await expect(summarizeTab).toBeVisible({ timeout: 5000 });
    await summarizeTab.click({ force: true });
    await page.waitForTimeout(300);

    // Verify Literature Review Matrix button is available and click it
    const matrixButton = asidePanel.locator('button:has-text("Literature Review")').first();
    await expect(matrixButton).toBeVisible({ timeout: 5000 });
    await matrixButton.click({ force: true });

    // Click Generate button
    const generateButton = asidePanel.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click({ force: true });

    // Wait for synthesis result to complete and render
    const saveOrCopy = asidePanel.locator('button[title*="Copy"], button:has-text("Save to Project"), button:has-text("Save")').first();
    await expect(saveOrCopy).toBeVisible({ timeout: 25000 });
    
    // Verify table or matrix content rendered
    const matrixContent = asidePanel.locator('table, [class*="prose"], div:has-text("Cross-Document"), div:has-text("Synthesized")').first();
    await expect(matrixContent).toBeVisible({ timeout: 10000 });
  });

  test('can select Comparison Matrix and generate structured comparison table', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await fabButton.click();
    
    const asidePanel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await expect(asidePanel).toBeVisible({ timeout: 5000 });

    // Switch to summarize tab
    const summarizeTab = asidePanel.locator('button:has-text("Deliverables"), button:has-text("Summarize")').first();
    await expect(summarizeTab).toBeVisible({ timeout: 5000 });
    await summarizeTab.click({ force: true });
    await page.waitForTimeout(300);

    // Click Comparison Matrix format
    const compareButton = asidePanel.locator('button:has-text("Comparative"), button:has-text("Comparison")').first();
    await expect(compareButton).toBeVisible({ timeout: 5000 });
    await compareButton.click({ force: true });

    // Verify clarification question and focus pills are visible
    await expect(asidePanel.locator('text=/Clarification|Focus/i').first()).toBeVisible({ timeout: 10000 });
    const focusPill = asidePanel.locator('button:has-text("Feature"), button:has-text("Performance")').first();
    if (await focusPill.isVisible()) {
      await focusPill.click({ force: true });
    }

    // Click Generate Comparison Matrix button
    const generateButton = asidePanel.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click({ force: true });

    // Wait for synthesis result to render
    const saveOrCopy = asidePanel.locator('button[title*="Copy"], button:has-text("Save"), button:has-text("Copy")').first();
    await expect(saveOrCopy).toBeVisible({ timeout: 20000 });
    const tableOrContent = asidePanel.locator('table, [class*="prose"], [class*="markdown"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
  });

  test('can save synthesized output as note into project timeline', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await fabButton.click();
    
    const asidePanel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await expect(asidePanel).toBeVisible({ timeout: 5000 });

    // Switch to summarize tab
    const summarizeTab = asidePanel.locator('button:has-text("Deliverables"), button:has-text("Summarize")').first();
    await expect(summarizeTab).toBeVisible({ timeout: 5000 });
    await summarizeTab.click({ force: true });
    // Select deliverable template if in list view
    const templateButton = asidePanel.locator('button:has-text("Key Findings"), button:has-text("Summary"), button:has-text("Literature Review")').first();
    if (await templateButton.isVisible()) {
      await templateButton.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Generate synthesis
    const generateButton = asidePanel.locator('button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click({ force: true });
    
    // Wait for Save button
    const saveButton = asidePanel.locator('button:has-text("Save as Note"), button:has-text("Save")').first();
    await expect(saveButton).toBeVisible({ timeout: 20000 });
    await saveButton.click({ force: true });
    
    // Verify saved confirmation
    await expect(asidePanel.locator('text=/Saved|Saved!/i').first()).toBeVisible({ timeout: 10000 });
  });
});
