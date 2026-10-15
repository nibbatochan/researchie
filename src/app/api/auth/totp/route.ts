import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkTotp, newTotpSecret, totpUri } from '@/lib/auth/totp';

// The authenticator-app code that confirms deleting the account (S-43). Set up once in Settings:
//   GET  -> whether it is set up
//   POST -> make a secret (not yet active) and return the address to add to the app
//   PUT  -> the first code from the app turns it on
// Signed-in browser sessions only; an extension token cannot change it.

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { data } = await supabaseAdmin.from('user_mfa').select('enabled').eq('user_id', auth.user.id).maybeSingle();
  return NextResponse.json({ success: true, enabled: Boolean(data?.enabled) });
}

export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  if (!auth.user.email) return NextResponse.json({ success: false, error: 'Sign in again to set this up.' }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from('user_mfa').select('enabled').eq('user_id', auth.user.id).maybeSingle();
  if (existing?.enabled) {
    return NextResponse.json({ success: false, error: 'The authenticator app is already set up.', code: 'ALREADY_ENABLED' }, { status: 409 });
  }

  const secret = newTotpSecret();
  const { error } = await supabaseAdmin
    .from('user_mfa')
    .upsert({ user_id: auth.user.id, secret, enabled: false, created_at: new Date().toISOString(), enabled_at: null }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ success: false, error: 'Could not start the set-up. Try again.' }, { status: 500 });

  return NextResponse.json({ success: true, secret, uri: totpUri(auth.user.email, secret) });
}

export async function PUT(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { data: row } = await supabaseAdmin.from('user_mfa').select('secret, enabled').eq('user_id', auth.user.id).maybeSingle();
  if (!row) return NextResponse.json({ success: false, error: 'Start the set-up first.' }, { status: 409 });
  if (row.enabled) return NextResponse.json({ success: true, enabled: true });
  if (!checkTotp(row.secret, body.code)) {
    return NextResponse.json({ success: false, error: 'That code is not right. Check the app and try the current code.' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('user_mfa')
    .update({ enabled: true, enabled_at: new Date().toISOString() })
    .eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ success: false, error: 'Could not turn it on. Try again.' }, { status: 500 });
  return NextResponse.json({ success: true, enabled: true });
}
