-- ==============================================================================
-- 003_notion_token.sql: each user's Notion integration token, kept encrypted on the server (S-46).
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run twice.
-- Use the TESTERS project, the same one as 001 and 002.
-- ==============================================================================

-- Same pattern as user_ai_keys: the server encrypts the token (AES-256-GCM, bound to the user id) before it is
-- stored. No client can read this table; there are deliberately no policies for it.
CREATE TABLE IF NOT EXISTS public.user_notion_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  token_last4 TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_notion_tokens ENABLE ROW LEVEL SECURITY;
