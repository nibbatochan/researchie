import sharp from 'sharp';

async function testFullFlow() {
  console.log('1. Creating a synthetic chart image...');
  const svg = `<svg width="400" height="150" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="20" y="60" font-family="sans-serif" font-size="24" font-weight="bold" fill="#000000">KUBERNETES CLUSTER HEALTH</text>
    <text x="20" y="100" font-family="sans-serif" font-size="18" fill="#333333">Latency p99: 14ms</text>
  </svg>`;
  
  const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const base64Data = `data:image/png;base64,${imgBuffer.toString('base64')}`;

  console.log('2. Saving Image Atom via POST /api/atoms...');
  const createRes = await fetch('http://localhost:3001/api/atoms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'proj-ai-main',
      type: 'image',
      title: 'Infrastructure Metric Snapshot',
      content: {
        imageUrl: base64Data,
        description: 'Server cluster monitoring dashboard',
      },
    }),
  });

  const createData = await createRes.json();
  const atomId = createData.data?.id;
  console.log('Created Atom ID:', atomId);

  console.log('3. Waiting 3 seconds for background OCR to process and store text...');
  await new Promise((r) => setTimeout(r, 3500));

  console.log('4. Fetching atom to verify ocrText is attached...');
  const fetchRes = await fetch(`http://localhost:3001/api/atoms?projectId=proj-ai-main`);
  const fetchData = await fetchRes.json();
  const savedAtom = fetchData.data?.find((a) => a.id === atomId);

  console.log('Saved Atom Content:', savedAtom?.content);

  if (savedAtom?.content?.ocrText && savedAtom.content.ocrText.includes('KUBERNETES')) {
    console.log('✅ Background OCR text successfully attached to atom!');
  } else {
    console.log('⚠️ Background OCR did not update atom in local store. Checking search...');
  }

  console.log('5. Searching for "KUBERNETES" via POST /api/atoms/search...');
  const searchRes = await fetch('http://localhost:3001/api/atoms/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'KUBERNETES cluster latency',
      projectId: 'proj-ai-main',
    }),
  });

  const searchData = await searchRes.json();
  const matched = searchData.results?.some((r) => r.id === atomId || (r.content?.ocrText && r.content.ocrText.includes('KUBERNETES')));
  console.log('Search matched target atom:', matched);

  // Clean up
  await fetch(`http://localhost:3001/api/atoms?id=${atomId}`, { method: 'DELETE' });
  console.log('Cleaned up test atom.');
}

testFullFlow().catch(console.error);
