import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/server';
import { papers } from '@/lib/data/papersStore';

// One paper: read it with its document, save changes, or move it to the trash.
const NO_STORE = { 'Cache-Control': 'no-store' };
const STATUS = { NOT_FOUND: 404, INVALID: 400, TOO_LARGE: 413, CONFLICT: 409 } as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { id } = await ctx.params;
  const paper = await papers.get(auth.user.id, id);
  return paper
    ? NextResponse.json({ success: true, data: paper }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Paper not found.' }, { status: 404, headers: NO_STORE });
}

// PATCH { title?, templateId?, citationStyle?, projectId?, doc?, meta?, baseUpdatedAt? } saves the fields given.
// With baseUpdatedAt the save is refused (409) when the paper changed since that time.
export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const { baseUpdatedAt, ...patch } = body;
  const r = await papers.update(auth.user.id, id, patch, typeof baseUpdatedAt === 'string' ? baseUpdatedAt : undefined);
  return r.ok
    ? NextResponse.json({ success: true, data: r.value }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: r.reason, code: r.code }, { status: STATUS[r.code], headers: NO_STORE });
}

// DELETE moves the paper to the trash; POST /api/papers { action: 'restore' } brings it back.
export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { id } = await ctx.params;
  return (await papers.softDelete(auth.user.id, id))
    ? NextResponse.json({ success: true }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Paper not found.' }, { status: 404, headers: NO_STORE });
}
