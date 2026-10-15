import { NextResponse } from 'next/server';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateCredentials } from '@/lib/auth/tokens';

const FRIENDLY: Record<string, string> = {
  user_already_exists: 'An account with this email already exists. Log in instead.',
  email_exists: 'An account with this email already exists. Log in instead.',
  weak_password: 'That password is too easy to guess. Try a longer one.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a while and try again.',
  signup_disabled: 'Sign-ups are turned off.',
};

export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  try {
    const body = await request.json().catch(() => ({}));
    const checked = validateCredentials(body.email, body.password);
    if (!checked.ok) return NextResponse.json({ success: false, error: checked.error }, { status: 400 });
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: checked.email,
      password: checked.password,
      options: { data: { full_name: name || checked.email.split('@')[0] } },
    });
    if (error) {
      const message = FRIENDLY[error.code ?? ''] ?? error.message ?? 'Could not create the account.';
      return NextResponse.json({ success: false, error: message }, { status: error.status && error.status < 500 ? error.status : 400 });
    }
    // With email confirmation off Supabase returns a session and the cookie is already set.
    // With it on there is no session yet: the user must click the link in the email first.
    return NextResponse.json({ success: true, needsConfirmation: !data.session });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not create the account.' }, { status: 500 });
  }
}
