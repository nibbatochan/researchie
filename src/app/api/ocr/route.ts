import { NextResponse } from 'next/server';
import { extractTextFromImage } from '@/lib/ocr/ocrService';

// We can limit concurrency or process immediately
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, imageBase64 } = body;

    const source = imageBase64 || imageUrl;
    if (!source) {
      return NextResponse.json({ error: 'Missing imageUrl or imageBase64' }, { status: 400 });
    }

    const { text, confidence } = await extractTextFromImage(source);
    
    return NextResponse.json({ text, confidence });
  } catch (error) {
    console.error('API OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
