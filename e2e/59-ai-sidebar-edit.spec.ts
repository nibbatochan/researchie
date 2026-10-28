import { test, expect } from '@playwright/test';

// Researchie AI panel: it widens by dragging its left edge; a deliverable has Copy, Save to Project and Edit (no download);
// Edit opens a large window with the AI text, an empty page for the researcher's own words and the references; a chat turn
// can be deleted.
test.describe('Researchie AI panel: width, delete, edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.getByText('Artificial Intelligence & RAG', { exact: false }).first().click();
    await page.waitForTimeout(600);
    const fab = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await fab.dispatchEvent('click');
    await expect(page.locator('[data-testid="researchie-ai-sidebar"]')).toBeVisible({ timeout: 5000 });
  });

  test('dragging the left edge widens the panel', async ({ page }) => {
    const panel = page.locator('[data-testid="researchie-ai-sidebar"]');
    const before = (await panel.boundingBox())!.width;
    const handle = page.getByTestId('ai-sidebar-resize');
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x - 180, box.y + 200, { steps: 8 });
    await page.mouse.up();
    const after = (await panel.boundingBox())!.width;
    expect(after).toBeGreaterThan(before + 100);
    expect(after).toBeLessThanOrEqual(900);
  });

  test('a deliverable can be copied, saved or edited, and the edit window saves your own words', async ({ page }) => {
    test.setTimeout(90000);
    const panel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await panel.locator('button:has-text("Deliverables"), button:has-text("Summarize")').first().click({ force: true });
    await panel.locator('button:has-text("Research Brief")').first().click({ force: true });
    await panel.locator('button:has-text("Generate")').first().click({ force: true });
    const edit = page.getByTestId('deliverable-edit').first();
    await expect(edit).toBeVisible({ timeout: 30000 });
    await expect(panel.locator('button[title*="Download"]')).toHaveCount(0);
    await expect(panel.getByText('Save to Project').first()).toBeVisible();

    await edit.click();
    const modal = page.getByTestId('deliverable-edit-modal');
    await expect(modal).toBeVisible();
    const size = (await modal.locator('> div').first().boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(size.width / viewport.width).toBeGreaterThan(0.6);
    await expect(page.getByTestId('edit-ai-content')).not.toBeEmpty();
    await expect(page.getByTestId('edit-own-text')).toHaveValue('');
    await expect(page.getByTestId('edit-references')).toBeVisible();
    await expect(page.getByTestId('edit-save')).toBeDisabled();
    await page.getByTestId('edit-own-text').fill('My own words about the findings.');
    await page.getByTestId('edit-reference-style').selectOption('vancouver');
    await expect(page.getByTestId('edit-save')).toBeEnabled();
    await page.getByTestId('edit-save').click();
    await expect(modal).toHaveCount(0);
  });

  test('a chat turn can be deleted', async ({ page }) => {
    test.setTimeout(90000);
    const panel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await panel.locator('button:has-text("Deliverables"), button:has-text("Summarize")').first().click({ force: true });
    await panel.locator('button:has-text("Research Brief")').first().click({ force: true });
    await panel.locator('button:has-text("Generate")').first().click({ force: true });
    await expect(page.getByTestId('deliverable-edit').first()).toBeVisible({ timeout: 30000 });
    const count = await page.getByTestId('chat-turn-delete').count();
    expect(count).toBeGreaterThan(0);
    await page.getByTestId('chat-turn-delete').first().click({ force: true });
    await expect(page.getByTestId('deliverable-edit')).toHaveCount(0);
  });
});
