import { createClient } from '@supabase/supabase-js';

// Server-only Admin Client with Service Role Key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// With accounts on, a missing service key must not fall back to the anon key: every admin call would then run with
// the wrong permissions and fail in odd ways. Using the client without the key throws instead (build time is not affected).
export const supabaseAdmin: typeof client =
  process.env.AUTH_REQUIRED === 'true' && !serviceKey
    ? new Proxy(client, {
        get() {
          throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
        },
      })
    : client;
