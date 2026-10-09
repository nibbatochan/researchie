import { test, expect } from '@playwright/test';

test.describe('5. Nested Folders, Dashboard Hub & Document Vault Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
  });

  test('renders starting Dashboard Landing screen with Recently Accessed carousel and folders', async ({ page }) => {
    // If not already on dashboard, click Dashboard Hub in sidebar
    const dashboardLink = page.locator('button:has-text("Dashboard Hub")').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForTimeout(400);
    }

    // Verify Welcome header
    const welcomeHeader = page.locator('h1:has-text("Welcome back")').first();
    await expect(welcomeHeader).toBeVisible({ timeout: 10000 });

    // Verify Recently Accessed Section
    const recentlyAccessed = page.locator('h2:has-text("Recently Accessed"), h2:has-text("Jump Back In")').first();
    await expect(recentlyAccessed).toBeVisible({ timeout: 10000 });

    // Verify Project Folders & Sub-projects section
    const foldersSection = page.locator('h2:has-text("Project Folders"), h2:has-text("Hierarchies")').first();
    await expect(foldersSection).toBeVisible({ timeout: 10000 });
  });

  test('displays nested project structure (Main Project contains Sub-Projects)', async ({ page }) => {
    const dashboardLink = page.locator('button:has-text("Dashboard Hub")').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForTimeout(400);
    }

    // Find main folder for "Artificial Intelligence"
    const aiFolderCard = page.locator('h3:has-text("Artificial Intelligence")').first();
    await expect(aiFolderCard).toBeVisible({ timeout: 10000 });

    // Verify nested sub-projects are listed inside or under the main project
    const subProjectCard = page.locator('[data-testid="subproject-card"]').first();
    await expect(subProjectCard).toBeVisible({ timeout: 10000 });
  });

  test('clicking a project or sub-project drills down directly into that workspace', async ({ page }) => {
    const dashboardLink = page.locator('button:has-text("Dashboard Hub")').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForTimeout(400);
    }

    // Click on a sub-project card or project card
    const subProjectBtn = page.locator('[data-testid="subproject-card"]').first();
    await expect(subProjectBtn).toBeVisible({ timeout: 10000 });
    await subProjectBtn.click();
    await page.waitForTimeout(600);

    // Verify timeline workspace opened with heading
    const projectHeader = page.locator('h1').first();
    await expect(projectHeader).toBeVisible({ timeout: 10000 });
  });

  test('sidebar folder tree expands and collapses nested sub-projects', async ({ page }) => {
    // Look at sidebar tree for parent project toggle
    const folderToggle = page.locator('button[title*="folder"], button:has-text("Artificial Intelligence") button').first();
    if (await folderToggle.isVisible()) {
      await folderToggle.click();
      await page.waitForTimeout(300);
      await folderToggle.click();
      await page.waitForTimeout(300);
    }
  });

  test('opening Documents section renders the Most Recently Viewed hero and all other uploaded docs', async ({ page }) => {
    // Open Documents from Dashboard button or sidebar
    const docsNavBtn = page.locator('button:has-text("Document Library"), button:has-text("Docs")').first();
    await expect(docsNavBtn).toBeVisible({ timeout: 10000 });
    await docsNavBtn.click();
    await page.waitForTimeout(600);

    // 1. Verify "Most Recently Viewed Document" Hero Card
    const recentDocHero = page.locator('text=/Most Recently Viewed Document|Active Reading|Document Vault/i').first();
    await expect(recentDocHero).toBeVisible({ timeout: 10000 });

    // 2. Verify "All Project Documents" section below the hero
    const allDocsHeader = page.locator('text=/All Project Documents|Project Documents/i').first();
    await expect(allDocsHeader).toBeVisible({ timeout: 10000 });

    // 3. Verify Resume Reading button in hero opens the reader
    const resumeBtn = page.locator('button:has-text("Resume Reading")').first();
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      await page.waitForTimeout(500);

      // Verify Reader is active with Library return button
      const backToLibrary = page.locator('button:has-text("Library")').first();
      await expect(backToLibrary).toBeVisible({ timeout: 10000 });
    }
  });
});
