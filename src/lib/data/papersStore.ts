import { AUTH_REQUIRED } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cloud } from './cloudStore';
import { makePapers } from './papers';
import { makeLocalPapers } from './papersLocal';

// The papers store the API routes use: the account database on the tester site, a local file otherwise.
export const papers = AUTH_REQUIRED ? makePapers(supabaseAdmin, cloud.roleOn) : makeLocalPapers();
