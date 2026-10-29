import { NextResponse } from 'next/server';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { makeFailureLimiter } from '@/lib/auth/rateLimit';
import { siteOrigin } from '@/lib/auth/redirect';

// Sends a password-reset link. The reply is the same whether or not the email has an account, so the form cannot be
// used to find out who has one. The link comes back through /auth/callback, which signs the person in and sends them
// to /login/reset to choose a new password.
// Every request counts, not only failures: each one sends an email. Per address and per caller, so one inbox cannot
// be flooded and one caller cannot sweep many inboxes. (Per server instance; see rateLimit.ts.)
const perEmail = makeFailureLimiter(3, 15 * 60_000);
const perCaller = makeFailureLimiter(10, 15 * 60_000);

export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254) return NextResponse.json({ success: false, error: 'Enter your email.' }, { status: 400 });

  const caller = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (perEmail.blocked(email) || perCaller.blocked(caller)) {
    return NextResponse.json({ success: false, error: 'Too many requests. Wait a few minutes and try again.' }, { status: 429 });
  }
  perEmail.fail(email);
  perCaller.fail(caller);

  try {
    const supabase = await createServerSupabaseClient();
    const redirectTo = `${siteOrigin(process.env.NEXT_PUBLIC_SITE_URL, new URL(request.url).origin)}/auth/callback?next=${encodeURIComponent('/login/reset')}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
      return NextResponse.json({ success: false, error: 'Too many requests. Wait a minute and try again.' }, { status: 429 });
    }
    return NextResponse.json({ success: true, message: 'If an account exists for that email, a reset link is on its way.' });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not send the reset link. Try again.' }, { status: 500 });
  }
}
