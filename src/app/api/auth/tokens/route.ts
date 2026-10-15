import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateExtensionToken } from '@/lib/auth/tokens';

// Extension tokens are managed from the signed-in web app only (never with a token), so a leaked token
// cannot mint more tokens.
const MAX_ACTIVE_TOKENS = 5;

function off() {
  return NextResponse.json({ success: false, error: 'Extension tokens need accounts, which are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
}

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { data, error } = await supabaseAdmin
    .from('extension_tokens')
    .select('id, label, created_at, last_used_at')
    .eq('user_id', auth.user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ success: false, error: 'Could not load tokens.' }, { status: 500 });
  return NextResponse.json({
    success: true,
    data: (data ?? []).map((t) => ({ id: t.id, label: t.label, createdAt: t.created_at, lastUsedAt: t.last_used_at })),
  });
}

export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { count } = await supabaseAdmin
    .from('extension_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .is('revoked_at', null);
  if ((count ?? 0) >= MAX_ACTIVE_TOKENS) {
    return NextResponse.json({ success: false, error: `You can have ${MAX_ACTIVE_TOKENS} active tokens. Revoke one first.` }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 60) : 'Chrome extension';
  const { token, hash } = generateExtensionToken();
  const { data, error } = await supabaseAdmin
    .from('extension_tokens')
    .insert({ user_id: auth.user.id, token_hash: hash, label })
    .select('id, label, created_at')
    .single();
  if (error || !data) return NextResponse.json({ success: false, error: 'Could not create a token.' }, { status: 500 });
  // The only time the token is shown. Only its hash is stored.
  return NextResponse.json({ success: true, token, data: { id: data.id, label: data.label, createdAt: data.created_at } }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Token id is required.' }, { status: 400 });
  const { error } = await supabaseAdmin
    .from('extension_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ success: false, error: 'Could not revoke the token.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
