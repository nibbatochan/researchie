const http = require('http');

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

async function runAudit() {
  console.log('--- STARTING GROUNDING AUDIT BASELINE ---\n');

  const projectId = 'proj-always-on-agents-dots';

  // 1. Fetch project atoms
  const atomsRes = await fetch(`http://localhost:3001/api/atoms?projectId=${projectId}`).then(r => r.json());
  const allAtoms = atomsRes.data || atomsRes.atoms || [];
  console.log(`Loaded ${allAtoms.length} atoms for project ${projectId}.\n`);

  const testCases = [
    {
      id: 'TC-1',
      type: 'Direct Fact Lookup',
      question: 'What AI model powers OpenAI Dots and what date was it announced?',
      expectedFact: 'GPT-6 Astra, Sept 29, 2026',
    },
    {
      id: 'TC-2',
      type: 'Multi-Source Synthesis',
      question: 'How do OpenAI Dots and MultiOn approach autonomous web execution differently?',
      expectedFact: 'Dots uses sandboxed Ubuntu cloud VMs with headless Chromium; MultiOn uses vision-first pixel coordinate navigation instead of DOM CSS selectors.',
    },
    {
      id: 'TC-3',
      type: 'Product Comparison',
      question: 'Compare the mobility and form factor between Limitless Pendant and MultiOn AGI-0.',
      expectedFact: 'Limitless is a wearable audio hardware pendant (31.9mm, 16mm thick, 100h battery); MultiOn AGI-0 is a background mobile software agent (iOS/Android) for DoorDash/OpenTable.',
    },
    {
      id: 'TC-4',
      type: 'Numbers / Stats',
      question: 'What are the specific battery life, price, and physical dimensions of the Limitless Pendant?',
      expectedFact: '100 hours battery, $99 price, 31.9 mm diameter, 16 mm thickness.',
    },
    {
      id: 'TC-5',
      type: 'Summary',
      question: 'Summarize the safety guardrails, financial approval limits, and kill-switch protocols for OpenAI Dots.',
      expectedFact: '$50 threshold for human biometric approval, halt on destructive actions, 400ms global halt kill switch.',
    },
    {
      id: 'TC-6',
      type: 'NO-Answer Trap',
      question: 'What is the exact monthly subscription pricing of MultiOn AGI-0?',
      expectedFact: 'MUST STATE NOT IN DATA / UNKNOWN. MUST NOT HALLUCINATE A PRICE.',
    },
    {
      id: 'TC-7',
      type: 'Off-Topic Trap',
      question: 'How does Tesla Full Self-Driving (FSD) v13 neural network architecture work?',
      expectedFact: 'MUST STATE NOT IN DATA / OFF-TOPIC. MUST NOT BRING OUTSIDE INTERNET KNOWLEDGE.',
    },
    {
      id: 'TC-8',
      type: 'Ambiguous / Disambiguation',
      question: 'Tell me about the shutdown and sunset details.',
      expectedFact: 'Must distinguish New Computer Dot shutdown (Oct 5, 2025) vs Limitless sales halt (Dec 5, 2025).',
    },
  ];

  for (const tc of testCases) {
    console.log(`====================================================`);
    console.log(`Running ${tc.id} [${tc.type}]: "${tc.question}"`);

    // Step A: Search atoms
    const searchRes = await postJson('http://localhost:3001/api/atoms/search', {
      query: tc.question,
      projectId,
      limit: 6,
    });
    let topAtoms = searchRes.results || [];
    console.log(`- Retrieved atoms count: ${topAtoms.length}`);
    if (topAtoms.length > 0) {
      console.log(`- Top match: [${topAtoms[0].id}] ${topAtoms[0].title} (sim: ${topAtoms[0].similarity})`);
    }

    // Step B: Synthesize
    const synthRes = await postJson('http://localhost:3001/api/ai/synthesize', {
      instruction: `Answer the user's question with natural clarity, depth, and analytical rigor.
Provide:
1. "directAnswer": A clean 1-2 sentence core insight.
2. "markdownContent": A cohesive, well-formatted response with clear paragraphs, highlighted concepts, quantitative metrics, and bulleted takeaways.

User Question: ${tc.question}`,
      atoms: topAtoms.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type || 'note',
        text: a.content?.text || a.content?.rawText || a.text || '',
        description: a.content?.description || a.description || '',
        sourceUrl: a.metadata?.sourceUrl || a.sourceUrl || '',
        tags: a.tags || [],
      })),
    });

    const data = synthRes.data || {};
    console.log(`- Direct Answer:`, data.directAnswer);
    console.log(`- Citations Used:`, data.citationsUsed);
    console.log(`- Markdown Preview:`, (data.markdownContent || '').slice(0, 180) + '...');
    console.log(`\n`);
  }

  // Step C: Document AI test
  console.log(`====================================================`);
  console.log(`Testing Document AI (/api/ai/qna) with doc-dots-openai-spec:`);
  const docQnARes = await postJson('http://localhost:3001/api/ai/qna', {
    documentId: 'doc-dots-openai-spec',
    question: 'According to Page 2 of the OpenAI Dots specification, which enterprise tools integrate via OAuth 2.1 and what is the cost of ChatGPT Pro?',
  });
  console.log(`Document AI Q&A Response:`, JSON.stringify(docQnARes.data, null, 2));

  console.log(`\nTesting Document AI with NO-Answer Question:`);
  const docNoAnswerRes = await postJson('http://localhost:3001/api/ai/qna', {
    documentId: 'doc-dots-openai-spec',
    question: 'What is the stock ticker symbol and current market capitalization of OpenAI?',
  });
  console.log(`Document AI No-Answer Response:`, JSON.stringify(docNoAnswerRes.data, null, 2));
}

runAudit().catch(console.error);
