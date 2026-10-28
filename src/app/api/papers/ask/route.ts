import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { resolveAI, aiErrorResponse } from '@/lib/ai/userAi';
import { AIServiceBusyError } from '@/lib/ai/types';
import { searchPapersResult, type OpenAlexStatus, type PaperHit } from '@/lib/research/openalex';
import { loadOpenAlexKey } from '@/lib/research/openalexKeyStore';

// Answers a question from research abstracts found on OpenAlex. Only titles and abstracts are used; the answer
// says so. It never reads the user's clips, so clip answers stay on /api/ai/qna.

const MAX_PAPERS = 5;
const MAX_QUESTION_CHARS = 500;
const HEADERS = { 'Access-Control-Allow-Origin': '*' };

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

function formatPapers(papers: PaperHit[]): string {
  return papers
    .map((p, i) => {
      const meta = [p.year ? String(p.year) : null, p.doi ? `doi:${p.doi}` : null].filter(Boolean).join(', ');
      return `[P${i + 1}] ${p.title}${meta ? ` (${meta})` : ''}\nAbstract: ${p.abstract}`;
    })
    .join('\n\n');
}

// What the user sees when there is no answer to give. Each reason says what to do next.
const NO_ANSWER: Record<Exclude<OpenAlexStatus, 'ok'>, string> = {
  empty: 'No research abstracts were found for this question. Try different words.',
  invalid_key: 'OpenAlex rejected your key. Replace it in Settings, or remove it to search without a key.',
  rate_limited: 'OpenAlex search limit reached for today. Add your own OpenAlex key in Settings for a larger allowance.',
  unreachable: 'OpenAlex did not respond. Try again in a moment.',
};

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const resolved = await resolveAI(auth.user);
  if (resolved.response) return resolved.response;

  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION_CHARS) : '';
    if (!question) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400, headers: HEADERS });
    }

    // The user's own key on the tester deployment; OPENALEX_API_KEY locally; keyless when neither is set.
    const apiKey = (await loadOpenAlexKey(auth.user?.id ?? null, AUTH_REQUIRED)) ?? undefined;
    const keyless = !apiKey;
    const { hits: papers, status } = await searchPapersResult(question, { apiKey, limit: MAX_PAPERS });

    if (papers.length === 0) {
      // Keyless calls share one small daily budget, so say so when that is the reason.
      const reason = status === 'rate_limited' && keyless ? NO_ANSWER.rate_limited : NO_ANSWER[status === 'ok' ? 'empty' : status];
      return NextResponse.json(
        { success: true, data: { answer: reason, basis: 'none', papersStatus: status, keyless, papers: [] } },
        { headers: HEADERS }
      );
    }

    const instructed = `User question: ${question}

Answer only from the abstracts above. Each abstract is labelled [P1], [P2] and so on. Cite the label for every claim you make, for example [P2]. An abstract is a summary, not the full paper, so say when a detail is not in the abstracts. If the abstracts do not answer the question, say that it is not found.`;

    const result = await resolved.ai.askPageQuestion(formatPapers(papers), instructed);

    return NextResponse.json(
      {
        success: true,
        data: {
          answer: result.answer,
          // The basis of the answer: abstracts only, never full text.
          basis: 'abstracts',
          papersStatus: status,
          keyless,
          papers: papers.map((p, i) => ({
            label: `P${i + 1}`,
            title: p.title,
            year: p.year,
            doi: p.doi,
            url: p.url,
            citedBy: p.citedBy,
          })),
          model: result.model,
        },
      },
      { headers: HEADERS }
    );
  } catch (error: any) {
    const keyResponse = aiErrorResponse(error);
    if (keyResponse) return keyResponse;
    if (error instanceof AIServiceBusyError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503, headers: HEADERS });
    }
    console.error('Failed to answer from paper abstracts:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to answer from paper abstracts' },
      { status: 500, headers: HEADERS }
    );
  }
}
