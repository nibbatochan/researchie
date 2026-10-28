import { NextResponse } from 'next/server';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isCrossSiteWrite } from '@/lib/auth/tokens';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revokeExtensionTokens } from '@/lib/auth/revoke';

// Ends this browser's session, switches off the account's extension tokens, and removes the cookies. 'local' leaves the user's other devices signed in;
// { everywhere: true } signs out all of them.
export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: true });
  if (isCrossSiteWrite(request.method, request.headers.get('origin'), request.headers.get('host'))) {
    return NextResponse.json({ success: false, error: 'Not allowed.' }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = await createServerSupabaseClient();
    // Signing out also switches off this account's Chrome extension tokens (S-120). Read who it is first.
    const { data: who } = await supabase.auth.getUser();
    if (who?.user) {
      const ok = await revokeExtensionTokens(supabaseAdmin, who.user.id);
      if (!ok) console.warn('Sign-out: could not revoke extension tokens for', who.user.id);
    }
    await supabase.auth.signOut({ scope: body?.everywhere ? 'global' : 'local' });
  } catch {
    // The cookies are cleared below either way.
  }
  const res = NextResponse.json({ success: true });
  // Belt and braces: expire any Supabase cookie still on the request.
  for (const cookie of request.headers.get('cookie')?.split(';') ?? []) {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('sb-')) res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return res;
}
