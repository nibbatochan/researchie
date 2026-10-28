-- ==============================================================================
-- 006_papers.sql: Paper Mode workspace. Every paper a person writes gets its own row.
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run twice.
-- Use the TESTERS project, the same one as 001 to 005.
--
-- Until now one paper outline per project was kept in the account settings, which are capped at 256 KB for
-- everything together. A person with several papers needs room of their own, so each paper is a row here.
-- A paper is private to the person who made it. It points at a project (its data source) only by id, with no
-- foreign key, so deleting the project never deletes the paper. Row-level security is on and there are no
-- policies, so only the server (service role) reads or writes it, the same as the sharing tables.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- The project (or sub-project) the sidebar pulls clips from. Not a foreign key on purpose.
  project_id TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled paper',
  template_id TEXT NOT NULL DEFAULT 'blank',
  citation_style TEXT NOT NULL DEFAULT 'apa',
  -- The editor document, and the front matter, headers and footers. Both are JSON the app owns.
  doc JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- A deleted paper stays here (in the trash) until the person removes it for good.
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_papers_user_updated ON public.papers(user_id, updated_at DESC);

ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
