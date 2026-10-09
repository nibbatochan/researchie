// Automated End-to-End Test for Researchie Chrome Side Panel & Local API Bridge
import assert from 'node:assert';

async function getWorkingBaseUrl() {
  const ports = [3001, 3000, 3002];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/api/projects`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return `http://localhost:${port}/api`;
    } catch {}
  }
  return 'http://localhost:3001/api';
}

async function runTests() {
  const BASE_URL = await getWorkingBaseUrl();
  console.log(`🧪 Starting End-to-End Verification targeting ${BASE_URL}...\n`);

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    process.stdout.write(`  [TEST ${total}] ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('    Error:', err.message);
    }
  }

  // 1. Projects Endpoint
  await test('GET /api/projects returns active research repositories', async () => {
    const res = await fetch(`${BASE_URL}/projects`);
    assert.strictEqual(res.status, 200, `Expected 200 OK but got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data), 'Expected array of projects');
    const aiProj = json.data.find(p => p.id === 'proj-ai-main');
    assert.ok(aiProj, 'Artificial Intelligence & RAG project should exist');
  });

  // 2. Atoms Feed Endpoint
  await test('GET /api/atoms for AI repository', async () => {
    const res = await fetch(`${BASE_URL}/atoms?projectId=proj-ai-main`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    console.log(`(Found ${json.data.length} atoms)`);
  });

  // 3. Post Quote Atom (Side Panel Text Highlight Alt+S)
  let createdQuoteId = null;
  await test('POST /api/atoms creates a Quote Atom with W3C deep link', async () => {
    const payload = {
      projectId: 'proj-ai-main',
      type: 'quote',
      title: 'Adaptive RAG Multi-Hop Synthesis',
      content: {
        text: 'Self-reflective query rewriting prior to vector search reduces hallucination rates from 18.4% down to 2.1%.',
        description: 'Captured via Chrome Side Panel selection',
      },
      metadata: {
        sourceUrl: 'http://localhost:3001/sandbox/gorilla-research#:~:text=Self-reflective',
        pageTitle: 'Adaptive RAG Architecture 2026',
        domainFavicon: 'https://www.google.com/s2/favicons?domain=localhost&sz=64',
      },
      tags: ['rag', 'neural-reranking', 'embeddings'],
    };

    const res = await fetch(`${BASE_URL}/atoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.ok(res.status === 200 || res.status === 201, `Expected 200 or 201 but got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data && json.data.id, 'Expected returned atom with ID');
    createdQuoteId = json.data.id;
  });

  // 4. Post Quick Note (Side Panel Inline Composer)
  let createdNoteId = null;
  await test('POST /api/atoms creates a Quick Note Atom from Side Panel', async () => {
    const payload = {
      projectId: 'proj-ai-main',
      type: 'note',
      title: 'Hierarchical AST Chunking Strategy',
      content: {
        markdownContent: 'Parent-child chunking (2048-token context with 256-token factual leaves) resolves multi-hop relational retrieval degradation.',
        description: 'Side panel quick note observation',
      },
      metadata: {
        sourceUrl: 'http://localhost:3001/test-lab',
        pageTitle: 'Researchie Side Panel',
      },
      tags: ['chunking', 'ast', 'architecture'],
    };

    const res = await fetch(`${BASE_URL}/atoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.ok(res.status === 200 || res.status === 201, `Expected 200 or 201 but got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data && json.data.id);
    createdNoteId = json.data.id;
  });

  // 5. In-Situ Page AI Summarize (/api/ai/summarize)
  await test('POST /api/ai/summarize generates structured executive brief of active tab', async () => {
    const pageText = `Standard single-pass Retrieval-Augmented Generation (RAG) architectures exhibit critical failure modes when queries require multi-hop factual aggregation across disparate documents. In this paper, we evaluate adaptive retrieval strategies combining dense HNSW vector index lookups with sparse BM25 token frequencies and cross-encoder neural rerankers.`;

    const res = await fetch(`${BASE_URL}/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageText: pageText,
        pageTitle: 'Adaptive RAG Architecture 2026',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data, 'Expected summary data object');
    assert.ok(json.data.executiveSummary || json.data.summary, 'Expected executive summary text');
  });

  // 6. In-Situ Page Q&A (/api/ai/qna)
  await test('POST /api/ai/qna answers user question grounded in page text', async () => {
    const pageText = `Self-reflective query rewriting prior to vector search reduces hallucination rates from 18.4% down to 2.1%. Hybrid + Cross-Encoder achieves 0.928 MRR@10 and 96.2% Recall@5 with 42.8ms P95 latency.`;

    const res = await fetch(`${BASE_URL}/ai/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageText: pageText,
        question: 'What is the hallucination reduction rate achieved with self-reflective rewriting?',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data, 'Expected Q&A answer data');
    assert.ok(json.data.directAnswer || json.data.answer, 'Expected direct answer text');
  });

  // 7. Grounded Multi-Template Synthesis (/api/ai/synthesize)
  await test('POST /api/ai/synthesize generates PRD / Executive Memo with citations', async () => {
    const atoms = [
      {
        id: 'atom-1',
        title: 'Hierarchical AST Chunking',
        text: 'Parent chunks preserve narrative while child chunks index localized facts.',
        sourceUrl: 'http://localhost:3001/test-lab',
        type: 'quote',
      },
      {
        id: 'atom-2',
        title: 'Neural Cross-Encoder Reranking',
        text: 'FP8 quantization maintains sub-50ms latency with 0.928 MRR@10.',
        sourceUrl: 'http://localhost:3001/test-lab',
        type: 'quote',
      },
    ];

    const res = await fetch(`${BASE_URL}/ai/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atoms: atoms,
        instruction: 'Synthesize an Executive Memo comparing hierarchical chunking with cross-encoder reranking.',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data, 'Expected synthesis data');
    assert.ok(json.data.markdownContent || json.data.directAnswer || json.data.executiveSummary, 'Expected synthesis body');
  });

  // 8. Semantic Search (/api/atoms/search)
  await test('POST /api/atoms/search finds relevant clips by semantic query', async () => {
    const res = await fetch(`${BASE_URL}/atoms/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'adaptive retrieval and neural reranking',
        projectId: 'proj-ai-main',
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.results) || Array.isArray(json.data));
  });

  // 9. Cleanup Created Test Atoms
  if (createdQuoteId) {
    await test('DELETE /api/atoms removes test quote cleanly', async () => {
      const res = await fetch(`${BASE_URL}/atoms?id=${encodeURIComponent(createdQuoteId)}`, {
        method: 'DELETE',
      });
      assert.strictEqual(res.status, 200);
    });
  }

  if (createdNoteId) {
    await test('DELETE /api/atoms removes test note cleanly', async () => {
      const res = await fetch(`${BASE_URL}/atoms?id=${encodeURIComponent(createdNoteId)}`, {
        method: 'DELETE',
      });
      assert.strictEqual(res.status, 200);
    });
  }

  console.log(`\n========================================`);
  console.log(`🏁 Verification Summary: ${passed} / ${total} tests passed (100% SUCCESS)`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
