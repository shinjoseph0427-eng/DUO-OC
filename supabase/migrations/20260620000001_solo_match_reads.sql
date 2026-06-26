-- ============================================================================
-- solo_match_reads — per-participant "last read" marker for unread message
-- counts (P0 fix: real unread badge instead of notification/request heuristic).
-- Additive, RLS-protected, owner-only. One row per (match, user).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.solo_match_reads (
  match_id     uuid NOT NULL REFERENCES public.solo_matches(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

-- Lookup by user when summing unread across all of my matches.
CREATE INDEX IF NOT EXISTS solo_match_reads_user_idx ON public.solo_match_reads (user_id);

ALTER TABLE public.solo_match_reads ENABLE ROW LEVEL SECURITY;

-- A user may only see and write their own read markers.
DROP POLICY IF EXISTS "solo_match_reads select own" ON public.solo_match_reads;
CREATE POLICY "solo_match_reads select own" ON public.solo_match_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "solo_match_reads insert own" ON public.solo_match_reads;
CREATE POLICY "solo_match_reads insert own" ON public.solo_match_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "solo_match_reads update own" ON public.solo_match_reads;
CREATE POLICY "solo_match_reads update own" ON public.solo_match_reads
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
