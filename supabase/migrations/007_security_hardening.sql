-- ==============================================================================
-- 007_security_hardening.sql: closes gaps found in a review of the row-level security policies.
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run twice.
-- Use the TESTERS project, the same one as 001 to 006.
--
-- The Next.js server uses the service-role key and checks access itself, so none of this changes how the app
-- behaves. It protects against someone using the public anon key and their own login directly against the REST API.
--
--   1. profiles: a person could change their own e-mail address, and sharing looks people up by that address, so a
--      project shared with an address nobody had signed up with yet could be received by the wrong person.
--      Now only full_name and avatar_url can be changed.
--   2. projects: a person could create a project whose parent_id is someone else's project. The owner's sub-project
--      list (and so their clips view, and project delete) then included it. Now a parent must be your own project.
--   3. documents: a person could add a document to someone else's project id. Now the project must be your own,
--      the same rule atoms already had.
--   4. user_openalex_keys: the app uses it, but no migration created it. Created here with row-level security on and
--      no policies, like the other key tables.
--   5. user_ai_keys: the provider list did not include 'anthropic', so saving a Claude key failed.
--   6. The atom-count trigger function gets a fixed search_path.
-- ==============================================================================

-- 0. Helper: does the signed-in user own this project? SECURITY DEFINER so a policy on projects can ask about
--    projects without recursing into its own policy.
CREATE OR REPLACE FUNCTION public.owns_project(pid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid AND p.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.owns_project(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_project(TEXT) TO authenticated;

-- 1. profiles: name and picture only ------------------------------------------------
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- 2. projects: a parent must be your own project ------------------------------------
DROP POLICY IF EXISTS projects_own ON public.projects;
CREATE POLICY projects_own ON public.projects FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (parent_id IS NULL OR public.owns_project(parent_id))
  );

-- 3. documents: the project must be yours ---------------------------------------------
DROP POLICY IF EXISTS documents_own ON public.documents;
CREATE POLICY documents_own ON public.documents FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.owns_project(project_id));

-- 4. OpenAlex key: encrypted by the server, no client access ------------------------
CREATE TABLE IF NOT EXISTS public.user_openalex_keys (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',
  last_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_openalex_keys ENABLE ROW LEVEL SECURITY;

-- 5. AI key providers: add anthropic ----------------------------------------------------
ALTER TABLE public.user_ai_keys DROP CONSTRAINT IF EXISTS user_ai_keys_provider_check;
ALTER TABLE public.user_ai_keys ADD CONSTRAINT user_ai_keys_provider_check
  CHECK (provider IN ('groq', 'cerebras', 'openrouter', 'google', 'anthropic'));

-- 6. Trigger function: fixed search_path --------------------------------------------------
ALTER FUNCTION public.handle_atom_count_change() SET search_path = public;

-- To see whether anything already breaks rule 2 or 3 (run these by hand; they change nothing):
--   SELECT c.id, c.user_id, c.parent_id FROM public.projects c JOIN public.projects p ON p.id = c.parent_id WHERE p.user_id <> c.user_id;
--   SELECT d.id, d.user_id, d.project_id FROM public.documents d JOIN public.projects p ON p.id = d.project_id WHERE p.user_id <> d.user_id;
-- The second can legitimately list documents an editor added to a shared project through the app; those are fine.
