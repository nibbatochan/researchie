import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// The login session is kept in cookies that page scripts cannot read (httpOnly). Only server routes
// talk to Supabase Auth, so the browser never needs to read them.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, any> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS, maxAge: options?.maxAge })
            );
          } catch {
            // Ignored when called from Server Components
          }
        },
      },
    }
  );
}
