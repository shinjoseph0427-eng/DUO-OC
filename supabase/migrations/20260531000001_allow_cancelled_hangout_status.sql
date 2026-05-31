-- Allow 'cancelled' as a hangouts.status value so that when a duo is dissolved
-- (see leaveDuo) its pending/confirmed hangouts can be cancelled rather than
-- left dangling. Without this the status CHECK constraint rejects the update.
ALTER TABLE public.hangouts
  DROP CONSTRAINT IF EXISTS hangouts_status_check;

ALTER TABLE public.hangouts
  ADD CONSTRAINT hangouts_status_check
    CHECK (status IN ('pending', 'countered', 'confirmed', 'declined', 'cancelled'));
