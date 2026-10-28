import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { sharing } from '@/lib/data/sharingStore';

// The notification box next to Settings. Browser sessions only (an extension token has no use for it), and only on
// the accounts deployment: locally there is one user and nothing to be told.
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: true, local: true, data: [], unread: 0 }, { headers: NO_STORE });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { items, unread } = await sharing.notifications.list(auth.user.id);
  return NextResponse.json({ success: true, data: items, unread }, { headers: NO_STORE });
}

// action: "read-all" marks everything read; "clear" removes every notification.
export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: true, local: true }, { headers: NO_STORE });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (body.action === 'read-all') await sharing.notifications.markAllRead(auth.user.id);
  else if (body.action === 'clear') await sharing.notifications.clearAll(auth.user.id);
  else return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}

// Removes one notification: DELETE /api/notifications?id=...
export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: true, local: true }, { headers: NO_STORE });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ success: false, error: 'id is required.' }, { status: 400, headers: NO_STORE });
  const ok = await sharing.notifications.dismiss(auth.user.id, id);
  return ok
    ? NextResponse.json({ success: true }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404, headers: NO_STORE });
}
