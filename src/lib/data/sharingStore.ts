import { supabaseAdmin } from '@/lib/supabase/admin';
import { cloud } from './cloudStore';
import { makeSharing } from './sharing';

// Members and invitations for the accounts deployment (S-54). Not used when AUTH_REQUIRED is off.
export const sharing = makeSharing(supabaseAdmin, cloud.roleOn);
