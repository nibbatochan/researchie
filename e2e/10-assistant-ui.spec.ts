import { test, expect, Page } from '@playwright/test';
import { removeReaderClipsSavedByTheseTests } from './helpers/cleanup';

// Document Assistant behaviour: icon placement, one scroll per click, click-away clearing,
// one saved highlight at a time, a resizable panel. Answers are mocked so no model is called.
// The quote is a real sentence from page 9 of public/fixtures/just-enough-research.pdf.
const QUOTE = 'It was slower than a car and at least ten times the price of a decent commuter bicycle.';
const QUOTE_PAGE = 9;

const citation = (quote: string, pageNumber = QUOTE_PAGE) => ({
  passageId: `p${pageNumber}-1`,
  pageNumber,
  start: 0,
  end: 0,
  quote,
  supported: true,
});

const answer = (text: string, citations = [citation(QUOTE)]) => ({
  success: true,
  data: {
    answer: text,
    sourcePageNumber: QUOTE_PAGE,
    citations,
    hasUnsupportedClaims: false,
    retrievedPagesCount: 1,
    totalPagesAnalyzed: 163,
  },
});

async function mockQna(page: Page, bodies: unknown[]) {
  let n = 0;
  await page.route('**/api/ai/qna', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = bodies[Math.min(n, bodies.length - 1)];
    n++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openAssistant(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByText('Artificial Intelligence & RAG', { exact: false }).first().click();
  await page.waitForTimeout(600);
  await page.locator('button[title="Docs"], button:has-text("Docs")').first().click();
  await page.waitForTimeout(800);
  await expect(page.getByRole('heading', { name: /Just Enough Research/ })).toBeVisible({ timeout: 10000 });
  await page.locator('button:has-text("Resume Reading")').first().click();
  await page.waitForTimeout(800);
  await expect(page.locator('.pdf-page-wrapper, [id^="pdf-page-"]').first()).toBeVisible({ timeout: 20000 });
  await page.locator('button:has-text("Doc Assistant")').first().click({ force: true });
  await expect(page.getByTestId('assistant-panel')).toBeVisible();
}

async function ask(page: Page, question = 'Why did the Segway fail?') {
  const input = page.locator('input[placeholder="Ask about this document..."]').first();
  await input.fill(question);
  await input.press('Enter');
}

test.describe('10. Document Assistant UI', () => {
  removeReaderClipsSavedByTheseTests();
  test('each link icon sits on the line of the sentence it supports', async ({ page }) => {
    await mockQna(page, [
      answer('The Segway was slower than a car. It cost ten times a bicycle. Nothing else is claimed here.', [
        citation('slower than a car'),
        citation('ten times the price'),
      ]),
    ]);
    await openAssistant(page);
    await ask(page);
    const icons = page.getByTestId('assistant-answer').first().locator('[data-testid="answer-citation-link"]');
    await expect(icons).toHaveCount(2, { timeout: 10000 });
    const first = await icons.nth(0).boundingBox();
    const second = await icons.nth(1).boundingBox();
    expect(first && second).toBeTruthy();
    // Two different sentences, so the icons are on different rows.
    expect(second!.y).toBeGreaterThan(first!.y + 5);
    // The sentence with no support has no icon: the last text block is below the second icon.
    const lastLine = page.getByTestId('assistant-answer').first().getByText('Nothing else is claimed here.');
    const lastBox = await lastLine.boundingBox();
    expect(lastBox!.y).toBeGreaterThan(second!.y);
  });

  test('a citation click moves the view once, with no back-and-forth', async ({ page }) => {
    await mockQna(page, [answer('The Segway failed because it was slower and far pricier than a bicycle.')]);
    await openAssistant(page);
    await ask(page);
    const icon = page.locator('[data-testid="answer-citation-link"]').first();
    await expect(icon).toBeVisible({ timeout: 10000 });

    // Watch the PDF scroll container from the click until the view settles.
    await page.evaluate(() => {
      let el: HTMLElement | null = document.getElementById('pdf-page-1');
      while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) {
        el = el.parentElement;
      }
      const w = window as any;
      w.__scrollSamples = [];
      const box = el as HTMLElement;
      const tick = () => {
        w.__scrollSamples.push(box.scrollTop);
        w.__scrollTimer = requestAnimationFrame(tick);
      };
      tick();
    });
    await icon.click();
    await page.waitForTimeout(3000);
    const samples: number[] = await page.evaluate(() => (window as any).__scrollSamples);

    // Split the samples into separate motions (a gap of 3 still frames ends one). An instant
    // jump is one or two frames; a smooth scroll runs for many. More than one smooth scroll
    // means two code paths are fighting over the view.
    const motions: number[] = [];
    let run = 0;
    let still = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i] !== samples[i - 1]) {
        run++;
        still = 0;
      } else if (run > 0 && ++still >= 3) {
        motions.push(run);
        run = 0;
      }
    }
    if (run > 0) motions.push(run);
    expect(samples[samples.length - 1]).toBeGreaterThan(samples[0]);
    expect(motions.filter((frames) => frames >= 4).length).toBeLessThanOrEqual(1);

    // The quote ends in view.
    const highlighted = page.locator(`#pdf-page-${QUOTE_PAGE} .pdf-active-citation-highlight`).first();
    await expect(highlighted).toBeInViewport();
  });

  test('clicking away clears the citation highlight', async ({ page }) => {
    await mockQna(page, [answer('The Segway failed because it was slower and far pricier than a bicycle.')]);
    await openAssistant(page);
    await ask(page);
    await page.locator('[data-testid="answer-citation-link"]').first().click({ timeout: 10000 });
    const highlight = page.locator(`#pdf-page-${QUOTE_PAGE} .pdf-active-citation-highlight`);
    await expect(highlight.first()).toBeVisible({ timeout: 15000 });

    // Click on the answer text, which is not a link.
    await page.getByTestId('assistant-answer').first().getByText('The Segway failed').click();
    await expect(highlight).toHaveCount(0);

    // The same icon highlights it again.
    await page.locator('[data-testid="answer-citation-link"]').first().click();
    await expect(highlight.first()).toBeVisible({ timeout: 15000 });
  });

  test('several questions in a row keep working and the newest answer is in view', async ({ page }) => {
    await mockQna(page, [
      answer('First answer about the Segway.'),
      answer('Second answer about the Segway.'),
      answer('Third answer about the Segway.'),
    ]);
    await openAssistant(page);
    for (const q of ['One?', 'Two?', 'Three?']) {
      await ask(page, q);
      await page.waitForTimeout(500);
    }
    const answers = page.getByTestId('assistant-answer');
    await expect(answers).toHaveCount(3, { timeout: 15000 });
    await expect(answers.nth(2)).toContainText('Third answer');
    await expect(answers.nth(2)).toBeInViewport();
    // Each answer has its own working link.
    await expect(page.locator('[data-testid="answer-citation-link"]')).toHaveCount(3);
    await answers.nth(0).locator('[data-testid="answer-citation-link"]').click();
    await expect(page.locator(`#pdf-page-${QUOTE_PAGE} .pdf-active-citation-highlight`).first()).toBeVisible({ timeout: 15000 });
  });

  test('only the selected saved highlight is drawn, and clicking away clears it', async ({ page }) => {
    await openAssistant(page);
    // Pick two different pieces of text from page 1.
    const texts: string[] = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('#pdf-page-1 .pdf-text-layer span, #pdf-page-1 .textLayer span'));
      const picked: string[] = [];
      for (const s of spans) {
        const t = (s.textContent || '').trim();
        if (t.length >= 12 && !picked.includes(t)) picked.push(t);
        if (picked.length === 2) break;
      }
      return picked;
    });
    expect(texts.length).toBe(2);

    // Close the assistant so the clips list is the open side panel, then save two clips by hand.
    const clipsTab = page.locator('button:has-text("Clips"), button[title*="Saved Clips"]').first();
    if (await clipsTab.isVisible()) await clipsTab.click({ force: true });
    for (const text of texts) {
      await page.locator('button[title*="Add highlight manually"]').first().click();
      await page.locator('textarea[placeholder*="Paste quote"]').first().fill(text);
      await page.locator('button:has-text("Save Clip")').last().click();
      await page.waitForTimeout(500);
    }
    const items = page.locator('[data-testid="saved-clip-item"]');
    await expect(items).toHaveCount(2, { timeout: 5000 });

    const drawn = page.locator('#pdf-page-1 .pdf-saved-highlight');
    // Select the first listed clip. Only its text is drawn.
    const listed: string[] = await items.allTextContents();
    await items.nth(0).click();
    await expect(drawn.first()).toBeVisible({ timeout: 5000 });
    const shown = (await drawn.allTextContents()).join(' ').replace(/\s+/g, ' ').trim();
    const chosen = texts.find((t) => listed[0].includes(t.slice(0, 10))) as string;
    const other = texts.find((t) => t !== chosen) as string;
    expect(shown).toContain(chosen.slice(0, 10));
    expect(shown).not.toContain(other.slice(0, 10));

    // Selecting the other one swaps the drawn highlight.
    await items.nth(1).click();
    await expect.poll(async () => (await drawn.allTextContents()).join(' ')).toContain(other.slice(0, 10));
    expect((await drawn.allTextContents()).join(' ')).not.toContain(chosen.slice(0, 10));

    // Clicking away clears it.
    await page.locator('#pdf-page-1').click({ position: { x: 5, y: 5 } });
    await expect(drawn).toHaveCount(0);
  });

  test('the assistant panel can be resized and stays within its limits', async ({ page }) => {
    await openAssistant(page);
    const panel = page.getByTestId('assistant-panel');
    const handle = page.getByTestId('assistant-resize-handle');
    const before = (await panel.boundingBox())!.width;

    const h = (await handle.boundingBox())!;
    const cx = h.x + h.width / 2;
    const cy = h.y + h.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 120, cy, { steps: 6 });
    await page.mouse.up();
    const wider = (await panel.boundingBox())!.width;
    expect(wider).toBeGreaterThan(before + 100);

    // Dragging far past the limit stops at the maximum.
    const h2 = (await handle.boundingBox())!;
    await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2);
    await page.mouse.down();
    await page.mouse.move(h2.x - 1000, h2.y + 40, { steps: 8 });
    await page.mouse.up();
    expect((await panel.boundingBox())!.width).toBeLessThanOrEqual(721);

    // The width is kept for the next visit.
    const saved = await page.evaluate(() => window.localStorage.getItem('researchie.assistantWidth'));
    expect(Number(saved)).toBeGreaterThanOrEqual(260);
  });
});
