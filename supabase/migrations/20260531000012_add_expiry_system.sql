-- Auto-expiry / cleanup system.
-- Adds expiry-tracking columns, a cleanup function, and a daily pg_cron job.
-- Nothing here is user-facing; the UI hides expired/old rows via filters in
-- src/lib/hangouts.js. This migration only handles the DB-side automation.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Expiry columns
-- ─────────────────────────────────────────────────────────────────────────────

-- hangouts: pending requests expire 72h after creation; cancelled/expired rows
-- are hidden in the UI and deleted after 7 days by the cleanup job.
ALTER TABLE hangouts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- notifications: auto-deleted 30 days after creation (default for new rows).
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS expires_at timestamptz
  DEFAULT (now() + interval '30 days');

-- homie_requests (pre-existing table): declined/cancelled rows deleted after 7d.
ALTER TABLE homie_requests
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. hangouts status constraint — allow 'expired'
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE hangouts
  DROP CONSTRAINT IF EXISTS hangouts_status_check;

ALTER TABLE hangouts
  ADD CONSTRAINT hangouts_status_check
  CHECK (status IN (
    'pending_internal',
    'pending',
    'countered',
    'confirmed',
    'declined',
    'cancelled',
    'expired'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Cleanup function
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. pending hangouts older than 72h → expired
  UPDATE hangouts
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < now() - interval '72 hours';

  -- 2. cancelled/expired/declined hangouts older than 7 days → delete
  DELETE FROM hangouts
  WHERE status IN ('cancelled', 'expired', 'declined')
    AND created_at < now() - interval '7 days';

  -- 3. expired notifications → delete
  DELETE FROM notifications
  WHERE expires_at < now();

  -- 4. declined/cancelled homie_requests older than 7 days → delete
  DELETE FROM homie_requests
  WHERE status IN ('declined', 'cancelled')
    AND updated_at < now() - interval '7 days';

  -- 5. pending homie_requests older than 30 days → delete
  DELETE FROM homie_requests
  WHERE status = 'pending'
    AND created_at < now() - interval '30 days';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Daily cron schedule (03:00 UTC)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-create the schedule idempotently: unschedule any existing job of the same
-- name first so re-running this migration does not error on a duplicate.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-data') THEN
    PERFORM cron.unschedule('cleanup-expired-data');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-expired-data',
  '0 3 * * *',
  'SELECT cleanup_expired_data()'
);
