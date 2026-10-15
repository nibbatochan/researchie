import { NextResponse } from 'next/server';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sealSecret, lastFour } from '@/lib/ai/keyVault';
import { cleanNotionToken } from '@/lib/notion/tokenInput';

// The user's Notion integration token, kept encrypted on the server so it does not have to be pasted at every
// visit. It is checked with Notion, encrypted with AES-256-GCM and stored. It is never sent back to the
// browser (only its last four characters) and never logged. Browser sessions only; an extension token cannot use it.

const NO_STORE = { 'Cache-Control': 'no-store' };

function off() {
  return NextResponse.json(
    { success: false, error: 'A saved Notion token is used on the tester deployment. Locally the token stays in this browser.', code: 'AUTH_DISABLED' },
    { status: 404, headers: NO_STORE },
  );
}

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { data } = await supabaseAdmin.from('user_notion_tokens').select('token_last4, updated_at').eq('user_id', auth.user.id).maybeSingle();
  return NextResponse.json(
    { success: true, data: data ? { configured: true, last4: data.token_last4, updatedAt: data.updated_at } : { configured: false } },
    { headers: NO_STORE },
  );
}

export async function PUT(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const cleaned = cleanNotionToken(body.token);
  if (!cleaned.ok) return NextResponse.json({ success: false, error: cleaned.error }, { status: 400, headers: NO_STORE });

  // Ask Notion who the token belongs to. Only a clear "no" (401) stops the save; if Notion cannot be reached the
  // token is saved and the person finds out at the next export.
  try {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: { Authorization: `Bearer ${cleaned.token}`, 'Notion-Version': '2022-06-28' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      return NextResponse.json(
        { success: false, code: 'INVALID_TOKEN', error: 'Notion rejected this token. Copy it again from notion.so/my-integrations.' },
        { status: 400, headers: NO_STORE },
      );
    }
  } catch {
    // not reachable: save anyway
  }

  try {
    const sealed = sealSecret(cleaned.token, auth.user.id);
    const { error } = await supabaseAdmin.from('user_notion_tokens').upsert(
      {
        user_id: auth.user.id,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        auth_tag: sealed.authTag,
        token_last4: lastFour(cleaned.token),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;
  } catch {
    return NextResponse.json({ success: false, error: 'Could not save the token. Try again.' }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ success: true, data: { configured: true, last4: lastFour(cleaned.token) } }, { headers: NO_STORE });
}

export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return off();
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const { error } = await supabaseAdmin.from('user_notion_tokens').delete().eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ success: false, error: 'Could not remove the token. Try again.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true, data: { configured: false } }, { headers: NO_STORE });
}
