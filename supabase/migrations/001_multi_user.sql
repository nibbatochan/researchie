-- ==============================================================================
-- 001_multi_user.sql: accounts, per-user data, row-level security.
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run.
-- Safe to run twice (every statement is IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
--
-- BEFORE YOU RUN IT
--   * Use the TESTERS project, not your personal one. Export your data first.
--   * The free plan has no automatic backups.
--
-- WHAT IT CHANGES IN EXISTING TABLES (flagged)
--   projects: new columns parent_id, folder_icon, last_accessed_at.
--   projects.user_id and atoms.user_id: the default (the shared service profile) is removed.
--     Rows that already have that owner stay in the table, but no real user owns them.
--   projects, atoms, profiles: the three open "Public ... Access" policies from schema.sql are dropped and
--     per-user policies replace them. Today anyone holding the public anon key can read and write these
--     tables; after this they cannot. The three seeded demo projects are deleted.
--
-- HOW THE APP USES IT
--   The Next.js server talks to Supabase with the service-role key and always filters by the
--   signed-in user. The policies below are a second lock for anyone using the anon key directly.
-- ==============================================================================

-- 0. Close the doors schema.sql left open --------------------------------------------
-- schema.sql turned row-level security on but added "Public ... Access" policies that allow everyone, so
-- the public anon key could read and write every row. Policies are OR-ed together, so these three must go
-- or the per-user policies below would change nothing.
DROP POLICY IF EXISTS "Public Projects Access" ON public.projects;
DROP POLICY IF EXISTS "Public Atoms Access" ON public.atoms;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;

-- schema.sql also seeded three demo projects owned by the shared service profile. No tester should own them,
-- so they are removed (their atoms go with them). Only the exact seeded ids, only while still unowned.
DELETE FROM public.projects
WHERE id IN ('proj-ai-inference', 'proj-fintech-teardown', 'proj-agentic-frameworks')
  AND user_id = '00000000-0000-0000-0000-000000000001';

-- 1. Projects: columns the app already sends but the table never had -------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS folder_icon TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON public.projects(parent_id);

-- 2. Owners: no more shared default owner ------------------------------------------
ALTER TABLE public.projects ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.atoms ALTER COLUMN user_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_atoms_user_id ON public.atoms(user_id);

-- The atoms type check predates the 'document' atom type used in the app.
ALTER TABLE public.atoms DROP CONSTRAINT IF EXISTS atoms_type_check;
ALTER TABLE public.atoms ADD CONSTRAINT atoms_type_check
  CHECK (type IN ('text', 'link', 'image', 'block', 'quote', 'note', 'document'));

-- 3. Profiles: one row per auth user, created automatically on sign-up --------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Users that signed up before this trigger existed.
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, split_part(u.email, '@', 1) FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 4. Documents (replaces .documents-store.json) -------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- the whole document: pages, citation, file data
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_user_project ON public.documents(user_id, project_id);

-- 5. Per-user settings (replaces researchie_app_settings_v1 in localStorage) --------
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Extension tokens: only a SHA-256 hash is stored, never the token itself -------
CREATE TABLE IF NOT EXISTS public.extension_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT DEFAULT 'Chrome extension',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_extension_tokens_user ON public.extension_tokens(user_id);

-- 7. Bring-your-own Groq key: encrypted by the server (AES-256-GCM) before it is stored.
--    No client can read this table; there are deliberately no policies for it.
CREATE TABLE IF NOT EXISTS public.user_ai_keys (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'groq' CHECK (provider IN ('groq', 'cerebras', 'openrouter', 'google')),
  model TEXT,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unchecked' CHECK (status IN ('unchecked', 'valid', 'invalid')),
  last_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Row-level security --------------------------------------------------------------
-- The service role (used by the Next.js server) bypasses these. They protect the anon key.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS projects_own ON public.projects;
CREATE POLICY projects_own ON public.projects FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- An atom is yours only if you own the atom AND the project it sits in.
DROP POLICY IF EXISTS atoms_own ON public.atoms;
CREATE POLICY atoms_own ON public.atoms FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS documents_own ON public.documents;
CREATE POLICY documents_own ON public.documents FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_settings_own ON public.user_settings;
CREATE POLICY user_settings_own ON public.user_settings FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Tokens: a user may list and revoke their own, but only the server creates them.
DROP POLICY IF EXISTS extension_tokens_select_own ON public.extension_tokens;
CREATE POLICY extension_tokens_select_own ON public.extension_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_ai_keys: RLS on, no policy = no access for anon or authenticated.

-- 9. Atom-count trigger: keep working under RLS (it is SECURITY DEFINER already). -----
-- Nothing to change.
