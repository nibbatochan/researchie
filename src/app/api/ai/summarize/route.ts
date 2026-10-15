import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { resolveAI, aiErrorResponse } from '@/lib/ai/userAi';
import { parseSummaryMode } from '@/lib/ai/summaryPrompt';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const resolved = await resolveAI(auth.user);
  if (resolved.response) return resolved.response;
  const ai = resolved.ai;
  try {
    const body = await request.json();
    const { pageText, pageTitle } = body;

    if (!pageText || typeof pageText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'pageText string is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const result = await ai.summarizePage(pageText, pageTitle || body.title || 'Web Article', parseSummaryMode(body.mode));

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    const keyResponse = aiErrorResponse(error);
    if (keyResponse) return keyResponse;
    return NextResponse.json(
      { success: false, error: 'Failed to summarize page context' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
