import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

// Exports a project to a real PDF and reads the downloaded file back. The clips are created for the
// test and deleted afterwards, so the test projects keep their data.
const PROJECT_ID = 'proj-always-on-agents-dots';
const STAMP = String(Date.now());

const citation = (doi: string, extra: Record<string, unknown> = {}) => ({
  status: 'verified_doi',
  sourceType: 'journal_article',
  resolvedFrom: 'crossref',
  doi,
  title: 'Cats & dogs: a study',
  authors: [{ family: 'Lee', given: 'Ann' }, { family: 'Park', given: 'Bo' }],
  journal: 'J Pets',
  year: 2020,
  volume: '5',
  issue: '2',
  pages: '10-20',
  missingFields: [],
  ...extra,
});

const QUOTE_TEXT = `E2E pdf quote ${STAMP} about household pets`;
const RETRACTED_TEXT = `E2E pdf retracted quote ${STAMP}`;
const NOTE_TEXT = `E2E pdf synthesis paragraph ${STAMP}`;
const SYMBOLS_TEXT = `E2E symbols ${STAMP}: 5 μm, p ≥ 0.05, α-helix, H₂O, K̂n and data\u2011driven`;
const CJK_TEXT = `E2E cjk ${STAMP} 日本語`;

async function readPdf(path: string) {
  const bytes = fs.readFileSync(path);
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  const text = String(result.text).replace(/\s+/g, ' ');
  return { text, pages: Number(result.total ?? result.pages?.length ?? 0) };
}

async function openPdfTab(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const projects = await (await page.request.get('/api/projects')).json();
  const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
  await page.getByText(project.title, { exact: false }).first().click();
  await page.waitForTimeout(800);
  await page.locator('button[title*="Export to"]').first().click();
  await page.getByTestId('export-tab-pdf').click();
  await expect(page.getByTestId('pdf-export-panel')).toBeVisible();
  return project.title as string;
}

async function download(page: Page) {
  const [file] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByTestId('pdf-download-button').click()]);
  expect(file.suggestedFilename()).toMatch(/-research-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  const path = await file.path();
  expect(path).toBeTruthy();
  return readPdf(path!);
}

test.describe('13. PDF research report export', () => {
  const ids: string[] = [];

  test.beforeAll(async ({ request }) => {
    const make = async (data: Record<string, unknown>) => {
      const res = await request.post('/api/atoms', { data: { projectId: PROJECT_ID, tags: [], ...data } });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      ids.push(json.data?.id || json.atom?.id || json.id);
    };
    await make({
      type: 'quote',
      title: 'E2E quote',
      content: { rawText: QUOTE_TEXT, text: QUOTE_TEXT },
      userNotes: 'E2E note about the pets paper',
      tags: ['e2e-pdf'],
      metadata: { sourceUrl: 'https://example.org/pets', pageTitle: 'Pets paper', citation: citation('10.1000/e2e.pdf') },
    });
    await make({
      type: 'quote',
      title: 'E2E retracted quote',
      content: { rawText: RETRACTED_TEXT, text: RETRACTED_TEXT },
      metadata: {
        sourceUrl: 'https://example.org/retracted',
        pageTitle: 'Retracted paper',
        citation: citation('10.1000/e2e.pdf.retracted', { title: 'A withdrawn study', retracted: true }),
      },
    });
    await make({ type: 'quote', title: 'E2E symbols', content: { rawText: SYMBOLS_TEXT, text: SYMBOLS_TEXT }, metadata: { sourceUrl: '', pageTitle: 'Symbols' } });
    await make({ type: 'quote', title: 'E2E cjk', content: { rawText: CJK_TEXT, text: CJK_TEXT }, metadata: { sourceUrl: '', pageTitle: 'CJK' } });
    await make({
      type: 'note',
      title: 'E2E synthesis',
      content: { markdownContent: `# Findings\n\n${NOTE_TEXT}\n\n- first point\n- second point` },
      tags: ['ai-generated'],
      metadata: { sourceUrl: '', pageTitle: 'Synthesis' },
    });
  });

  test.afterAll(async ({ request }) => {
    for (const id of ids) if (id) await request.delete(`/api/atoms?id=${encodeURIComponent(id)}`);
  });

  test('downloads a real PDF with the cover, sections, citations, flags and notes', async ({ page }) => {
    const title = await openPdfTab(page);
    await expect(page.getByTestId('pdf-summary-clips')).not.toHaveText('0');
    await expect(page.getByTestId('pdf-summary-flags')).toBeVisible(); // the retracted clip is flagged
    // Chinese cannot be drawn, so the dialog says so before the user downloads.
    await expect(page.getByTestId('pdf-summary-glyphs')).toContainText('日');

    const { text, pages } = await download(page);
    await expect(page.getByTestId('pdf-saved')).toBeVisible();

    expect(pages).toBeGreaterThanOrEqual(3); // cover, contents, content
    expect(text).toContain(title);
    expect(text).toContain('Syntheses & Notes');
    expect(text).toContain('Quotes & Key Excerpts');
    expect(text).toContain(QUOTE_TEXT);
    expect(text).toContain(NOTE_TEXT);
    expect(text).toContain('first point');
    expect(text).not.toContain('# Findings'); // markdown marks are removed
    expect(text).toContain('Your notes');
    expect(text).toContain('E2E note about the pets paper');
    // Bibliography in Vancouver, with the retraction flag.
    expect(text).toContain('Bibliography');
    expect(text).toContain('Lee A, Park B. Cats & dogs: a study. J Pets. 2020;5(2):10-20.');
    expect(text).toContain('This paper has been retracted');
    expect(text).toMatch(/Page 2 of \d+/);
    expect(text).toContain('How to read this report');

    // Science symbols survive the trip through the real browser, fonts and all.
    expect(text).toContain('5 μm, p ≥ 0.05, α-helix, H₂O');
    expect(text).toContain('data-driven'); // the non-breaking hyphen became a plain one
    // The unsupported characters show as a visible mark instead of vanishing.
    expect(text).toContain(`E2E cjk ${STAMP} \uFFFD`);
  });

  test('citation style and section switches change what is in the PDF', async ({ page }) => {
    await openPdfTab(page);

    // APA shows APA references.
    await page.getByTestId('pdf-style-apa').click();
    await expect(page.getByTestId('pdf-style-apa')).toHaveAttribute('aria-pressed', 'true');
    const apa = await download(page);
    expect(apa.text).toContain('Lee, A., & Park, B. (2020). Cats & dogs: a study. J Pets, 5(2), 10');

    // Syntheses and bibliography switched off: those parts are gone, quotes stay.
    await page.getByTestId('pdf-section-syntheses').getByRole('checkbox').uncheck();
    await page.getByTestId('pdf-section-bibliography').getByRole('checkbox').uncheck();
    const slim = await download(page);
    expect(slim.text).toContain(QUOTE_TEXT);
    expect(slim.text).not.toContain('Syntheses & Notes');
    expect(slim.text).not.toContain(NOTE_TEXT);
    expect(slim.text).not.toContain('Bibliography');
    expect(slim.pages).toBeLessThan(apa.pages + 1);
  });
});
