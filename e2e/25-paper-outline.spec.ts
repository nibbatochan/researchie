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
      await expect(methods.getByTestId('draft-button')).toHaveCount(0);
      await methods.getByLabel('Add a part to Methods').fill('Survey');
      await methods.getByRole('button', { name: 'Add part' }).click();
      await expect(methods.getByTestId('draft-button')).toBeDisabled();
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
      // The citation sits before the full stop: "...took part (Kim, 2021, p. 3)."
      await expect(page.getByTestId('preview-sentence').first()).toContainText('Forty adults took part (Kim, 2021, p. 3).');
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

  test('Mark as done is blocked by a missing citation or a retracted source, and works when the checks pass', async ({ page, request }) => {
    const made: string[] = [];
    const record = (over: Record<string, unknown>) => ({
      status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [],
      journal: 'J Ex', volume: '1', pages: '1-2', year: 2021, title: 'A study', authors: [{ family: 'Kim', given: 'Dae' }], ...over,
    });
    const post = async (text: string, metadata: Record<string, unknown>) => {
      const res = await request.post('/api/atoms', {
        data: { projectId: PROJECT_ID, type: 'text', title: text, content: { rawText: text, text }, metadata: { sourceUrl: 'https://example.org/c', pageTitle: 'C', ...metadata }, tags: [] },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      made.push(json.data?.id || json.atom?.id || json.id);
    };
    const bare = `E2E check bare ${stamp}`;
    const retracted = `E2E check retracted ${stamp}`;
    const good = `E2E check good ${stamp}`;
    await post(bare, {});
    await post(retracted, { citation: record({ retracted: true, title: 'A retracted study' }) });
    await post(good, { citation: record({ retracted: false }) });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();

      const intro = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Introduction/ }) });
      // An empty section shows no draft panel and no checklist: there is nothing to draft or check yet.
      await expect(intro.getByTestId('checklist')).toHaveCount(0);
      await expect(intro.getByTestId('draft-panel')).toHaveCount(0);

      await intro.getByLabel('Add a part to Introduction').fill('Background');
      await intro.getByRole('button', { name: 'Add part' }).click();
      const part = intro.getByTestId('outline-part').first();
      const pick = (label: string) => part.getByLabel(/Add a clip to Background/).selectOption({ label });
      await expect(intro.getByTestId('mark-done')).toBeDisabled();
      await expect(intro.getByTestId('checklist-item').first()).toContainText('Nothing here yet');
      await expect(intro.getByTestId('draft-privacy')).toHaveCount(0); // shown once there are clips to send

      await pick(bare);
      await expect(intro.getByTestId('draft-privacy')).toContainText('Groq');
      await expect(intro.getByTestId('checklist-item').filter({ hasText: 'no citation' })).toHaveCount(1);
      await expect(intro.getByTestId('mark-done')).toBeDisabled();

      await pick(retracted);
      await expect(intro.getByTestId('checklist-item').filter({ hasText: 'has been retracted' })).toHaveCount(1);
      await expect(intro.getByTestId('mark-done')).toBeDisabled();

      // Remove the two bad clips: only the good one is left, and the section can be finished.
      for (const t of [bare, retracted]) {
        await part.getByTestId('outline-clip').filter({ hasText: t }).getByRole('button', { name: 'Remove clip from this part' }).click();
      }
      await pick(good);
      await expect(intro.getByTestId('mark-done')).toBeEnabled();
      await intro.getByTestId('mark-done').click();
      await expect(intro.getByTestId('checklist')).toHaveAttribute('data-done', 'true');
      await expect(page.getByTestId('outline-next')).toContainText('1 of 6 sections done');

      // Adding a clip that fails the checks takes the Done mark away again; reopening is also possible.
      await pick(bare);
      await expect(intro.getByTestId('checklist')).toHaveAttribute('data-done', 'false');
      await expect(page.getByTestId('outline-next')).toContainText('0 of 6 sections done');
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => window.localStorage.removeItem('researchie.inTextStyle'));
    }
  });

  test('Draft again keeps the old draft, and Restore previous draft brings it back with the researcher edits', async ({ page, request }) => {
    const text = `Forty adults completed the survey ${stamp}.`;
    const res = await request.post('/api/atoms', {
      data: { projectId: PROJECT_ID, type: 'note', title: text, content: { rawText: text, text }, metadata: { sourceUrl: 'https://example.org/r', pageTitle: 'R' }, tags: [] },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const noteId = json.data?.id || json.atom?.id || json.id;
    let calls = 0;
    await page.route('**/api/ai/draft', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      calls++;
      const sent = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { generatedAt: new Date().toISOString(), sentences: [{ text: calls === 1 ? 'First draft sentence.' : 'Second draft sentence.', clipIds: [noteId], partId: sent.parts[0].id, status: 'own', placeholder: false }] } }),
      });
    });
    page.on('dialog', (d) => d.accept());
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();
      const methods = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Methods/ }) });
      await methods.getByLabel('Add a part to Methods').fill('Survey');
      await methods.getByRole('button', { name: 'Add part' }).click();
      await methods.getByTestId('outline-part').first().getByLabel(/Add a clip to Survey/).selectOption({ label: text });

      await expect(methods.getByTestId('restore-draft')).toHaveCount(0);
      await methods.getByTestId('draft-button').click();
      await expect(methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true })).toHaveValue('First draft sentence.');
      await methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true }).fill('My edited first sentence.');

      await methods.getByTestId('draft-button').click();
      await expect(methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true })).toHaveValue('Second draft sentence.');
      await methods.getByTestId('restore-draft').click();
      await expect(methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true })).toHaveValue('My edited first sentence.');

      // The restored draft is what is saved: it is still there after a reload.
      await openOutline(page);
      await expect(methods.getByRole('textbox', { name: 'Draft sentence 1', exact: true })).toHaveValue('My edited first sentence.');
      await expect(methods.getByTestId('restore-draft')).toBeVisible();
    } finally {
      if (noteId) await request.delete(`/api/atoms?id=${noteId}`);
    }
  });

  test('Pasted text becomes a Quote only when it is word for word in a PDF; the rest is saved as an AI summary', async ({ page, request }) => {
    const AI_PROJECT = 'proj-ai-main'; // holds the Just Enough Research PDF
    const found = 'It was slower than a car and at least ten times the price of a decent commuter bicycle [1].';
    const invented = `Researchers agreed that mushrooms power the whole library ${stamp}. Nothing in any PDF says this at all.`;
    const cleanup = async () => {
      const list = await (await request.get(`/api/atoms?projectId=${AI_PROJECT}`)).json();
      for (const a of (list.data || list.atoms || [])) {
        if (a.tags?.includes('pasted')) await request.delete(`/api/atoms?id=${a.id}`);
      }
    };
    await cleanup();
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await page.getByText('Artificial Intelligence & RAG', { exact: false }).first().click();
      await page.getByTestId('paper-outline-btn').click();
      await page.getByTestId('template-imrad').click();
      await page.getByTestId('paste-toggle').click();

      // 1. A passage that is in the PDF: found, with its page.
      await page.getByLabel('Pasted text').fill(found);
      await page.getByTestId('paste-check').click();
      await expect(page.getByTestId('paste-sentence')).toHaveCount(1);
      await expect(page.getByTestId('paste-sentence')).toHaveAttribute('data-found', 'true');
      await expect(page.getByTestId('paste-sentence')).toContainText('p. 9');
      await expect(page.getByTestId('paste-save-ai')).toHaveCount(0); // a whole-block hit offers only the Quote
      await page.getByTestId('paste-save-quotes').click();
      await expect(page.getByTestId('paste-message')).toContainText('Saved 1 Quote');

      // 2. Text that is in no PDF: not found; it can only be saved as an AI summary or as own text.
      await page.getByLabel('Pasted text').fill(invented);
      await page.getByTestId('paste-check').click();
      await expect(page.getByTestId('paste-result')).toContainText('0 of 2 sentences');
      await expect(page.getByTestId('paste-save-quotes')).toHaveCount(0);
      await page.getByTestId('paste-save-ai').click();

      // Both are now clips in the list, marked by what they are.
      const quote = page.getByTestId('outline-clip').filter({ hasText: 'It was slower than a car' });
      await expect(quote).toContainText('Quote');
      const ai = page.getByTestId('outline-clip').filter({ hasText: 'mushrooms power the whole library' });
      await expect(ai).toContainText('AI summary');
    } finally {
      await cleanup();
    }
  });

  test('Importing a RIS file attaches each citation to the PDF or clip it belongs to, and lets the user pick for the rest', async ({ page, request }) => {
    const pdfTitle = `E2E Import Paper ${stamp}`;
    const clipTitle = `E2E Import Web Page ${stamp}`;
    const lonelyTitle = `E2E Import Nobody Has This ${stamp}`;
    const docRes = await request.post('/api/documents', {
      data: { projectId: PROJECT_ID, title: pdfTitle, filename: `e2e_import_${stamp}.pdf`, pages: [{ pageNumber: 1, title: 'Page 1', content: 'Some text on a page of the test paper.' }] },
    });
    expect(docRes.ok()).toBeTruthy();
    const docId = (await docRes.json()).data.id as string;
    const clipRes = await request.post('/api/atoms', {
      data: { projectId: PROJECT_ID, type: 'text', title: 'A clip', content: { rawText: 'Text', text: 'Text' }, metadata: { sourceUrl: 'https://example.org/i', pageTitle: clipTitle }, tags: [] },
    });
    expect(clipRes.ok()).toBeTruthy();
    const cj = await clipRes.json();
    const clipId = (cj.data?.id || cj.atom?.id || cj.id) as string;
    const ris = [
      `TY  - JOUR`, `AU  - Lee, Jane`, `TI  - ${pdfTitle}`, `JO  - Journal of Examples`, `PY  - 2020`, `DO  - 10.1000/e2e${stamp}`, `ER  - `,
      `TY  - ELEC`, `AU  - Kim, Dae`, `TI  - ${clipTitle}`, `PY  - 2021`, `ER  - `,
      `TY  - JOUR`, `AU  - Roy, Sam`, `TI  - ${lonelyTitle}`, `JO  - Journal of Examples`, `PY  - 2019`, `ER  - `,
    ].join('\n');
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();
      await page.getByTestId('import-toggle').click();
      await page.getByLabel('Pasted references').fill(ris);
      await page.getByTestId('import-read').click();

      await expect(page.getByTestId('import-entry')).toHaveCount(3);
      await expect(page.getByTestId('import-entry').nth(0)).toHaveAttribute('data-status', 'matched');
      await expect(page.getByTestId('import-entry').nth(1)).toHaveAttribute('data-status', 'matched');
      await expect(page.getByTestId('import-entry').nth(2)).toHaveAttribute('data-status', 'unmatched');
      // Matched entries are already chosen; the unmatched one is left out until the user picks.
      await expect(page.getByTestId('import-apply')).toContainText('Attach 2 citations');
      await expect(page.getByTestId('import-entry').nth(2).getByRole('combobox')).toHaveValue('');

      // The unmatched entry can be given a PDF, and left out again.
      await page.getByTestId('import-entry').nth(2).getByRole('combobox').selectOption({ label: `PDF: ${pdfTitle}` });
      await page.getByTestId('import-entry').nth(2).getByRole('combobox').selectOption('');
      await page.getByTestId('import-apply').click();
      await expect(page.getByTestId('import-message')).toContainText('Attached 2 citations: 1 to PDFs, 1 to clips.');

      const doc = (await (await request.get(`/api/documents?id=${docId}`)).json()).data;
      expect(doc.citation.title).toBe(pdfTitle);
      expect(doc.citation.doi).toBe(`10.1000/e2e${stamp}`);
      expect(doc.citation.resolvedFrom).toBe('import');
      const atoms = (await (await request.get(`/api/atoms?projectId=${PROJECT_ID}`)).json());
      const clip = (atoms.data || atoms.atoms).find((a: any) => a.id === clipId);
      expect(clip.metadata.citation.title).toBe(clipTitle);
      expect(clip.metadata.citation.authors[0].family).toBe('Kim');
    } finally {
      await request.delete(`/api/documents?id=${docId}`);
      await request.delete(`/api/atoms?id=${clipId}`);
    }
  });

  test('the document citation API refuses a missing id and a citation that is not a record', async ({ request }) => {
    expect((await request.patch('/api/documents', { data: { citation: {} } })).status()).toBe(400);
    expect((await request.patch('/api/documents', { data: { id: 'x', citation: { nope: true } } })).status()).toBe(400);
    expect((await request.patch('/api/documents', { data: { id: 'no-such-doc', citation: { status: 'manual', sourceType: 'unknown', resolvedFrom: 'import', authors: [], missingFields: [] } } })).status()).toBe(404);
  });

  test('The preview draws equations, numbered figures and tables with their sources, and the checklist guards figures', async ({ page, request }) => {
    const made: string[] = [];
    const record = (over: Record<string, unknown>) => ({
      status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [], journal: 'J Ex', volume: '1', pages: '1-2', year: 2021, ...over,
    });
    const post = async (type: string, title: string, content: Record<string, unknown>, metadata: Record<string, unknown>) => {
      const res = await request.post('/api/atoms', {
        data: { projectId: PROJECT_ID, type, title, content, metadata: { sourceUrl: 'https://example.org/m', pageTitle: 'M', ...metadata }, tags: [] },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      made.push(json.data?.id || json.atom?.id || json.id);
    };
    const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#325FEC"/></svg>').toString('base64');
    const tag = `${stamp}`;
    const eq = `E2E maths note ${tag}`;
    const figTitle = `E2E figure with source ${tag}`;
    const bareFig = `E2E figure no source ${tag}`;
    const tableTitle = `E2E table ${tag}`;
    const noteText = String.raw`The slope is $m = 2$ and chemistry $\ce{H2O}$ works. $$E = mc^2$$ Also $\zzzunknown$ stays visible. ` + tag;
    await post('note', eq, { rawText: noteText, text: noteText }, {});
    await post('image', figTitle, { imageUrl: svg, description: 'Recall by hours of sleep' }, { citation: record({ title: 'Sleep figures', authors: [{ family: 'Lee', given: 'Jane' }] }) });
    await post('image', bareFig, { imageUrl: svg, description: 'A copied figure' }, {});
    await post('block', tableTitle, { sanitizedHtml: '<table><caption>Words recalled</caption><thead><tr><th>Hours</th><th>Words</th></tr></thead><tbody><tr><td>5</td><td>12</td></tr><tr><td>8</td><td>19</td></tr></tbody></table>', rawText: 'Hours Words 5 12 8 19' }, { citation: record({ title: 'Recall tables', authors: [{ family: 'Abe', given: 'Ken' }], year: 2018 }) });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();
      const results = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Results/ }) });
      await results.getByLabel('Add a part to Results').fill('Findings');
      await results.getByRole('button', { name: 'Add part' }).click();
      const select = results.getByTestId('outline-part').first().getByLabel(/Add a clip to Findings/);
      const labelFor = async (needle: string) => (await select.locator('option').allTextContents()).find((l) => l.includes(needle))!;
      for (const needle of ['The slope is', figTitle, bareFig, 'Hours Words 5 12']) await select.selectOption({ label: await labelFor(needle) });

      // The checklist: the copied figure has no source and blocks; the borrowed ones warn about permission.
      await expect(results.getByTestId('checklist-item').filter({ hasText: 'no source. No source, no figure' })).toHaveCount(1);
      await expect(results.getByTestId('checklist-item').filter({ hasText: 'Most publishers want permission' })).toHaveCount(1);
      await expect(results.getByTestId('mark-done')).toBeDisabled();

      await page.getByTestId('tab-preview').click();
      // Equations: inline ones are drawn by KaTeX; the display one is numbered (1); a bad one stays visible, not dropped.
      await expect(page.getByTestId('math-inline').first().locator('.katex')).toBeVisible();
      await expect(page.getByTestId('math-display')).toHaveCount(1);
      await expect(page.getByTestId('equation-number')).toHaveText('(1)');
      await expect(page.getByTestId('math-display').locator('.katex')).toBeVisible();
      // chemistry through mhchem: the formula is drawn, not left as \ce{...}
      await expect(page.getByTestId('math-inline').nth(1).locator('.katex')).toBeVisible();
      await expect(page.getByTestId('math-inline').nth(1).locator('.katex-html')).not.toContainText('ce{');
      await expect(page.getByTestId('math-inline').nth(1).locator('.katex-html sub, .katex-html .msupsub')).not.toHaveCount(0); // the 2 in H2O is a subscript
      // a command KaTeX does not know stays visible as typed, in red, and the page still works
      await expect(page.getByTestId('paper-preview')).toContainText('zzzunknown');
      await expect(page.getByTestId('math-inline').nth(2).locator('[style*="b91c1c"]').first()).toBeVisible();
      // Figures and the table: numbered in order, with captions and the source in text.
      await expect(page.getByTestId('preview-figure')).toHaveCount(2);
      await expect(page.getByTestId('preview-figure').first()).toContainText('Figure 1. Recall by hours of sleep.');
      await expect(page.getByTestId('preview-figure').first()).toContainText('Source: (Lee, 2021)');
      await expect(page.getByTestId('preview-figure').nth(1)).toContainText('Figure 2. A copied figure');
      await expect(page.getByTestId('preview-figure').nth(1)).toContainText('No source');
      await expect(page.getByTestId('preview-table')).toContainText('Table 1. Words recalled');
      await expect(page.getByTestId('preview-table')).toContainText('Source: (Abe, 2018)');
      await expect(page.getByTestId('preview-table').locator('tbody tr')).toHaveCount(2);
      await expect(page.getByTestId('preview-table').locator('th')).toHaveCount(2);

      // Numbered style: the sources are numbered in order of appearance, figure first.
      await page.getByTestId('preview-style-ieee').click();
      await expect(page.getByTestId('preview-figure').first()).toContainText('Source: [1]');
      await expect(page.getByTestId('preview-table')).toContainText('Source: [2]');
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => window.localStorage.removeItem('researchie.inTextStyle'));
    }
  });

  test('Download preview as PDF prints a page that says "preview only" on every sheet, in one or two columns', async ({ page, request, browser }) => {
    const made: string[] = [];
    const paragraph = (n: number) => `Paragraph ${n} of the results. ` + 'The students recalled more words after a full night of sleep than after a short one, across every age group we tested. '.repeat(5) + `$$a_${n} = ${n}$$`;
    for (let i = 1; i <= 12; i++) {
      const text = paragraph(i);
      const res = await request.post('/api/atoms', {
        data: { projectId: PROJECT_ID, type: 'note', title: `E2E long ${i} ${stamp}`, content: { rawText: text, text }, metadata: { sourceUrl: 'about:blank', pageTitle: 'N' }, tags: [] },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      made.push(json.data?.id || json.atom?.id || json.id);
    }
    const pdfPages = async (columnsButton: string) => {
      await page.getByTestId(columnsButton).click();
      await page.getByTestId('export-pdf').click();
      const frame = await expect.poll(() => page.frames().find((f) => f.name() === 'paper-print-frame') ?? null, { timeout: 15000 }).not.toBeNull().then(() => page.frames().find((f) => f.name() === 'paper-print-frame')!);
      await frame.waitForLoadState('load');
      const html = (await frame.content()).replace('<head>', `<head><base href="${new URL(page.url()).origin}/">`);
      const printed = await browser.newPage();
      await printed.setContent(html, { waitUntil: 'networkidle' });
      await printed.evaluate(() => document.fonts.ready);
      await printed.emulateMedia({ media: 'print' });
      const background = await printed.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const columnCount = await printed.evaluate(() => getComputedStyle(document.querySelector('.paper-body')!).columnCount);
      if (process.env.SHOTDIR) await printed.screenshot({ path: `${process.env.SHOTDIR}/print-${columnsButton}.png`, fullPage: true });
      const pdf = await printed.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
      await printed.close();
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
      const texts: string[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const content = await (await doc.getPage(n)).getTextContent();
        texts.push(content.items.map((i: any) => i.str).join(' '));
      }
      return { html, texts, columnCount, background };
    };
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();
      await page.getByLabel('Paper title').fill('A long test paper');
      const results = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Results/ }) });
      await results.getByLabel('Add a part to Results').fill('Findings');
      await results.getByRole('button', { name: 'Add part' }).click();
      const select = results.getByTestId('outline-part').first().getByLabel(/Add a clip to Findings/);
      for (let i = 1; i <= 12; i++) {
        const label = (await select.locator('option').allTextContents()).find((l) => l.startsWith(`Paragraph ${i} of`))!;
        await select.selectOption({ label });
      }
      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('equation-number').last()).toHaveText('(12)');

      const one = await pdfPages('preview-columns-1');
      expect(one.texts.length).toBeGreaterThan(1);
      for (const t of one.texts) expect(t).toContain('Preview only. Not journal formatting.');
      expect(one.texts[0]).toContain('A long test paper');
      expect(one.texts.join(' ')).toContain('Paragraph 12 of the results');
      expect(one.html).toContain('data-columns="1"');
      expect(one.html).not.toContain('paper-two-col"');

      const two = await pdfPages('preview-columns-2');
      for (const t of two.texts) expect(t).toContain('Preview only. Not journal formatting.');
      expect(two.html).toContain('data-columns="2"');
      expect(two.html).toContain('paper-two-col');
      expect(one.background).toBe('rgb(255, 255, 255)');
      expect(one.columnCount).toBe('auto');
      expect(two.columnCount).toBe('2');
      expect(two.texts.length).toBeLessThanOrEqual(one.texts.length);
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => { window.localStorage.removeItem('researchie.inTextStyle'); window.localStorage.removeItem('researchie.previewColumns'); });
    }
  });

  test('Writing your own text: cite a clip from a list, see what each key means, get quotes checked, and see it in the preview', async ({ page, request }) => {
    const made: string[] = [];
    const quote = `Participants who slept eight hours recalled more words than those who slept five hours ${stamp}.`;
    const res = await request.post('/api/atoms', {
      data: {
        projectId: PROJECT_ID, type: 'text', title: quote, content: { rawText: quote, text: quote },
        metadata: { sourceUrl: 'https://example.org/w', pageTitle: 'W', pageNumber: 3, citation: { status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [], title: 'Sleep study', journal: 'J Ex', volume: '1', pages: '1-2', year: 2021, retracted: false, authors: [{ family: 'Kim', given: 'Dae' }] } },
        tags: [],
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    made.push(json.data?.id || json.atom?.id || json.id);
    let drafts = 0;
    await page.route('**/api/ai/draft', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      drafts++;
      const sent = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { generatedAt: new Date().toISOString(), sentences: [{ text: 'Longer sleep helps people recall more.', clipIds: [made[0]], partId: sent.parts[0].id, status: 'sourced', placeholder: false }] } }) });
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((id) => window.localStorage.removeItem(`researchie.paperOutline.${id}`), PROJECT_ID);
      await openOutline(page);
      await page.getByTestId('template-imrad').click();
      const intro = page.getByTestId('outline-section').filter({ has: page.getByRole('heading', { name: /Introduction/ }) });

      // An empty section only offers to start writing.
      await intro.getByTestId('write-open').click();
      const area = intro.getByTestId('section-text');
      await area.click();
      await area.fill('Sleep helps memory');

      // Insert a citation at the cursor, from the list of clips that carry a citation.
      const picker = intro.getByTestId('insert-citation');
      const label = (await picker.locator('option').allTextContents()).find((l) => l.includes('Participants who slept'))!;
      await picker.selectOption({ label });
      await expect(area).toHaveValue('Sleep helps memory [@Kim2021]');
      await expect(intro.getByTestId('cite-legend')).toContainText('Kim 2021, p. 3');

      // Finish the sentence and add a direct quotation that really is in the clip.
      await area.fill('Sleep helps memory [@Kim2021]. He wrote "Participants who slept eight hours recalled more words" [@Kim2021].');
      await expect(intro.getByTestId('checklist-item').filter({ hasText: 'word for word' })).toHaveCount(0);

      // A quotation that is not in the clip, and a key nobody knows, block Mark as done.
      await area.fill('He wrote "Participants who slept ten hours recalled more words" [@Kim2021]. See also [@Nope].');
      await expect(intro.getByTestId('checklist-item').filter({ hasText: 'not word for word' })).toHaveCount(1);
      await expect(intro.getByTestId('checklist-item').filter({ hasText: 'key this section does not know' })).toHaveCount(1);
      await expect(intro.getByTestId('cite-legend').locator('li[data-ok="false"]')).toHaveCount(1);
      await expect(intro.getByTestId('mark-done')).toBeDisabled();

      // Fix it: only a soft note remains, and the section can be finished.
      await area.fill('Earlier work found a clear link between sleep and memory in many groups of adults [@Kim2021]. He wrote "Participants who slept eight hours recalled more words" [@Kim2021].');
      await expect(intro.getByTestId('checklist-item').filter({ hasText: 'word for word' })).toHaveCount(0);
      await expect(intro.getByTestId('mark-done')).toBeEnabled();

      // The preview draws the citations in either style; the page shows only after a direct quotation.
      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('preview-authored').first()).toContainText('(Kim, 2021). He wrote');
      await expect(page.getByTestId('preview-authored').first()).toContainText('(Kim, 2021, p. 3).');
      await page.getByTestId('preview-style-ieee').click();
      await expect(page.getByTestId('preview-authored').first()).toContainText('[1]. He wrote');
      await expect(page.getByTestId('preview-reference')).toHaveCount(1);
      await expect(page.getByTestId('preview-ai-note')).toHaveCount(0);
      await page.getByTestId('tab-outline').click();

      // It is still there after a reload.
      await openOutline(page);
      await expect(intro.getByTestId('section-text')).toHaveValue(/Earlier work found a clear link/);

      // Move an AI draft into the text: the citation becomes a key, and the preview says AI helped.
      await intro.getByTestId('section-text').fill('');
      await intro.getByLabel('Add a part to Introduction').fill('Background');
      await intro.getByRole('button', { name: 'Add part' }).click();
      const part = intro.getByTestId('outline-part').first();
      const pickLabel = (await part.getByLabel(/Add a clip to Background/).locator('option').allTextContents()).find((l) => l.includes('Participants who slept'))!;
      await part.getByLabel(/Add a clip to Background/).selectOption({ label: pickLabel });
      await intro.getByTestId('draft-button').click();
      await expect(intro.getByTestId('draft-sentence')).toHaveCount(1);
      expect(drafts).toBe(1);
      await intro.getByTestId('move-draft').click();
      await expect(intro.getByTestId('section-text')).toHaveValue('Longer sleep helps people recall more [@Kim2021].');
      await expect(intro.getByTestId('ai-assisted')).toBeChecked();
      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('preview-ai-note')).toBeVisible();
      await page.getByTestId('tab-outline').click();
      await intro.getByTestId('ai-assisted').uncheck();
      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('preview-ai-note')).toHaveCount(0);
    } finally {
      for (const id of made) if (id) await request.delete(`/api/atoms?id=${id}`);
      await page.evaluate(() => window.localStorage.removeItem('researchie.inTextStyle'));
    }
  });
});
