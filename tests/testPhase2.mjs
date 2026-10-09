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

async function runPhase2Tests() {
  console.log('--- Running Phase 2 Ingestion & API Tests ---');
  const baseUrl = await getWorkingBaseUrl();
  console.log(`Targeting backend at: ${baseUrl}`);

  // Test 1: Ingest Block Atom
  const blockRes = await fetch(`${baseUrl}/atoms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'proj-ai-main',
      type: 'block',
      title: 'H100 vs B200 Spec & Cost Breakdown',
      content: {
        sanitizedHtml: '<table class="w-full border"><thead><tr><th class="p-2 border">Model</th><th class="p-2 border">TPS</th><th class="p-2 border">Cost</th></tr></thead><tbody><tr><td class="p-2 border">H100 FP8</td><td class="p-2 border">145</td><td class="p-2 border">$0.32</td></tr><tr><td class="p-2 border">B200 NVLink</td><td class="p-2 border">420</td><td class="p-2 border">$0.14</td></tr></tbody></table>',
        rawText: 'Model TPS Cost H100 145 $0.32 B200 420 $0.14',
      },
      metadata: {
        sourceUrl: 'https://semianalysis.com/benchmarks',
        pageTitle: 'SemiAnalysis Architecture Breakdown',
        domCssSelector: 'div.content > table.benchmarks',
      },
    }),
  });

  const blockJson = await blockRes.json();
  console.log('1. Block Atom Ingestion:', blockJson.success ? 'PASS' : 'FAIL');

  // Test 2: Ingest Image Atom
  const imgRes = await fetch(`${baseUrl}/atoms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'proj-ai-main',
      type: 'image',
      title: 'Inference Cost Disparity Curve Chart',
      content: {
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        description: 'Captured graph showing cost scaling curve across token batch sizes.',
      },
      metadata: {
        sourceUrl: 'https://semianalysis.com/charts/cost-curve',
        pageTitle: 'Inference Cost Scaling Charts',
      },
    }),
  });

  const imgJson = await imgRes.json();
  console.log('2. Image Atom Ingestion:', imgJson.success ? 'PASS' : 'FAIL');

  // Test 3: AI Summarize
  const sumRes = await fetch(`${baseUrl}/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pageTitle: 'Frontier AI Memory Systems',
      pageText: 'Transformer inference memory bandwidth is bounded by kv-cache movement. Speculative decoding speeds up draft token verification by 2.4x. Hardware utilisation improves with continuous batching.',
    }),
  });
  const sumJson = await sumRes.json();
  console.log('3. AI Summarize Route:', sumJson.success ? 'PASS' : 'FAIL');

  console.log('--- All Phase 2 Integration Tests Completed ---');
}

runPhase2Tests().catch(console.error);
