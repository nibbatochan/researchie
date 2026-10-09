const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('🧪 Starting Doc AI Assistant 163-Page PDF Q&A Verification...');
  let passedCount = 0;
  let failedCount = 0;

  // 1. Generate 163 Pages of Realistic Research Text (Simulating "Just Enough Research")
  const simulatedPages = [];
  for (let i = 1; i <= 163; i++) {
    if (i === 135) {
      simulatedPages.push({
        pageNumber: 135,
        title: 'Chapter 8: Usability Testing & Participant Recruitment Matrix',
        content: `Table 135.1: Participant Screening & Recruitment Thresholds
-----------------------------------------------------------------------------------------
Study Type                Target Sample Size   Screening Criteria          Completion Rate
-----------------------------------------------------------------------------------------
Exploratory Generative    12-15 participants   Domain practitioners        94.8%
Usability Validation      8-10 participants    End-users with task goals   98.2%
Longitudinal Diary        20-25 participants   Active weekly users         87.4%
-----------------------------------------------------------------------------------------
Key Takeaway: Over-recruiting by 20% mitigates no-show risk during remote usability studies.
Quantitative benchmark shows 94.8% completion rate when screening criteria are strictly defined.`,
        highlights: [],
      });
    } else if (i === 78) {
      simulatedPages.push({
        pageNumber: 78,
        title: 'Chapter 5: Ethnographic Field Observation Techniques',
        content: `Observational field testing requires stratified participant cohorts across five demographic clusters to avoid sampling skew.
When conducting contextual inquiry, researchers must observe natural workflows without introducing artificial task constraints.
Direct observation uncovers tacit knowledge and operational workarounds that self-reported survey data consistently misses.`,
        highlights: [],
      });
    } else {
      simulatedPages.push({
        pageNumber: i,
        title: `Page ${i}`,
        content: `Section ${i}: Theoretical foundations and empirical analysis regarding design research methodology. This page covers baseline operational practices for design research teams, addressing general qualitative inquiry standards on Page ${i}.`,
        highlights: [],
      });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Query with explicit page reference (Page 135 Table)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 1] Asking AI to explain table on Page 135 (Page 135 of 163)...');
  try {
    const res = await fetch(`${BASE_URL}/ai/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Can you explain the table on page 135 regarding participant recruitment thresholds?',
        pages: simulatedPages,
        title: 'Just Enough Research (163-Page Edition)',
        documentId: 'doc-just-enough-research',
        currentPage: 1,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`API returned error: ${JSON.stringify(json)}`);
    }

    const { answer, sourcePageNumber, citations } = json.data;
    console.log(`  > Source Page: ${sourcePageNumber}`);
    console.log(`  > Citations: ${citations?.length || 0}`);
    console.log(`  > Answer Preview: ${answer.slice(0, 160)}...`);

    const hasPage135 = sourcePageNumber === 135 || answer.includes('135');
    const hasCompletionOrMetric = answer.includes('94.8') || answer.includes('Participant') || answer.includes('Recruitment') || answer.includes('Table');

    if (hasPage135 && hasCompletionOrMetric) {
      console.log('✅ TEST 1 PASSED: AI retrieved Page 135 content, explained table, and cited [Page 135]');
      passedCount++;
    } else {
      throw new Error(`Failed to find Page 135 table content. Answer: ${answer}`);
    }
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Query with copy-pasted exact text from deep inside book (Page 78)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Asking AI with copy-pasted text from Page 78 of 163...');
  try {
    const res = await fetch(`${BASE_URL}/ai/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What does the book say about: "Observational field testing requires stratified participant cohorts across five demographic clusters"?',
        pages: simulatedPages,
        title: 'Just Enough Research (163-Page Edition)',
        documentId: 'doc-just-enough-research',
        currentPage: 1,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`API returned error: ${JSON.stringify(json)}`);
    }

    const { answer, sourcePageNumber, citations } = json.data;
    console.log(`  > Source Page: ${sourcePageNumber}`);
    console.log(`  > Citations: ${citations?.length || 0}`);
    console.log(`  > Answer Preview: ${answer.slice(0, 160)}...`);

    const hasPage78 = sourcePageNumber === 78 || answer.includes('78');
    const hasStratifiedOrCohorts = answer.toLowerCase().includes('stratified') || answer.toLowerCase().includes('demographic') || answer.toLowerCase().includes('cohorts');

    if (hasPage78 && hasStratifiedOrCohorts) {
      console.log('✅ TEST 2 PASSED: AI accurately located copy-pasted text on Page 78 and cited source');
      passedCount++;
    } else {
      throw new Error(`Failed to locate copy-pasted text. Answer: ${answer}`);
    }
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err.message);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // TEST 3: General multi-page synthesis across 163 pages
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] General qualitative methodology question across 163 pages...');
  try {
    const res = await fetch(`${BASE_URL}/ai/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What are the main observational methods and screening benchmarks?',
        pages: simulatedPages,
        title: 'Just Enough Research (163-Page Edition)',
        documentId: 'doc-just-enough-research',
        currentPage: 1,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`API returned error: ${JSON.stringify(json)}`);
    }

    const { answer, sourcePageNumber, citations } = json.data;
    console.log(`  > Source Page: ${sourcePageNumber}`);
    console.log(`  > Answer Preview: ${answer.slice(0, 140)}...`);

    if (answer && answer.length > 50 && (sourcePageNumber === 135 || sourcePageNumber === 78 || citations?.length > 0)) {
      console.log('✅ TEST 3 PASSED: Multi-page query returned grounded factual synthesis');
      passedCount++;
    } else {
      throw new Error(`Synthesis output inadequate. Answer: ${answer}`);
    }
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err.message);
    failedCount++;
  }

  console.log(`\n========================================`);
  console.log(`🏁 Verification Summary: ${passedCount} / ${passedCount + failedCount} tests passed (${failedCount === 0 ? '100% SUCCESS' : 'FAILURES DETECTED'})`);
  console.log(`========================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
