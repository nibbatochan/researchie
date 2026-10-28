import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { isPublicHttpUrl } from '@/lib/security/publicUrl';
import { extractTextFromImage } from '@/lib/ocr/ocrService';

// OCR can take longer than the default function time on a cold start (it fetches language data once).
export const maxDuration = 60;

// We can limit concurrency or process immediately
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { imageUrl, imageBase64 } = body;

    const source = imageBase64 || imageUrl;
    if (!source) {
      return NextResponse.json({ error: 'Missing imageUrl or imageBase64' }, { status: 400 });
    }

    // In the tester deployment the server only reads image data or public https images, never its own network.
    if (AUTH_REQUIRED) {
      const ok = typeof source === 'string' && (/^data:image\//i.test(source) || (/^https:\/\//i.test(source) && isPublicHttpUrl(source)));
      if (!ok) {
        return NextResponse.json({ error: 'Only image data or public https image links are accepted' }, { status: 400 });
      }
    }

    const { text, confidence, error } = await extractTextFromImage(source);
    
    return NextResponse.json({ text, confidence, ...(error ? { error } : {}) });
  } catch (error) {
    console.error('API OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
