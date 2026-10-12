import { test, expect, Page } from '@playwright/test';

// Fixed Q&A response so the test never calls the live model. The quote is a real
// sentence from page 9 of public/fixtures/just-enough-research.pdf (page index 8
// in the stored document text).
const QUOTE = 'It was slower than a car and at least ten times the price of a decent commuter bicycle.';
const QUOTE_PAGE = 9;

const answerWith = (text: string, extra: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    answer: text,
    sourcePageNumber: QUOTE_PAGE,
    citations: [
      {
        passageId: 'p9-1',
        pageNumber: QUOTE_PAGE,
        start: 0,
        end: 0,
        quote: QUOTE,
        supported: true,
        textFragment: '#:~:text=It%20was%20slower',
      },
    ],
    hasUnsupportedClaims: false,
    retrievedPagesCount: 1,
    totalPagesAnalyzed: 163,
    ...extra,
  },
});

async function mockQna(page: Page, body: unknown) {
  await page.route('**/api/ai/qna', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openAssistant(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // The fixture lives in the "Artificial Intelligence & RAG" project.
  await page.getByText('Artificial Intelligence & RAG', { exact: false }).first().click();
  await page.waitForTimeout(600);
  await page.locator('button[title="Docs"], button:has-text("Docs")').first().click();
  await page.waitForTimeout(800);
  // In this project the most recently viewed document is Just Enough Research.
  await expect(page.getByRole('heading', { name: /Just Enough Research/ })).toBeVisible({ timeout: 10000 });
  await page.locator('button:has-text("Resume Reading")').first().click();
  await page.waitForTimeout(800);
  await expect(page.locator('.pdf-page-wrapper, [id^="pdf-page-"]').first()).toBeVisible({ timeout: 20000 });
  await page.locator('button:has-text("Doc Assistant")').first().click({ force: true });
  await expect(page.locator('aside:has-text("Doc Assistant")').first()).toBeVisible();
}

async function ask(page: Page) {
  const input = page.locator('input[placeholder="Ask about this document..."]').first();
  await input.fill('Why did the Segway fail?');
  await input.press('Enter');
}

test.describe('09. Verified citation link icons in Doc Assistant answers', () => {
  test('(c) empty state is one sentence, no overview box', async ({ page }) => {
    await openAssistant(page);
    const empty = page.locator('[data-testid="doc-assistant-empty"]');
    await expect(empty).toBeVisible();
    const text = (await empty.innerText()).trim();
    expect(text.split(/[.?!]\s/).length).toBeLessThanOrEqual(2); // one short sentence (plus an optional second clause)
    expect(text.length).toBeLessThan(90);
    await expect(empty.locator('svg, img')).toHaveCount(0);
    // No assistant bubble before the first question.
    await expect(page.getByTestId('assistant-answer')).toHaveCount(0);
  });

  test('(a) link icon ends the paragraph; unverified [Page N] marker is removed', async ({ page }) => {
    await mockQna(page, answerWith('The Segway failed because it was slower and far pricier than a bicycle [Page 4].'));
    await openAssistant(page);
    await ask(page);

    const answer = page.getByTestId('assistant-answer').first();
    await expect(answer).toContainText('The Segway failed', { timeout: 10000 });
    await expect(answer).not.toContainText('[Page 4]');
    await expect(answer).not.toContainText('Page 4');

    const icons = answer.locator('[data-testid="answer-citation-link"]');
    await expect(icons).toHaveCount(1);
    await expect(icons.first()).toHaveAttribute('title', `Page ${QUOTE_PAGE}: ${QUOTE.slice(0, 80)}`);
    // The warning only shows when hasUnsupportedClaims is true.
    await expect(page.getByText('This might not be the source. Please verify.')).toHaveCount(0);
  });

  test('a marker matching a verified citation page becomes that citation icon', async ({ page }) => {
    await mockQna(page, answerWith('It was slower and pricier than a bicycle [Page 9]. Nothing else [p. 2].'));
    await openAssistant(page);
    await ask(page);
    const answer = page.getByTestId('assistant-answer').first();
    await expect(answer).toContainText('slower and pricier', { timeout: 10000 });
    await expect(answer).not.toContainText('[Page 9]');
    await expect(answer).not.toContainText('[p. 2]');
    await expect(answer.locator('[data-testid="answer-citation-link"]')).toHaveCount(1);
  });

  test('(b) clicking the icon opens page 9 and highlights the quote', async ({ page }) => {
    await mockQna(page, answerWith('The Segway failed because it was slower and far pricier than a bicycle [Page 4].'));
    await openAssistant(page);
    await ask(page);

    const icon = page.locator('[data-testid="answer-citation-link"]').first();
    await expect(icon).toBeVisible({ timeout: 10000 });
    await icon.click();

    const pageInput = page.locator('input[type="number"][value]').first();
    await expect(pageInput).toHaveValue(String(QUOTE_PAGE), { timeout: 10000 });

    const highlighted = page.locator(`#pdf-page-${QUOTE_PAGE} .pdf-active-citation-highlight`);
    await expect(highlighted.first()).toBeVisible({ timeout: 15000 });
    const hlText = (await highlighted.allTextContents()).join(' ').replace(/\s+/g, ' ').toLowerCase();
    expect(hlText).toContain('slower than a car');
    expect(hlText).toContain('commuter bicycle');
    await expect(page.locator('[data-testid="citation-not-located"]')).toHaveCount(0);
  });

  test('quote missing from its page shows a message and does not highlight', async ({ page }) => {
    const body = answerWith('Something about bikes.');
    (body.data.citations[0] as any).quote = 'This sentence does not appear anywhere on that page at all.';
    await mockQna(page, body);
    await openAssistant(page);
    await ask(page);
    await page.locator('[data-testid="answer-citation-link"]').first().click({ timeout: 10000 });
    await expect(page.locator('[data-testid="citation-not-located"]')).toContainText(`Source passage could not be located on page ${QUOTE_PAGE}`);
    await expect(page.locator('.pdf-active-citation-highlight')).toHaveCount(0);
  });
});
