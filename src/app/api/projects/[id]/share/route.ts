import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { sharing } from '@/lib/data/sharingStore';
import type { SharingFailure } from '@/lib/data/sharing';

// Who has access to a project, and the changes the owner makes to that. Browser sessions only: an extension token
// must not be able to change who can see a project. Accounts deployment only; locally there is no sharing.
const NO_STORE = { 'Cache-Control': 'no-store' };

const STATUS: Record<SharingFailure['code'], number> = { NOT_ALLOWED: 403, NOT_FOUND: 404, BAD_EMAIL: 400, BAD_ROLE: 400, SELF: 400 };

function failure(r: SharingFailure) {
  return NextResponse.json({ success: false, error: r.error, code: r.code }, { status: STATUS[r.code], headers: NO_STORE });
}

function off() {
  return NextResponse.json({ success: false, error: 'Sharing is used on the accounts deployment.', code: 'AUTH_DISABLED' }, { status: 404, headers: NO_STORE });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { id } = await ctx.params;
  const result = await sharing.listAccess(auth.user.id, id);
  if (!result.ok) return failure(result);
  return NextResponse.json({ success: true, data: result.access }, { headers: NO_STORE });
}

// One door for the owner's changes, chosen by `action`: invite, role, remove, cancel-invite, link-create, link-revoke, request-approve, request-deny.
export async function POST(request: Request, ctx: Ctx) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'invite': {
      const r = await sharing.invite(auth.user.id, id, body.email, body.role);
      return r.ok ? NextResponse.json({ success: true, kind: r.kind }, { headers: NO_STORE }) : failure(r);
    }
    case 'role': {
      const r = await sharing.setRole(auth.user.id, id, String(body.userId || ''), body.role);
      return r.ok ? NextResponse.json({ success: true }, { headers: NO_STORE }) : failure(r);
    }
    case 'remove': {
      const r = await sharing.removeMember(auth.user.id, id, String(body.userId || ''));
      return r.ok ? NextResponse.json({ success: true }, { headers: NO_STORE }) : failure(r);
    }
    case 'link-create': {
      const r = await sharing.createLink(auth.user.id, id, body.role);
      // The secret is shown once, here. Only its hash is kept.
      return r.ok ? NextResponse.json({ success: true, token: r.token }, { headers: NO_STORE }) : failure(r);
    }
    case 'link-revoke': {
      const r = await sharing.revokeLink(auth.user.id, id);
      return r.ok ? NextResponse.json({ success: true }, { headers: NO_STORE }) : failure(r);
    }
    case 'request-approve': {
      const r = await sharing.decideRequest(auth.user.id, id, String(body.requestId || ''), true, body.role);
      return r.ok ? NextResponse.json({ success: true }, { headers: NO_STORE }) : failure(r);
    }
    case 'request-deny': {
      const r = await sharing.decideRequest(auth.user.id, id, String(body.requestId || ''), false);
      return r.ok ? NextResponse.json({ success: true }, { headers: NO_STORE }) : failure(r);
    }
    case 'cancel-invite': {
      const r = await sharing.cancelInvite(auth.user.id, id, String(body.inviteId || ''));
      return r.ok ? NextResponse.json({ success: true }, { headers: NO_STORE }) : failure(r);
    }
    default:
      return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400, headers: NO_STORE });
  }
}
