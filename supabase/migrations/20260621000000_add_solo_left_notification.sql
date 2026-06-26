-- ============================================================================
-- Add 'solo_left' notification type (chat-leave notification).
-- Re-creates notifications_type_check preserving EVERY existing type and adding
-- 'solo_left'. Idempotent: DROP IF EXISTS then ADD.
-- No behavior change for any other notification type.
-- ============================================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      'match','hangout_request','homie_request','hangout_accepted',
      'hangout_declined','hangout_confirmed','hangout_cancelled',
      'homie_accepted','solo_request','solo_accepted',
      'plan_request','plan_accepted','plan_declined','plan_cancelled',
      'review','plan_proposed','plan_confirmed',
      'plan_guest_invited','plan_guest_accepted','plan_guest_declined',
      'solo_left'
    ])
  );
