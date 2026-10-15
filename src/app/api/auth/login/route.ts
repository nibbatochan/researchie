import { NextResponse } from 'next/server';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateCredentials } from '@/lib/auth/tokens';

export async function POST(request: Request) {
  if (!AUTH_REQUIRED) return NextResponse.json({ success: false, error: 'Accounts are off in this mode.', code: 'AUTH_DISABLED' }, { status: 404 });
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    // Only the shape is checked here. Whether the password is right is Supabase's call.
    if (!email || !password || email.length > 254 || password.length > 200) {
      return NextResponse.json({ success: false, error: 'Enter your email and password.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === 'email_not_confirmed') {
        return NextResponse.json({ success: false, error: 'Confirm your email first: open the link we sent you.', code: 'EMAIL_NOT_CONFIRMED' }, { status: 401 });
      }
      if (error.code === 'over_request_rate_limit') {
        return NextResponse.json({ success: false, error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });
      }
      // One message for a wrong password and an unknown email, so it cannot be used to find accounts.
      return NextResponse.json({ success: false, error: 'Email or password is incorrect.' }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not log in.' }, { status: 500 });
  }
}
