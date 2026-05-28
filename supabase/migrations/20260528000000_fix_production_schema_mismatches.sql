-- DUO OC - Production schema mismatch fixes
-- Re-applies plan notification types and the weekly confirmed count RPC.

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

CREATE OR REPLACE FUNCTION public.get_weekly_confirmed_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.hangouts
  WHERE status = 'confirmed'
    AND created_at >= date_trunc('week', now());
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_confirmed_count() TO authenticated;
