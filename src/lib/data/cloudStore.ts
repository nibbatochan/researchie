import { supabaseAdmin } from '@/lib/supabase/admin';
import { makeCloud } from './cloud';

// The per-user store the API routes use when AUTH_REQUIRED=true.
export const cloud = makeCloud(supabaseAdmin);
