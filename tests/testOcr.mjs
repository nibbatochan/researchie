import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

async function test() {
  console.log('Generating test image with sharp...');
  // Create an SVG with text "Q3 REVENUE: $14.2M (+34% YoY)" and render to PNG
  const svg = `<svg width="400" height="150" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="20" y="60" font-family="sans-serif" font-size="28" font-weight="bold" fill="#000000">Q3 REVENUE: $14.2M</text>
    <text x="20" y="100" font-family="sans-serif" font-size="20" fill="#333333">+34% YoY Growth Target</text>
  </svg>`;
  
  const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  console.log('PNG buffer created, size:', imgBuffer.length);

  console.log('Starting OCR worker...');
  const worker = await createWorker('eng');
  
  const preprocessed = await sharp(imgBuffer)
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();

  console.log('Recognizing...');
  const { data: { text, confidence } } = await worker.recognize(preprocessed);
  console.log('Result:', { text: text.trim(), confidence });

  await worker.terminate();
  console.log('Done!');
}

test().catch(console.error);
