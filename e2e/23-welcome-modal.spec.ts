import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('23. Onboarding flow', () => {
  test('a first visit opens the brand screen; tapping it starts a four-step flow; it does not return', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByTestId('welcome-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Research from the web, with every source kept.')).toBeVisible();

    await page.getByTestId('welcome-start').click();
    await expect(modal.getByRole('heading', { name: 'Set up in two steps' })).toBeVisible();
    await expect(modal.getByText('Install the Chrome extension').or(modal.getByText('Download extension (.zip)'))).toBeVisible();

    await page.getByRole('tab', { name: /AI key/ }).click();
    await expect(modal.getByText('Recommended if you do not have a key yet')).toBeVisible();

    await page.getByTestId('welcome-next').click();
    await expect(modal.getByRole('heading', { name: 'Clip. Keep. Ask.' })).toBeVisible();
    await page.getByTestId('welcome-next').click();
    await expect(modal.getByRole('heading', { name: 'Pick the one that sounds like you' })).toBeVisible();
    await page.getByRole('tab', { name: /A cited draft/ }).click();
    await expect(modal.getByText('Export to PDF, Markdown, Obsidian or Notion.')).toBeVisible();

    await page.getByTestId('welcome-next').click();
    await expect(modal).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('how-it-works-button')).toBeVisible();
    await expect(page.getByTestId('welcome-modal')).toBeHidden();
  });

  test('Escape closes; the button sits left of Download extension and reopens at Set up', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('welcome-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('welcome-modal')).toBeHidden();
    const how = await page.getByTestId('how-it-works-button').boundingBox();
    const dl = await page.getByTestId('get-extension-button').boundingBox();
    expect(how!.x + how!.width).toBeLessThanOrEqual(dl!.x);
    await page.getByTestId('how-it-works-button').click();
    const modal = page.getByTestId('welcome-modal');
    await expect(modal.getByRole('heading', { name: 'Set up in two steps' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.getByTestId('how-it-works-button')).toBeFocused();
  });
});
