import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { papers } from '@/lib/data/papersStore';

// The Paper Mode workspace: list, create, and the actions that act on a paper by id.
// Browser sessions only (an extension token has no use for it). A paper is private to its owner.
const NO_STORE = { 'Cache-Control': 'no-store' };
const STATUS = { NOT_FOUND: 404, INVALID: 400, TOO_LARGE: 413, CONFLICT: 409 } as const;

const reply = (r: { ok: true; value: unknown } | { ok: false; code: keyof typeof STATUS; reason: string }, okStatus = 200) =>
  r.ok
    ? NextResponse.json({ success: true, data: r.value }, { status: okStatus, headers: NO_STORE })
    : NextResponse.json({ success: false, error: r.reason, code: r.code }, { status: STATUS[r.code], headers: NO_STORE });

// GET /api/papers lists papers (newest edit first, no document body). ?trash=1 lists the trash.
export async function GET(request: Request) {
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const trash = new URL(request.url).searchParams.get('trash') === '1';
  return NextResponse.json({ success: true, data: await papers.list(auth.user.id, { trash }) }, { headers: NO_STORE });
}

// POST { title?, templateId?, citationStyle?, projectId?, doc?, meta? } creates a paper.
// POST { action: 'duplicate' | 'restore' | 'purge', id } acts on an existing one; { action: 'purge_trash' } empties the trash.
export async function POST(request: Request) {
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const userId = auth.user.id;

  if (body.action === 'purge_trash') {
    return NextResponse.json({ success: true, data: { removed: await papers.purgeTrash(userId) } }, { headers: NO_STORE });
  }

  if (body.action) {
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ success: false, error: 'id is required.' }, { status: 400, headers: NO_STORE });
    if (body.action === 'duplicate') return reply(await papers.duplicate(userId, id), 201);
    if (body.action === 'restore' || body.action === 'purge') {
      const done = body.action === 'restore' ? await papers.restore(userId, id) : await papers.purge(userId, id);
      return done
        ? NextResponse.json({ success: true }, { headers: NO_STORE })
        : NextResponse.json({ success: false, error: 'Paper not found.' }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400, headers: NO_STORE });
  }

  return reply(await papers.create(userId, body), 201);
}
