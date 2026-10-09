import sharp from 'sharp';

async function verifyLiveApi() {
  console.log('1. Waiting for server to be responsive on http://localhost:3001...');
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch('http://localhost:3001/api/projects');
      if (res.ok) {
        console.log('Server is UP! Status:', res.status);
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log('2. Generating test base64 image with sharp...');
  const svg = `<svg width="450" height="160" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="30" y="65" font-family="sans-serif" font-size="28" font-weight="bold" fill="#000000">NET MRR: $84,500</text>
    <text x="30" y="110" font-family="sans-serif" font-size="20" fill="#333333">Annualized Run Rate: $1.01M</text>
  </svg>`;
  
  const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const base64Data = `data:image/png;base64,${imgBuffer.toString('base64')}`;

  console.log('3. Sending POST /api/ocr request with test image...');
  const ocrRes = await fetch('http://localhost:3001/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64Data }),
  });

  const ocrData = await ocrRes.json();
  console.log('OCR Response:', ocrData);

  if (ocrData.text && ocrData.text.includes('NET MRR')) {
    console.log('✅ OCR LIVE API TEST PASSED!');
  } else {
    console.error('❌ OCR verification failed or incomplete output.');
  }
}

verifyLiveApi().catch(console.error);
