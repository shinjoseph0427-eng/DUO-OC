-- ============================================================================
-- Venue suggestion cache (cost guard for Google Places New) + PLAN venue fields.
-- Additive only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.venue_search_cache (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key  text NOT NULL UNIQUE,
  results    jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS venue_cache_expires_idx
  ON public.venue_search_cache (expires_at);

CREATE INDEX IF NOT EXISTS venue_cache_key_idx
  ON public.venue_search_cache (query_key);

-- The cache is only ever read/written by the suggest-venues Edge Function using
-- the service-role key (which bypasses RLS). Enable RLS with no public policies
-- so anon/authenticated clients cannot read or write it directly.
ALTER TABLE public.venue_search_cache ENABLE ROW LEVEL SECURITY;

-- Expired-cache cleanup (callable; schedule via pg_cron later if desired).
CREATE OR REPLACE FUNCTION public.cleanup_venue_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.venue_search_cache WHERE expires_at < now();
$$;

-- ── solo_plans venue metadata (selected-venue category + Google Place id) ────
ALTER TABLE public.solo_plans
  ADD COLUMN IF NOT EXISTS place_type text;

ALTER TABLE public.solo_plans
  ADD COLUMN IF NOT EXISTS google_place_id text;
