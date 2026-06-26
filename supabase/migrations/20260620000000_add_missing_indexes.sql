-- ============================================================================
-- Missing indexes + active-match uniqueness backstop (idempotent, additive)
-- ----------------------------------------------------------------------------
-- All statements are CREATE [UNIQUE] INDEX IF NOT EXISTS — safe no-ops where the
-- index already exists. Nothing is dropped.
-- ============================================================================

-- ── Foreign-key lookup indexes used on every Explore / inbox / chat load ────
-- solo_requests is filtered by both directions (sent + received).
CREATE INDEX IF NOT EXISTS solo_requests_to_user_idx   ON public.solo_requests (to_user_id);
CREATE INDEX IF NOT EXISTS solo_requests_from_user_idx ON public.solo_requests (from_user_id);

-- solo_matches is queried as "(user_a = me OR user_b = me)".
CREATE INDEX IF NOT EXISTS solo_matches_user_a_idx ON public.solo_matches (user_a);
CREATE INDEX IF NOT EXISTS solo_matches_user_b_idx ON public.solo_matches (user_b);

-- ── Active-pair uniqueness backstop ─────────────────────────────────────────
-- Invariant: at most ONE active match per unordered {user_a, user_b} pair.
-- This index already ships in 20260601000003_solo_feature; it is re-asserted
-- here because production may have had it dropped during the manual duplicate
-- cleanup referenced in 20260610000000_fix_solo_duplicate_match.
--
-- IMPORTANT: if production currently holds duplicate ACTIVE matches for any pair,
-- this CREATE will FAIL. That is intentional — it surfaces real data that must be
-- reconciled first. Do NOT add destructive dedupe here. Diagnose with:
--   SELECT LEAST(user_a,user_b) a, GREATEST(user_a,user_b) b, count(*)
--   FROM public.solo_matches WHERE status='active'
--   GROUP BY 1,2 HAVING count(*) > 1;
-- then archive the extras (status='archived') by hand before re-running.
CREATE UNIQUE INDEX IF NOT EXISTS solo_matches_active_pair_uniq
  ON public.solo_matches (LEAST(user_a, user_b), GREATEST(user_a, user_b))
  WHERE status = 'active';
