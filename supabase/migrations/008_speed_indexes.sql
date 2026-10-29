-- ==============================================================================
-- 008_speed_indexes.sql: indexes for the two queries every project open makes.
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run twice.
-- Use the TESTERS project, the same one as 001 to 007.
--
--   atoms: the clip list reads the clips of a project (or a project and its sub-projects) newest first. An index on
--   (project_id, captured_at, id) in that order lets the database read them already sorted instead of sorting after.
--   projects: the project list reads a person's projects newest-updated first; an index on (user_id, updated_at) does
--   the same. Nothing changes in the app's behaviour; these only make those two reads cheaper as the data grows.
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_atoms_project_captured ON public.atoms(project_id, captured_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON public.projects(user_id, updated_at DESC);
