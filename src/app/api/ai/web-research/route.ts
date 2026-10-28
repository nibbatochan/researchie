import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { aiErrorResponse } from '@/lib/ai/userAi';
import { loadWebKey } from '@/lib/ai/webKeyStore';
import { searchWeb, type WebEffort } from '@/lib/ai/webResearch';

// Web research: asks Perplexity with web search on. Answers come from the open web, not the project's clips.
// Tester deployment: the signed-in user's own Perplexity key. Local development: PERPLEXITY_API_KEY from .env.local.

const CORS = { 'Access-Control-Allow-Origin': '*' };
const MAX_QUERY_CHARS = 1000;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  let apiKey: string | null;
  let effort: WebEffort = 'fast';
  if (AUTH_REQUIRED) {
    const saved = await loadWebKey(auth.user.id);
    apiKey = saved?.apiKey ?? null;
    effort = saved?.effort ?? 'fast';
  } else {
    apiKey = process.env.PERPLEXITY_API_KEY?.trim() || null;
  }
  if (!apiKey) {
    return NextResponse.json(
      { success: false, code: 'NO_KEY', error: 'Add your Perplexity key in Settings to search the web.' },
      { status: 402, headers: CORS }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400, headers: CORS });
    }
    if (query.length > MAX_QUERY_CHARS) {
      return NextResponse.json({ success: false, error: `Keep the question under ${MAX_QUERY_CHARS} characters.` }, { status: 400, headers: CORS });
    }

    const result = await searchWeb(apiKey, query, { effort });
    return NextResponse.json({ success: true, data: result }, { headers: CORS });
  } catch (error) {
    const keyResponse = aiErrorResponse(error);
    if (keyResponse) return keyResponse;
    console.warn('Web research failed:', error);
    return NextResponse.json(
      { success: false, error: 'Web search is not available right now. Try again in a minute.' },
      { status: 503, headers: CORS }
    );
  }
}
