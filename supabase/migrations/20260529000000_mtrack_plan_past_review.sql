-- DUO OC - M-track: auto-past plans + review prompts
-- Adds the 'past' status to hangout_plans and a review_sent flag so the
-- usePlanStatus / useReviewPrompt hooks can mark elapsed plans and fire a
-- one-time "How was your hangout?" review notification.
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

-- ─── Extend hangout_plans.status to allow 'past' ─────────────────────────────
ALTER TABLE public.hangout_plans
  DROP CONSTRAINT IF EXISTS hangout_plans_status_check;

ALTER TABLE public.hangout_plans
  ADD CONSTRAINT hangout_plans_status_check
  CHECK (status IN ('open', 'matched', 'cancelled', 'past'));

-- ─── review_sent flag (guards against duplicate review notifications) ────────
ALTER TABLE public.hangout_plans
  ADD COLUMN IF NOT EXISTS review_sent boolean NOT NULL DEFAULT false;

-- ─── Allow the 'review' notification type ────────────────────────────────────
-- Only needed if your notifications.type column has a CHECK constraint.
-- This is a no-op if no such constraint exists.
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'notifications'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%type%';

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', conname);
  END IF;
END $$;
