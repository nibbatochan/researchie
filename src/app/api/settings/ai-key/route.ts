import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sealSecret, openSecret, lastFour } from '@/lib/ai/keyVault';
import { checkProviderKey, cleanKeyInput, getProvider, isProviderId, type KeyCheckStatus } from '@/lib/ai/providers';

// Bring-your-own AI key. The key is checked with the provider, encrypted with AES-256-GCM and stored
// server-side. It is never sent back to the browser (only its last four characters) and never logged.

const NO_STORE = { 'Cache-Control': 'no-store' };

function off() {
  return NextResponse.json(
    { success: false, error: 'Personal AI keys are used on the tester deployment. Locally the server uses GROQ_API_KEY from .env.local.', code: 'AUTH_DISABLED' },
    { status: 404, headers: NO_STORE }
  );
}

function view(row: any) {
  if (!row) return { configured: false };
  return {
    configured: true,
    provider: row.provider,
    model: row.model || getProvider(row.provider).defaultModel,
    last4: row.key_last4,
    status: row.status,
    lastCheckedAt: row.last_checked_at,
  };
}

async function readRow(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_ai_keys')
    .select('provider, model, key_last4, status, last_checked_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

function messageFor(status: KeyCheckStatus, providerLabel: string): string {
  switch (status) {
    case 'valid':
      return `Connected to ${providerLabel}.`;
    case 'rate_limited':
      return `${providerLabel} accepted the key but its free limit is used up right now. The key is saved.`;
    case 'invalid':
      return `${providerLabel} rejected this key. Copy it again from your provider's key page.`;
    default:
      return `Could not reach ${providerLabel} to check the key. Try again in a moment.`;
  }
}

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  return NextResponse.json({ success: true, data: view(await readRow(auth.user.id)) }, { headers: NO_STORE });
}

// Save (or replace) the key.
export async function PUT(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (!isProviderId(body.provider)) {
      return NextResponse.json({ success: false, error: 'Choose a provider.' }, { status: 400, headers: NO_STORE });
    }
    const provider = getProvider(body.provider);
    const cleaned = cleanKeyInput(body.key);
    if (!cleaned.ok) return NextResponse.json({ success: false, error: cleaned.error }, { status: 400, headers: NO_STORE });
    const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim().slice(0, 120) : provider.defaultModel;
    if (!/^[A-Za-z0-9._:/@+-]+$/.test(model)) {
      return NextResponse.json({ success: false, error: 'That model name has characters it should not.' }, { status: 400, headers: NO_STORE });
    }

    const check = await checkProviderKey(provider, cleaned.key);
    if (check.status === 'invalid') {
      return NextResponse.json({ success: false, code: 'INVALID_KEY', error: messageFor('invalid', provider.label), helpUrl: provider.keysUrl }, { status: 400, headers: NO_STORE });
    }
    if (check.status === 'unreachable') {
      return NextResponse.json({ success: false, error: messageFor('unreachable', provider.label) }, { status: 502, headers: NO_STORE });
    }

    let sealed;
    try {
      sealed = sealSecret(cleaned.key, auth.user.id);
    } catch {
      console.error('AI key save failed: server encryption secret is not configured');
      return NextResponse.json({ success: false, error: 'The server is not set up to store keys yet. Tell the person running it.' }, { status: 500, headers: NO_STORE });
    }

    const { error } = await supabaseAdmin.from('user_ai_keys').upsert(
      {
        user_id: auth.user.id,
        provider: provider.id,
        model,
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

    return NextResponse.json(
      { success: true, message: messageFor(check.status, provider.label), data: view(await readRow(auth.user.id)) },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Could not save the key.' }, { status: 500, headers: NO_STORE });
  }
}

// "Test connection": checks the saved key again.
export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { data: row } = await supabaseAdmin
    .from('user_ai_keys')
    .select('provider, model, key_last4, status, last_checked_at, ciphertext, iv, auth_tag')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ success: false, code: 'NO_KEY', error: 'No key saved yet. Paste one first.' }, { status: 404, headers: NO_STORE });
  }
  const provider = getProvider(row.provider);
  let key: string;
  try {
    key = openSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag }, auth.user.id);
  } catch {
    return NextResponse.json({ success: false, code: 'NO_KEY', error: 'The saved key could not be read. Remove it and paste it again.' }, { status: 409, headers: NO_STORE });
  }
  const check = await checkProviderKey(provider, key);
  if (check.status !== 'unreachable') {
    await supabaseAdmin
      .from('user_ai_keys')
      .update({ status: check.status === 'invalid' ? 'invalid' : 'valid', last_checked_at: new Date().toISOString() })
      .eq('user_id', auth.user.id);
  }
  return NextResponse.json(
    {
      success: check.status === 'valid' || check.status === 'rate_limited',
      status: check.status,
      message: messageFor(check.status, provider.label),
      helpUrl: check.status === 'invalid' ? provider.keysUrl : undefined,
      data: view(await readRow(auth.user.id)),
    },
    { headers: NO_STORE }
  );
}

export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { error } = await supabaseAdmin.from('user_ai_keys').delete().eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ success: false, error: 'Could not remove the key.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true, data: { configured: false } }, { headers: NO_STORE });
}
