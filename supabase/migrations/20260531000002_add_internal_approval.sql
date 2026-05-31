-- Duo-internal hangout approval: a proposal first needs the proposer's partner
-- to agree before it is sent to the other duo.
--   * proposer_approved_by — user ids in the proposing duo who have approved
--   * status 'pending_internal' — awaiting partner approval (not yet sent out)

ALTER TABLE public.hangouts
  ADD COLUMN IF NOT EXISTS proposer_approved_by uuid[] DEFAULT '{}';

-- Widen the status CHECK to allow 'pending_internal'. The constraint was
-- (re)created as hangouts_status_check in 20260531000001.
ALTER TABLE public.hangouts
  DROP CONSTRAINT IF EXISTS hangouts_status_check;

ALTER TABLE public.hangouts
  ADD CONSTRAINT hangouts_status_check
    CHECK (status IN ('pending_internal', 'pending', 'countered', 'confirmed', 'declined', 'cancelled'));
