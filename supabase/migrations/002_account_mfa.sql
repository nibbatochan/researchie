-- ==============================================================================
-- 002_account_mfa.sql: the authenticator-app secret used to confirm deleting an account (S-43).
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run twice.
-- Use the TESTERS project, the same one as 001.
-- ==============================================================================

-- One row per user. The secret is kept as the server needs it to check codes; no client can read it.
CREATE TABLE IF NOT EXISTS public.user_mfa (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  enabled_at TIMESTAMPTZ
);

-- RLS on with no policies: only the server (service role) reads or writes this table.
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
