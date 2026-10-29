import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isCrossSiteWrite } from '@/lib/auth/tokens';
import { makeFailureLimiter } from '@/lib/auth/rateLimit';

// Sets a new password. A session alone is not enough: a stolen session cookie would otherwise be a full account
// takeover. The person either came in through a reset link a moment ago (/auth/callback leaves the rs_reset cookie
// for them), or sends their current password, which is checked here.
const RESET_COOKIE = 'rs_reset';
const wrongPassword = makeFailureLimiter(5, 15 * 60_000);

export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.' }, { status: 404 });
  if (isCrossSiteWrite(request.method, request.headers.get('origin'), request.headers.get('host'))) {
    return NextResponse.json({ success: false, error: 'Not allowed.' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ success: false, error: 'Use at least 8 characters.' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      return NextResponse.json({ success: false, error: 'This link has expired. Ask for a new reset link.' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const fromResetLink = cookieStore.get(RESET_COOKIE)?.value === user.id;
    if (!fromResetLink) {
      const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      if (!current || current.length > 200 || !user.email) {
        return NextResponse.json({ success: false, code: 'CURRENT_PASSWORD_REQUIRED', error: 'Enter your current password, or use a reset link.' }, { status: 403 });
      }
      if (wrongPassword.blocked(user.id)) {
        return NextResponse.json({ success: false, error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 });
      }
      // A separate client with no stored session, so checking the password does not touch the real one.
      const checker = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: checkError } = await checker.auth.signInWithPassword({ email: user.email, password: current });
      if (checkError) {
        wrongPassword.fail(user.id);
        return NextResponse.json({ success: false, code: 'CURRENT_PASSWORD_WRONG', error: 'Your current password is not right.' }, { status: 403 });
      }
      wrongPassword.reset(user.id);
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return NextResponse.json({ success: false, error: 'The password could not be changed. Try again.' }, { status: 400 });
    const res = NextResponse.json({ success: true });
    res.cookies.set(RESET_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'The password could not be changed. Try again.' }, { status: 500 });
  }
}
