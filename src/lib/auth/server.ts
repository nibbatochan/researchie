import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashToken, isCrossSiteWrite, readBearerToken } from './tokens';

// AUTH_REQUIRED=true is the tester deployment: every data route needs a signed-in user and data lives in
// Supabase, one owner per row. Unset (local development, the e2e suite) the app behaves as it always did,
// as a single local user with the file store.
export const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';
export const LEGACY_USER_ID = 'user-01';

export interface AuthedUser {
  id: string;
  email?: string;
  /** How the request proved who it is. 'legacy' = AUTH_REQUIRED is off. */
  via: 'cookie' | 'token' | 'legacy';
}

export type AuthResult = { user: AuthedUser; response?: undefined } | { user?: undefined; response: NextResponse };

function json(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

/** The signed-in user for this request, or null. Never throws. */
export async function getRequestUser(request: Request, opts: { allowToken?: boolean } = {}): Promise<AuthedUser | null> {
  const allowToken = opts.allowToken !== false;

  const bearer = readBearerToken(request.headers.get('authorization'));
  if (bearer) {
    if (!allowToken) return null;
    try {
      const { data } = await supabaseAdmin
        .from('extension_tokens')
        .select('id, user_id')
        .eq('token_hash', hashToken(bearer))
        .is('revoked_at', null)
        .maybeSingle();
      if (!data) return null;
      // Not awaited: a slow write must not slow the request.
      void supabaseAdmin.from('extension_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {});
      return { id: data.user_id, via: 'token' };
    } catch {
      return null;
    }
  }

  try {
    if (isCrossSiteWrite(request.method, request.headers.get('origin'), request.headers.get('host'))) return null;
    const supabase = await createServerSupabaseClient();
    // getUser() asks the auth server to check the session, so a forged cookie does not pass.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined, via: 'cookie' };
  } catch {
    return null;
  }
}

/**
 * Gate for a data route. With AUTH_REQUIRED off it always passes as the local user.
 *   const auth = await authorize(request);
 *   if (auth.response) return auth.response;
 */
export async function authorize(request: Request, opts: { allowToken?: boolean } = {}): Promise<AuthResult> {
  if (!AUTH_REQUIRED) return { user: { id: LEGACY_USER_ID, via: 'legacy' } };
  const user = await getRequestUser(request, opts);
  if (!user) return { response: json(401, 'Sign in to continue.', { code: 'UNAUTHENTICATED' }) };
  return { user };
}

/** For routes that do not exist in the tester deployment (the Python graph builder, for example). */
export function unavailableInTesterMode(what: string): NextResponse | null {
  return AUTH_REQUIRED ? json(501, `${what} is not available in this version.`, { code: 'UNAVAILABLE' }) : null;
}
