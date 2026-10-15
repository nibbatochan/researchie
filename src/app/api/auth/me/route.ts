import { NextResponse } from 'next/server';
import { AUTH_REQUIRED } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// What the web app asks on load: is sign-in required here, and who is signed in.
export async function GET() {
  // inviteRequired tells the sign-up form to ask for the invite code (SIGNUP_INVITE_CODE is set).
  const inviteRequired = Boolean(process.env.SIGNUP_INVITE_CODE?.trim());
  if (!AUTH_REQUIRED) return NextResponse.json({ authRequired: false, inviteRequired: false, user: null });
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return NextResponse.json({ authRequired: true, inviteRequired, user: null });
    const u = data.user;
    return NextResponse.json({
      authRequired: true,
      inviteRequired,
      user: {
        id: u.id,
        email: u.email ?? '',
        name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Researcher',
        avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || undefined,
        provider: u.app_metadata?.provider || 'email',
        createdAt: u.created_at,
      },
    });
  } catch {
    return NextResponse.json({ authRequired: true, inviteRequired, user: null });
  }
}
