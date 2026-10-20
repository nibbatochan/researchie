import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { resolveAI, aiErrorResponse } from '@/lib/ai/userAi';
import { AIServiceBusyError } from '@/lib/ai/types';
import { buildDraftPrompt, parseDraftResponse, countClips, MAX_CLIPS_PER_DRAFT, type DraftInput } from '@/lib/paper/draft';

// Drafts one section of a paper from the clips placed under it. One model call per request, and the model
// sees only the clips sent here. Every sentence comes back checked against its clips (see lib/paper/draft.ts).

const MAX_CLIP_TEXT = 5000;
const KINDS = ['quote', 'ai-summary', 'mine'];

function readInput(body: any): DraftInput | string {
  if (!body || typeof body !== 'object') return 'Send the section to draft.';
  if (typeof body.sectionTitle !== 'string' || !Array.isArray(body.parts)) return 'Send the section title and its parts.';
  const parts: DraftInput['parts'] = [];
  for (const p of body.parts) {
    if (!p || typeof p.id !== 'string' || typeof p.title !== 'string' || !Array.isArray(p.clips)) return 'Each part needs an id, a title and its clips.';
    const clips = [];
    for (const c of p.clips) {
      if (!c || typeof c.id !== 'string' || typeof c.text !== 'string' || !KINDS.includes(c.kind)) return 'Each clip needs an id, text and a kind.';
      clips.push({ id: c.id, kind: c.kind, text: c.text.slice(0, MAX_CLIP_TEXT) });
    }
    parts.push({ id: p.id, title: p.title.slice(0, 200), clips });
  }
  return {
    sectionTitle: body.sectionTitle.slice(0, 200),
    sectionHint: typeof body.sectionHint === 'string' ? body.sectionHint.slice(0, 300) : '',
    point: typeof body.point === 'string' ? body.point.slice(0, 500) : '',
    parts,
  };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const resolved = await resolveAI(auth.user);
  if (resolved.response) return resolved.response;
  const ai = resolved.ai;

  try {
    const input = readInput(await request.json());
    if (typeof input === 'string') return NextResponse.json({ success: false, error: input }, { status: 400 });

    const total = countClips(input);
    if (total === 0) return NextResponse.json({ success: false, error: 'Place at least one clip under a part first.' }, { status: 400 });
    if (total > MAX_CLIPS_PER_DRAFT) {
      return NextResponse.json({ success: false, error: `This section has ${total} clips. Draft up to ${MAX_CLIPS_PER_DRAFT} at a time: move some to another section or part.` }, { status: 400 });
    }
    if (!ai.completeJson) {
      return NextResponse.json({ success: false, error: 'No AI model is set up. Add your Groq key in Settings.' }, { status: 503 });
    }

    const prompt = buildDraftPrompt(input);
    const raw = await ai.completeJson(prompt.system, prompt.user, 900);
    const sentences = parseDraftResponse(raw, input, prompt.aliasToId);
    if (!sentences || sentences.length === 0) {
      return NextResponse.json({ success: false, error: 'The model did not return a usable draft. Try again.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, data: { sentences, generatedAt: new Date().toISOString() } });
  } catch (error: any) {
    const keyResponse = aiErrorResponse(error);
    if (keyResponse) return keyResponse;
    if (error instanceof AIServiceBusyError || error?.sawRateLimit || error?.sawTooLarge) {
      return NextResponse.json({ success: false, error: 'The AI service is busy or the free limit is used up for now. Try again in a minute.' }, { status: 503 });
    }
    console.error('Failed to draft section:', error);
    return NextResponse.json({ success: false, error: 'Could not draft this section.' }, { status: 500 });
  }
}
