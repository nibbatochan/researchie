import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sealSecret, lastFour } from '@/lib/ai/keyVault';
import { cleanKeyInput } from '@/lib/ai/providers';
import { checkPerplexityKey, isWebEffort } from '@/lib/ai/webResearch';

// Bring-your-own Perplexity key for web research. Same rules as the AI key route: checked once, encrypted with
// AES-256-GCM, never sent back to the browser (only the last four characters), never logged.

const NO_STORE = { 'Cache-Control': 'no-store' };

function off() {
  return NextResponse.json(
    { success: false, error: 'Personal web research keys are used on the tester deployment. Locally the server uses PERPLEXITY_API_KEY from .env.local.', code: 'AUTH_DISABLED' },
    { status: 404, headers: NO_STORE }
  );
}

async function readRow(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_web_keys')
    .select('key_last4, status, last_checked_at, effort')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

function view(row: any) {
  if (!row) return { configured: false };
  return {
    configured: true,
    provider: 'perplexity',
    last4: row.key_last4,
    status: row.status,
    lastCheckedAt: row.last_checked_at,
    effort: isWebEffort(row.effort) ? row.effort : 'fast',
  };
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
    const effort = isWebEffort(body.effort) ? body.effort : 'fast';

    const check = await checkPerplexityKey(cleaned.key);
    if (check === 'invalid') {
      return NextResponse.json({ success: false, code: 'INVALID_KEY', error: 'Perplexity rejected this key. Copy it again from your Perplexity account.' }, { status: 400, headers: NO_STORE });
    }
    if (check === 'unreachable') {
      return NextResponse.json({ success: false, error: 'Could not reach Perplexity to check the key. Try again in a moment.' }, { status: 502, headers: NO_STORE });
    }

    let sealed;
    try {
      sealed = sealSecret(cleaned.key, auth.user.id);
    } catch {
      console.error('Web key save failed: server encryption secret is not configured');
      return NextResponse.json({ success: false, error: 'The server is not set up to store keys yet. Tell the person running it.' }, { status: 500, headers: NO_STORE });
    }

    const { error } = await supabaseAdmin.from('user_web_keys').upsert(
      {
        user_id: auth.user.id,
        provider: 'perplexity',
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        auth_tag: sealed.authTag,
        key_last4: lastFour(cleaned.key),
        effort,
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

// Remove the saved key.
export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { error } = await supabaseAdmin.from('user_web_keys').delete().eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ success: false, error: 'Could not remove the key.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true, data: { configured: false } }, { headers: NO_STORE });
}
