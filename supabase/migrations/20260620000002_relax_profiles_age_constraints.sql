-- ============================================================================
-- Relax profiles age constraints to "18+, no upper cap" (additive/loosening only)
-- ----------------------------------------------------------------------------
-- Background (from production schema audit):
--   profiles has TWO conflicting CHECK constraints on age data:
--     * profiles_age_check : CHECK (age >= 18 AND age <= 25)      -- on the DEAD `age` column
--     * age_range          : CHECK (birth_year between now-35 and now-18)
--
--   The `age` column is legacy/unused: current code never reads or writes it.
--   `birth_year` is the source of truth (OnboardingFlow writes it; the matching
--   RPCs derive display age from it). profiles_age_check is therefore a useless
--   landmine (blocks 26+, breaks if a legacy `age` value is ever updated) and it
--   contradicts age_range.
--
-- Decision: 18 or older, NO upper age limit.
--   1) Drop profiles_age_check entirely.        (age column + data are KEPT)
--   2) Replace age_range with an 18+ floor only (remove the max-age / lower
--      birth_year bound).
--
-- Safe & non-destructive: only DROP CONSTRAINT (no data/column drop) and a
-- LOOSER replacement CHECK. Every existing row already satisfied the old 18+
-- rule, so the new looser rule cannot reject any current row.
--
-- NOTE: `age` is intentionally left in place (deprecated) to avoid data loss.
--       Removing the column itself is deferred to a post-PMF cleanup.
-- ============================================================================

-- 1) Remove the strict 18–25 check on the dead `age` column.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_age_check;

-- 2) Re-define age_range on birth_year as "18 or older, no upper cap".
--    (NULL birth_year still passes — new profiles are created before onboarding.)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS age_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT age_range
  CHECK (
    birth_year IS NULL
    OR birth_year <= (date_part('year', now())::int - 18)
  );
