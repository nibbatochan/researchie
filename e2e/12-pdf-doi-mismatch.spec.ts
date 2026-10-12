import { test, expect, type Page } from '@playwright/test';

// A PDF whose DOI resolves to a different paper is saved with the warning
// "This might not be the source. Please verify." A matching title shows no warning.
// The PDF is built in the test (title in its metadata, DOI on page 1). The citation lookup
// is mocked, and the uploaded document is deleted afterwards.
const PROJECT_ID = 'proj-always-on-agents-dots';
const PDF_TITLE = 'Thermal drift in coral reef sediments';
const WARNING = 'This might not be the source. Please verify.';

function buildPdf(title: string, doi: string): Buffer {
  const stream = `BT /F1 14 Tf 72 700 Td (${title}) Tj 0 -24 Td (doi:${doi}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${title}) >>`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    out += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

const record = (title: string) => ({
  status: 'verified_doi',
  sourceType: 'journal_article',
  resolvedFrom: 'crossref',
  doi: '10.1000/e2e.mismatch',
  title,
  authors: [{ family: 'Lee', given: 'Ann' }],
  journal: 'J Pets',
  year: 2020,
  volume: '5',
  issue: '2',
  pages: '10-20',
  missingFields: [],
});

async function uploadAndOpenCitation(page: Page, resolvedTitle: string, docIds: string[]) {
  await page.route('**/api/citations/resolve', (route) =>
    route.fulfill({ json: { record: record(resolvedTitle), reason: null, lookupsUsed: 1, lookupCap: 10 } }),
  );
  page.on('response', async (res) => {
    if (res.url().endsWith('/api/documents') && res.request().method() === 'POST') {
      try {
        const json = await res.json();
        if (json?.data?.id) docIds.push(json.data.id);
      } catch {}
    }
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const projects = await (await page.request.get('/api/projects')).json();
  const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
  expect(project).toBeTruthy();
  await page.getByText(project.title, { exact: false }).first().click();
  await page.waitForTimeout(600);
  await page.locator('button[title="Docs"], button:has-text("Docs")').first().click();
  await page.waitForTimeout(800);

  await page.locator('input[type="file"]').first().setInputFiles({
    name: `e2e-doi-mismatch-${Date.now()}.pdf`,
    mimeType: 'application/pdf',
    buffer: buildPdf(PDF_TITLE, '10.1000/e2e.mismatch'),
  });
  const save = page.getByRole('button', { name: /Save & Open in Reader/ });
  await expect(save).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('No DOI found in this PDF')).toHaveCount(0);
  await save.click();

  // The upload lands in the library; open it in the reader.
  const resume = page.locator('button:has-text("Resume Reading")').first();
  if (await resume.isVisible({ timeout: 5000 }).catch(() => false)) await resume.click();

  const citationBtn = page.locator('button[title="Show citation"]').first();
  await expect(citationBtn).toBeVisible({ timeout: 20000 });
  await citationBtn.click();
}

test.describe('12. PDF whose DOI points to a different paper', () => {
  const docIds: string[] = [];

  test.afterEach(async ({ request }) => {
    while (docIds.length) await request.delete(`/api/documents?id=${docIds.pop()}`);
  });

  test('a DOI with a different title is saved with the verify warning', async ({ page }) => {
    await uploadAndOpenCitation(page, 'Quantum dots in photovoltaic cells', docIds);
    await expect(page.getByText(WARNING)).toBeVisible();
    await expect(page.getByText('points to a different title than the PDF')).toBeVisible();
  });

  test('a DOI with the same title shows no warning', async ({ page }) => {
    await uploadAndOpenCitation(page, PDF_TITLE, docIds);
    await expect(page.getByText(PDF_TITLE).first()).toBeVisible();
    await expect(page.getByText(WARNING)).toHaveCount(0);
  });
});
