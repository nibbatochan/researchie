import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorize, AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { makeFailureLimiter } from '@/lib/auth/rateLimit';
import { checkTotp } from '@/lib/auth/totp';

// Deletes the signed-in user's account and everything in it (S-43). Needs three things: the password, a
// current code from the authenticator app, and the word DELETE typed in. Only browser sessions can do this.
//
// Order matters. The user's projects go first: they are not removed with the profile (the database only clears
// their owner). Then the profile, which removes settings, tokens, AI keys, the authenticator secret and
// documents. Then the login itself. If a step fails, the steps before it are already done and cannot be undone.

const codeFailures = makeFailureLimiter(5, 10 * 60 * 1000);

export async function DELETE(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  const auth = await authorize(request, { allowToken: false });
  if (auth.response) return auth.response;
  const userId = auth.user.id;
  const email = auth.user.email;
  if (!email) return NextResponse.json({ success: false, error: 'Sign in again to delete the account.' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ success: false, error: 'Type DELETE to confirm.', code: 'CONFIRM_WORD' }, { status: 400 });
  }

  const { data: mfa } = await supabaseAdmin.from('user_mfa').select('secret, enabled').eq('user_id', userId).maybeSingle();
  if (!mfa?.enabled) {
    return NextResponse.json({ success: false, error: 'Set up the authenticator app first, then come back here.', code: 'SETUP_REQUIRED' }, { status: 409 });
  }

  if (codeFailures.blocked(userId)) {
    return NextResponse.json({ success: false, error: 'Too many wrong codes. Wait ten minutes and try again.', code: 'LOCKED' }, { status: 429 });
  }
  if (!checkTotp(mfa.secret, body.code)) {
    codeFailures.fail(userId);
    return NextResponse.json({ success: false, error: 'The code is not right.', code: 'CODE_WRONG' }, { status: 401 });
  }

  // The password is checked with a client that keeps no session, so this request does not sign anyone in.
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) return NextResponse.json({ success: false, error: 'Enter your password.', code: 'PASSWORD_WRONG' }, { status: 401 });
  const checker = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: pwError } = await checker.auth.signInWithPassword({ email, password });
  if (pwError) {
    return NextResponse.json({ success: false, error: 'The password is not right.', code: 'PASSWORD_WRONG' }, { status: 401 });
  }

  try {
    const { error: atomsError } = await supabaseAdmin.from('atoms').delete().eq('user_id', userId);
    if (atomsError) throw atomsError;
    const { error: docsError } = await supabaseAdmin.from('documents').delete().eq('user_id', userId);
    if (docsError) throw docsError;
    const { error: projectsError } = await supabaseAdmin.from('projects').delete().eq('user_id', userId);
    if (projectsError) throw projectsError;
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profileError) throw profileError;
    const { error: loginError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (loginError) throw loginError;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not finish deleting the account. Some data may already be gone. Contact support before trying again.', code: 'PARTIAL' },
      { status: 500 },
    );
  }

  // Clear this browser's login cookies, as sign-out does.
  const res = NextResponse.json({ success: true });
  for (const cookie of request.headers.get('cookie')?.split(';') ?? []) {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('sb-')) res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return res;
}
