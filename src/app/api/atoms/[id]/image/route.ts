import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { store } from '@/lib/data/store';
import { isPlainId } from '@/lib/security/inputChecks';

// The picture of an image clip that is stored inside the clip as base64 text, served as a normal image so the browser can
// cache it. Only PNG, JPEG, GIF and WebP are served (an SVG could carry script), and the response may not run anything.
const IMAGE = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\s]+)$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!isPlainId(id)) return new NextResponse('Not found', { status: 404 });
  try {
    const atom = await store.getAtom(auth.user.id, id);
    const url = atom?.content?.imageUrl;
    const match = typeof url === 'string' ? IMAGE.exec(url) : null;
    if (!match) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(Buffer.from(match[2].replace(/\s/g, ''), 'base64'), {
      headers: {
        'Content-Type': match[1].toLowerCase(),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
