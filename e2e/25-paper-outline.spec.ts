import { test, expect, type Page } from '@playwright/test';

// Paper outline: pick a template, add parts to a section, put clips under a part (drag or the
// "Add a clip" menu), reorder parts, and keep it all after a reload. Clips are created for the test
// and deleted afterwards. The outline itself is stored in the browser.
const PROJECT_ID = 'proj-always-on-agents-dots';

test.describe('25. Paper outline', () => {
  const stamp = Date.now();
  const clip = { a: `E2E outline clip A ${stamp}`, b: `E2E outline clip B ${stamp}` };
  const atomIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    for (const title of [clip.a, clip.b]) {
      const res = await request.post('/api/atoms', {
        data: {
          projectId: PROJECT_ID,
          type: 'text',
          title,
          content: { rawText: title, text: title },
          metadata: { sourceUrl: 'https://example.org/outline', pageTitle: 'Outline test' },
          tags: [],
        },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      atomIds.push(json.data?.id || json.atom?.id || json.id);
    }
  });

  test.afterAll(async ({ request }) => {
    for (const id of atomIds) if (id) await request.delete(`/api/atoms?id=${id}`);
  });

  async function openOutline(page: Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const projects = await (await page.request.get('/api/projects')).json();
    const project = (projects.data || projects.projects || []).find((p: any) => p.id === PROJECT_ID);
    expect(project).toBeTruthy();
    await page.getByText(project.title, { exact: false }).first().click();
    await expect(page.getByText(clip.b).first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('paper-outline-btn').click();
    await expect(page.getByTestId('paper-outline')).toBeVisible();
  }

  test('build an outline, place clips, reorder parts, and keep it after a reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
    await openOutline(page);

    // Pick a template: sections appear in order and the guide names the first one as next.
    await page.getByTestId('template-imrad').click();
    await expect(page.getByTestId('outline-section')).toHaveCount(6);
    await expect(page.getByTestId('outline-next')).toContainText('Abstract');

    // Two methods under Methods.
    const methods = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Methods/ }) });
    for (const name of ['Survey', 'Interviews']) {
      await methods.getByLabel('Add a part to Methods').fill(name);
      await methods.getByRole('button', { name: 'Add part' }).click();
    }
    await expect(methods.getByTestId('outline-part')).toHaveCount(2);

    // Clip A through the menu, clip B by dragging from the side list.
    await methods.getByTestId('outline-part').first().getByLabel(/Add a clip to Survey/).selectOption({ label: clip.a });
    await expect(methods.getByTestId('outline-part').first().getByTestId('outline-clip')).toContainText(clip.a);
    await page
      .getByTestId('outline-clip')
      .filter({ hasText: clip.b })
      .last()
      .dragTo(methods.getByTestId('outline-part').nth(1));
    await expect(methods.getByTestId('outline-part').nth(1).getByTestId('outline-clip')).toContainText(clip.b);

    // Every clip carries its evidence badge.
    await expect(methods.getByTestId('outline-clip').first()).toContainText('Quote');

    // Reorder: drag the second part above the first.
    await methods.getByTestId('outline-part').nth(1).dragTo(methods.getByTestId('outline-part').first());
    await expect(methods.getByTestId('outline-part').first().getByLabel('Part title')).toHaveValue('Interviews');

    // Reload: the outline is still there.
    await openOutline(page);
    await expect(page.getByTestId('outline-section')).toHaveCount(6);
    await expect(methods.getByTestId('outline-part').first().getByLabel('Part title')).toHaveValue('Interviews');
  });

  test('cited clips get markers in both styles, the reference list follows, and a marker jumps to its entry', async ({ page, request }) => {
    const record = (over: Record<string, unknown>) => ({
      status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [],
      journal: 'Journal of Examples', volume: '12', issue: '3', pages: '45-67', ...over,
    });
    const made: string[] = [];
    const titles = [`E2E cited Lee ${stamp}`, `E2E cited Abe ${stamp}`];
    const records = [
      record({ title: 'Sleep and memory', year: 2020, authors: [{ family: 'Lee', given: 'Jane' }] }),
      record({ title: 'Attention and focus', year: 2018, authors: [{ family: 'Abe', given: 'Ken' }] }),
    ];
    for (let i = 0; i < 2; i++) {
      const res = await request.post('/api/atoms', {
        data: {
          projectId: PROJECT_ID, type: 'text', title: titles[i], content: { rawText: titles[i], text: titles[i] },
          metadata: { sourceUrl: 'https://example.org/cited', pageTitle: 'Cited', citation: records[i], pageNumber: i === 0 ? 14 : undefined },
          tags: [],
        },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      made.push(json.data?.id || json.atom?.id || json.id);
    }
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();

      const intro = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Introduction/ }) });
      await intro.getByLabel('Add a part to Introduction').fill('Background');
      await intro.getByRole('button', { name: 'Add part' }).click();
      const part = intro.getByTestId('outline-part').first();
      await part.getByLabel(/Add a clip to Background/).selectOption({ label: titles[0] });
      await part.getByLabel(/Add a clip to Background/).selectOption({ label: titles[1] });

      // Harvard: oldest first, page shown for the quote.
      await expect(part.getByTestId('part-citation')).toContainText('(Abe, 2018; Lee, 2020, p. 14)');
      await expect(page.getByTestId('reference-item')).toHaveCount(2);
      await expect(page.getByTestId('reference-item').first()).toContainText("Abe, K. (2018) 'Attention and focus'");

      // Numbered: numbers follow the order of use inside the part (clip order), list follows the numbers.
      await page.getByTestId('style-ieee').click();
      await expect(part.getByTestId('part-citation')).toContainText('[1, p. 14]');
      await expect(page.getByTestId('reference-item').first()).toContainText('[1]');

      // Clicking a marker lands on its reference entry.
      await part.getByTestId('cite-link').first().click();
      await expect(page.locator('[id^="ref-"].ring-2').first()).toBeVisible();

      // The style is remembered after a reload.
      await openOutline(page);
      await expect(page.getByTestId('style-ieee')).toHaveAttribute('aria-pressed', 'true');
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => window.localStorage.removeItem('researchie.inTextStyle'));
    }
  });

  test('the preview shows a paper page with a permanent banner, quotes with markers, and flags for what has no source', async ({ page, request }) => {
    const made: string[] = [];
    const post = async (type: string, text: string, metadata: Record<string, unknown>) => {
      const res = await request.post('/api/atoms', {
        data: { projectId: PROJECT_ID, type, title: text, content: { rawText: text, text }, metadata: { sourceUrl: 'https://example.org/p', pageTitle: 'P', ...metadata }, tags: [] },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      made.push(json.data?.id || json.atom?.id || json.id);
    };
    const cited = `E2E preview cited ${stamp}`;
    const bare = `E2E preview bare ${stamp}`;
    const own = `E2E preview own ${stamp}`;
    await post('text', cited, {
      pageNumber: 7,
      citation: { status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [], title: 'Sleep and memory', journal: 'J Ex', volume: '1', pages: '1-2', year: 2020, authors: [{ family: 'Lee', given: 'Jane' }] },
    });
    await post('text', bare, {});
    await post('note', own, {});
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();
      await page.getByLabel('Paper title').fill('Sleep and recall');
      await page.getByLabel('Paper authors').fill('J. Lee');

      const intro = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Introduction/ }) });
      await intro.getByLabel('Add a part to Introduction').fill('Background');
      await intro.getByRole('button', { name: 'Add part' }).click();
      const part = intro.getByTestId('outline-part').first();
      for (const t of [cited, bare, own]) await part.getByLabel(/Add a clip to Background/).selectOption({ label: t });

      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('preview-banner')).toContainText('Preview only');
      await expect(page.getByTestId('preview-title')).toHaveText('Sleep and recall');
      await expect(page.getByTestId('preview-quote')).toContainText(`“${cited}” (Lee, 2020, p. 7)`);
      await expect(page.getByTestId('preview-uncited')).toContainText('No source');
      await expect(page.getByTestId('preview-own')).toContainText(own);
      await expect(page.getByTestId('preview-unsourced')).toContainText('1 item still without a source');
      await expect(page.getByTestId('preview-reference')).toHaveCount(1);

      // The style switch changes the markers and the list without touching the outline.
      await page.getByTestId('preview-style-ieee').click();
      await expect(page.getByTestId('preview-quote')).toContainText('[1, p. 7]');
      await expect(page.getByTestId('preview-reference')).toContainText('[1]');

      // The banner stays in view after scrolling.
      await page.getByTestId('preview-references').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('preview-banner')).toBeInViewport();

      // Back to the outline: nothing was lost.
      await page.getByTestId('tab-outline').click();
      await expect(part.getByTestId('outline-clip')).toHaveCount(3);
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => window.localStorage.removeItem('researchie.inTextStyle'));
    }
  });

  test('Draft sends only the clips of that section, shows each sentence with its check, re-checks edits, and the preview flags the weak ones', async ({ page, request }) => {
    const made: string[] = [];
    const post = async (type: string, text: string, metadata: Record<string, unknown>) => {
      const res = await request.post('/api/atoms', {
        data: { projectId: PROJECT_ID, type, title: text, content: { rawText: text, text }, metadata: { sourceUrl: 'https://example.org/d', pageTitle: 'D', ...metadata }, tags: [] },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      const id = json.data?.id || json.atom?.id || json.id;
      made.push(id);
      return id as string;
    };
    const quoteText = `Forty adults completed the survey ${stamp}.`;
    const quoteId = await post('text', quoteText, {
      pageNumber: 3,
      citation: { status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [], title: 'A survey', journal: 'J Ex', volume: '1', pages: '1-2', year: 2021, authors: [{ family: 'Kim', given: 'Dae' }] },
    });
    const outsideText = `E2E draft outside ${stamp}`;
    await post('text', outsideText, {});

    let sent: any = null;
    await page.route('**/api/ai/draft', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      sent = route.request().postDataJSON();
      const part = sent.parts[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            generatedAt: new Date().toISOString(),
            sentences: [
              { text: 'Forty adults took part.', clipIds: [quoteId], partId: part.id, status: 'sourced', placeholder: false },
              { text: 'Most of them liked it.', clipIds: [], partId: part.id, status: 'unsourced', placeholder: false },
            ],
          },
        }),
      });
    });

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();

      const methods = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Methods/ }) });
      await expect(methods.getByTestId('draft-button')).toBeDisabled();
      await methods.getByLabel('Add a part to Methods').fill('Survey');
      await methods.getByRole('button', { name: 'Add part' }).click();
      await methods.getByTestId('outline-part').first().getByLabel(/Add a clip to Survey/).selectOption({ label: quoteText });
      await methods.getByTestId('draft-button').click();

      await expect(methods.getByTestId('draft-sentence')).toHaveCount(2);
      // Only this section clip went to the model; the clip placed nowhere did not.
      expect(JSON.stringify(sent)).toContain(quoteText);
      expect(JSON.stringify(sent)).not.toContain(outsideText);
      expect(sent.parts[0].clips[0].kind).toBe('quote');

      await expect(methods.getByTestId('draft-sentence').nth(1)).toHaveAttribute('data-status', 'unsourced');
      // Editing re-checks: a number that is in no cited clip is flagged.
      await methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true }).fill('Forty adults answered 99 questions.');
      await expect(methods.getByTestId('draft-sentence').first()).toHaveAttribute('data-status', 'bad-number');
      await methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true }).fill('Forty adults took part.');
      await expect(methods.getByTestId('draft-sentence').first()).toHaveAttribute('data-status', 'sourced');

      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('preview-sentence').first()).toContainText('Forty adults took part.');
      await expect(page.getByTestId('preview-sentence').first()).toContainText('(Kim, 2021, p. 3)');
      await expect(page.getByTestId('preview-sentence').nth(1)).toHaveAttribute('data-status', 'unsourced');
      await expect(page.getByTestId('preview-ai-note')).toContainText('drafted by AI');
      await expect(page.getByTestId('preview-unsourced')).toContainText('1 item still without a source');
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => window.localStorage.removeItem('researchie.inTextStyle'));
    }
  });

  test('the draft API refuses an empty section and a section with too many clips, before any model call', async ({ request }) => {
    const part = (n: number) => ({ id: 'p', title: 'T', clips: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, kind: 'quote', text: 'x' })) });
    const empty = await request.post('/api/ai/draft', { data: { sectionTitle: 'Methods', parts: [part(0)] } });
    expect(empty.status()).toBe(400);
    const many = await request.post('/api/ai/draft', { data: { sectionTitle: 'Methods', parts: [part(13)] } });
    expect(many.status()).toBe(400);
    expect((await many.json()).error).toContain('up to 12');
    const bad = await request.post('/api/ai/draft', { data: { nope: true } });
    expect(bad.status()).toBe(400);
  });
});
