import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/service';

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

    const formatInstruction = `\n\nINSTRUCTIONS: Summarize the following clearly structured markdown. Use headings (##, ###), bold key concepts, bulleted takeaways, and concise language. Ensure scannability.`;
    const result = await aiService.summarizePage(pageText + formatInstruction, pageTitle || 'Web Article');

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
