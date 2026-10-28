-- ==============================================================================
-- 005_notifications.sql: the notification box next to Settings (sharing and access requests).
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run twice.
-- Use the TESTERS project, the same one as 001 to 004.
--
-- One new table. A row is one notification for one person: "X shared a project with you", "X asked for access",
-- "your request was approved", and so on. The text is stored ready to show, so it still reads right if the project
-- is renamed or deleted later. A person removes a notification by deleting its row. Row-level security is on and
-- there are no policies, so only the server (service role) can read or write it, the same as the sharing tables.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  -- Not a foreign key on purpose: the notification outlives a deleted project.
  project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
