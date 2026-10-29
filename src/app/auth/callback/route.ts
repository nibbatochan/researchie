import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { inviteCodeMatches } from '@/lib/auth/tokens';
import { isNewAccount, safeNext } from '@/lib/auth/redirect';

// Where Google sends the person back (S-45). The code is exchanged for a session that is stored as the same httpOnly
// cookie email sign-in uses. A brand-new account made through Google must pass the invite code, if one is required,
// exactly as email sign-up does: otherwise Google would be a way around it. Such an account is removed again.
const INVITE_COOKIE = 'rs_invite';
const RESET_COOKIE = 'rs_reset';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));
  const code = searchParams.get('code');

  if (!AUTH_REQUIRED || !code) return NextResponse.redirect(`${origin}/login?error=google`);

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=google`);

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    const cookieStore = await cookies();
    const supplied = cookieStore.get(INVITE_COOKIE)?.value;

    const needed = process.env.SIGNUP_INVITE_CODE;
    if (user && needed?.trim() && isNewAccount(user.created_at, user.last_sign_in_at) && !inviteCodeMatches(supplied, needed)) {
      await supabase.auth.signOut();
      await supabaseAdmin.auth.admin.deleteUser(user.id).catch(() => {});
      const res = NextResponse.redirect(`${origin}/login?error=invite`);
      res.cookies.set(INVITE_COOKIE, '', { path: '/', maxAge: 0 });
      return res;
    }

    const res = NextResponse.redirect(`${origin}${next}`);
    res.cookies.set(INVITE_COOKIE, '', { path: '/', maxAge: 0 });
    // A reset link proves the person owns the email, so /api/auth/password may skip the current password for a
    // short while. The cookie names the user, so it cannot be used for another account.
    if (user && next === '/login/reset') {
      res.cookies.set(RESET_COOKIE, user.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 900 });
    }
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=google`);
  }
}
