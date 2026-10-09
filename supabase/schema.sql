-- ==============================================================================
-- RESEARCHIE COMPLETE SUPABASE DATABASE SCHEMA
-- Execute this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 0. Enable pgvector for semantic search (Service 4)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  full_name TEXT DEFAULT 'Researchie User',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default service profile if not exists
INSERT INTO public.profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'user@researchie.local', 'Lead Researcher')
ON CONFLICT (id) DO NOTHING;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#D2F83C', -- Electric Lime accent
  tags TEXT[] DEFAULT '{}',
  atom_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

-- 3. Atoms Table (Captured quotes, links, screenshots, DOM blocks, notes)
CREATE TABLE IF NOT EXISTS public.atoms (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'block', 'quote', 'note')),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  user_notes TEXT DEFAULT '',
  embedding vector(768), -- For Semantic Vector Search
  captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atoms_project_id ON public.atoms(project_id);
CREATE INDEX IF NOT EXISTS idx_atoms_captured_at ON public.atoms(captured_at DESC);

-- 4. Automated Trigger for atom_count Maintenance
CREATE OR REPLACE FUNCTION public.handle_atom_count_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects
    SET atom_count = atom_count + 1, updated_at = now()
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects
    SET atom_count = GREATEST(atom_count - 1, 0), updated_at = now()
    WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_atom_count_change ON public.atoms;
CREATE TRIGGER tr_atom_count_change
  AFTER INSERT OR DELETE ON public.atoms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_atom_count_change();

-- 5. Seed Initial Default Projects
INSERT INTO public.projects (id, title, description, color, tags, atom_count)
VALUES 
  (
    'proj-ai-inference',
    'AI Inference Economics & GPU Margins',
    'Investigating cost curves, speculative decoding, and batch latency tradeoffs.',
    '#D2F83C',
    ARRAY['ai', 'infrastructure', 'economics', 'margins'],
    3
  ),
  (
    'proj-fintech-teardown',
    'FinTech Checkout & Payment Flows',
    'UX competitive benchmarking across Stripe, Adyen, and modern 1-click checkout engines.',
    '#3B82F6',
    ARRAY['fintech', 'ux', 'pricing-tables', 'benchmarks'],
    2
  ),
  (
    'proj-agentic-frameworks',
    'Multi-Agent Cognitive Frameworks',
    'Literature review on actor-critic patterns, self-reflection loops, and subagent orchestration.',
    '#8B5CF6',
    ARRAY['agents', 'rag', 'architecture', 'academic'],
    2
  )
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description, color = EXCLUDED.color;

-- 6. Enable Row Level Security (RLS) & Allow Read/Write for Authenticated and Service Role
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atoms ENABLE ROW LEVEL SECURITY;

-- Development & Service Policies (Permissive for verified service_role / anon)
DROP POLICY IF EXISTS "Public Projects Access" ON public.projects;
CREATE POLICY "Public Projects Access" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Atoms Access" ON public.atoms;
CREATE POLICY "Public Atoms Access" ON public.atoms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 7. Realtime Replication for instant multi-tab sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atoms;
