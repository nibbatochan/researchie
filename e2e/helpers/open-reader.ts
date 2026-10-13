import { expect, Page } from '@playwright/test';

// Opens the "Just Enough Research" fixture (163 real pages) in the PDF reader the same way every time.
//
// The old specs clicked "Resume Reading" on whichever document the app listed first, without choosing a
// project, and they checked for the button without waiting for it. Which PDF opened then depended on what
// had been uploaded last and on how fast the page loaded, so some runs landed on a one-page placeholder
// PDF or on no PDF at all. This helper picks the project and the document by name and waits for each step.
const FIXTURE_PROJECT = 'Artificial Intelligence & RAG';

export async function openFixtureReader(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // The project list loads after the first paint.
  const project = page.getByText(FIXTURE_PROJECT, { exact: false }).first();
  await expect(project).toBeVisible({ timeout: 20000 });
  await project.click();

  const docsButton = page.locator('button[title="Docs"], button:has-text("Docs")').first();
  await expect(docsButton).toBeVisible({ timeout: 15000 });
  await docsButton.click();

  // In this project the newest document is the fixture, so it is the featured card.
  await expect(page.getByRole('heading', { name: /Just Enough Research/ })).toBeVisible({ timeout: 20000 });
  const resume = page.locator('button:has-text("Resume Reading")').first();
  await expect(resume).toBeVisible({ timeout: 10000 });
  await resume.click();

  await expect(page.locator('.pdf-page-wrapper, [id^="pdf-page-"]').first()).toBeVisible({ timeout: 30000 });
  // The text layer fills in after the canvas; later steps read from it.
  await expect(page.locator('.pdf-text-layer span, .textLayer span').first()).toBeVisible({ timeout: 30000 });
}
