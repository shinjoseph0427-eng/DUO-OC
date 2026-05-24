-- DUO OC - H-track: plan notification types
-- Extends the notifications type check constraint to include
-- plan_request, plan_accepted, plan_declined, plan_cancelled.
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

ALTER TABLE IF EXISTS public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE IF EXISTS public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'match',
  'hangout_request',
  'homie_request',
  'hangout_accepted',
  'hangout_declined',
  'homie_accepted',
  'plan_request',
  'plan_accepted',
  'plan_declined',
  'plan_cancelled'
));
