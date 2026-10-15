import { NextResponse } from 'next/server';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth/redirect';

// Starts "Continue with Google" (S-45). It runs on the server so the PKCE verifier is kept in an httpOnly cookie,
// like the session. If an invite code is needed to sign up, the one typed on the sign-in page travels in a short
// httpOnly cookie to the callback, which checks it for a brand-new account. Google has to be set up first in
// Supabase: see docs/GOOGLE_SIGNIN_SETUP.md.
const INVITE_COOKIE = 'rs_invite';

export async function GET(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const invite = (url.searchParams.get('invite') || '').trim().slice(0, 200);

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return NextResponse.redirect(`${url.origin}/login?error=google`);

    const res = NextResponse.redirect(data.url);
    if (invite) res.cookies.set(INVITE_COOKIE, invite, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
    else res.cookies.set(INVITE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(`${url.origin}/login?error=google`);
  }
}
