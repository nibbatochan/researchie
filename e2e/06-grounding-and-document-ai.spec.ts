import { test, expect } from '@playwright/test';

test.describe('Researchie AI & Document AI Grounding Verification', () => {
  const projectId = 'proj-always-on-agents-dots';

  test('1. Verify Test Project and 10 Research Atoms are saved and queryable', async ({ request }) => {
    const res = await request.get(`/api/atoms?projectId=${projectId}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const atoms = json.data || json.atoms || [];
    expect(atoms.length).toBeGreaterThanOrEqual(10);

    const corpus = atoms.map((a: any) => `${a.title} ${JSON.stringify(a.content)}`).join(' ');
    expect(corpus).toContain('GPT-6 Astra');
    expect(corpus).toContain('MultiOn');
    expect(corpus).toContain('Limitless');
  });

  test('2. Verify Document AI Grounding & Strict Citation Matching', async ({ request }) => {
    // 2A: Fact lookup in Page 2 of doc-dots-openai-spec
    const qnaRes = await request.post('/api/ai/qna', {
      data: {
        documentId: 'doc-dots-openai-spec',
        question: 'According to Page 2 of the OpenAI Dots specification, which enterprise tools integrate via OAuth 2.1 and what is the cost of ChatGPT Pro?',
      },
    });
    expect(qnaRes.ok()).toBeTruthy();
    const qnaJson = await qnaRes.json();
    expect(qnaJson.success).toBe(true);

    const answer = qnaJson.data.answer.toLowerCase();
    expect(answer).toContain('google workspace');
    expect(answer).toContain('slack');
    expect(answer).toContain('200');
    expect(qnaJson.data.sourcePageNumber).toBe(2);
    expect(qnaJson.data.citations.length).toBeGreaterThan(0);
    expect(qnaJson.data.citations[0].quote).toContain('OAuth 2.1');

    // 2B: Negative unanswerable question (must state not found, zero false citations)
    const negativeRes = await request.post('/api/ai/qna', {
      data: {
        documentId: 'doc-dots-openai-spec',
        question: 'What is the stock ticker symbol and current market capitalization of OpenAI?',
      },
    });
    expect(negativeRes.ok()).toBeTruthy();
    const negJson = await negativeRes.json();
    expect(negJson.success).toBe(true);
    expect(negJson.data.answer.toLowerCase()).toContain('not found');
    expect(negJson.data.citations.length).toBe(0); // Zero fake citations!
  });

  test('3. Verify Researchie AI Strict Grounding (No External Hallucinations)', async ({ request }) => {
    // 3A: Off-topic open internet trap (Tesla FSD)
    const searchRes = await request.post('/api/atoms/search', {
      data: {
        query: 'How does Tesla Full Self-Driving (FSD) v13 neural network architecture work?',
        projectId,
      },
    });
    expect(searchRes.ok()).toBeTruthy();
    const searchJson = await searchRes.json();
    const matchedAtoms = searchJson.results || [];

    const synthRes = await request.post('/api/ai/synthesize', {
      data: {
        instruction: 'Answer the user question: How does Tesla Full Self-Driving (FSD) v13 neural network architecture work?',
        atoms: matchedAtoms.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: a.type || 'note',
          text: a.content?.text || a.content?.rawText || a.text || '',
          description: a.content?.description || a.description || '',
          sourceUrl: a.metadata?.sourceUrl || a.sourceUrl || '',
          tags: a.tags || [],
        })),
      },
    });
    expect(synthRes.ok()).toBeTruthy();
    const synthJson = await synthRes.json();
    const data = synthJson.data;

    // Must clearly state that info is not in the data and citations must be empty
    const answer = (data.directAnswer + ' ' + data.markdownContent).toLowerCase();
    expect(answer).toContain('not found');
    expect(data.citationsUsed.length).toBe(0);
  });

  test('4. Verify Numbers/Stats Accuracy & Exact Citation Linking', async ({ request }) => {
    // 4A: Limitless specs lookup
    const searchRes = await request.post('/api/atoms/search', {
      data: {
        query: 'What are the specific battery life, price, and physical dimensions of the Limitless Pendant?',
        projectId,
      },
    });
    expect(searchRes.ok()).toBeTruthy();
    const searchJson = await searchRes.json();
    const matchedAtoms = searchJson.results || [];
    expect(matchedAtoms.length).toBeGreaterThan(0);
    expect(matchedAtoms[0].id).toBe('atom-dots-006'); // Accurate ranking!

    const synthRes = await request.post('/api/ai/synthesize', {
      data: {
        instruction: 'Answer user question: What are the specific battery life, price, and physical dimensions of the Limitless Pendant?',
        atoms: matchedAtoms.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: a.type || 'note',
          text: a.content?.text || a.content?.rawText || a.text || '',
          description: a.content?.description || a.description || '',
          sourceUrl: a.metadata?.sourceUrl || a.sourceUrl || '',
          tags: a.tags || [],
        })),
      },
    });
    expect(synthRes.ok()).toBeTruthy();
    const synthJson = await synthRes.json();
    const data = synthJson.data;

    const fullText = (data.directAnswer + ' ' + data.markdownContent).toLowerCase();
    expect(fullText).toContain('100');
    expect(fullText).toContain('99');
    expect(fullText).toContain('31.9');
    expect(data.citationsUsed.some((c: any) => c.atomId === 'atom-dots-006')).toBe(true);
  });

  test('5. Verify UI Assistant and Researchie AI Trigger Button', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click into project card to enter workspace timeline
    const projectCard = page.locator('[data-testid="project-card"], [data-testid="subproject-card"], button:has-text("OpenAI"), button:has-text("RAG")').first();
    await projectCard.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForTimeout(800);
    }

    // Verify AI trigger button is rendered and clickable
    const fabButton = page.locator('button[aria-label="Researchie AI"], button[title*="Researchie AI"]').first();
    await expect(fabButton).toBeVisible({ timeout: 10000 });
    await fabButton.click();
    await page.waitForTimeout(500);

    // Verify AI Sidebar panel opens
    const asidePanel = page.locator('[data-testid="researchie-ai-sidebar"]');
    await expect(asidePanel).toBeVisible({ timeout: 5000 });
  });
});
