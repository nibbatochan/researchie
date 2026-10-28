import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sealSecret, lastFour } from '@/lib/ai/keyVault';
import { cleanKeyInput } from '@/lib/ai/providers';
import { checkOpenAlexKey } from '@/lib/research/openalex';

// Bring-your-own OpenAlex key for paper search. Same rules as the other key routes: checked once with one small
// call, encrypted with AES-256-GCM, never sent back to the browser (only the last four characters), never logged.

const NO_STORE = { 'Cache-Control': 'no-store' };

function off() {
  return NextResponse.json(
    { success: false, error: 'Personal OpenAlex keys are used on the tester deployment. Locally the server uses OPENALEX_API_KEY from .env.local.', code: 'AUTH_DISABLED' },
    { status: 404, headers: NO_STORE }
  );
}

async function readRow(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_openalex_keys')
    .select('key_last4, status, last_checked_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

function view(row: any) {
  if (!row) return { configured: false };
  return { configured: true, provider: 'openalex', last4: row.key_last4, status: row.status, lastCheckedAt: row.last_checked_at };
}

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  return NextResponse.json({ success: true, data: view(await readRow(auth.user.id)) }, { headers: NO_STORE });
}

// Save (or replace) the key after a check.
export async function PUT(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    const cleaned = cleanKeyInput(body.key);
    if (!cleaned.ok) return NextResponse.json({ success: false, error: cleaned.error }, { status: 400, headers: NO_STORE });

    const check = await checkOpenAlexKey(cleaned.key);
    if (check === 'invalid') {
      return NextResponse.json({ success: false, code: 'INVALID_KEY', error: 'OpenAlex rejected this key. Copy it again from your OpenAlex account settings.' }, { status: 400, headers: NO_STORE });
    }
    if (check === 'unreachable') {
      return NextResponse.json({ success: false, error: 'Could not reach OpenAlex to check the key. Try again in a moment.' }, { status: 502, headers: NO_STORE });
    }

    let sealed;
    try {
      sealed = sealSecret(cleaned.key, auth.user.id);
    } catch {
      console.error('OpenAlex key save failed: server encryption secret is not configured');
      return NextResponse.json({ success: false, error: 'The server is not set up to store keys yet. Tell the person running it.' }, { status: 500, headers: NO_STORE });
    }

    const { error } = await supabaseAdmin.from('user_openalex_keys').upsert(
      {
        user_id: auth.user.id,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        auth_tag: sealed.authTag,
        key_last4: lastFour(cleaned.key),
        status: 'valid',
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return NextResponse.json({ success: false, error: 'Could not save the key.' }, { status: 500, headers: NO_STORE });

    return NextResponse.json({ success: true, data: view(await readRow(auth.user.id)) }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not save the key.' }, { status: 500, headers: NO_STORE });
  }
}

// Remove the saved key. Searches then run keyless.
export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { error } = await supabaseAdmin.from('user_openalex_keys').delete().eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ success: false, error: 'Could not remove the key.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true, data: { configured: false } }, { headers: NO_STORE });
}
