-- DUO OC — app-wide weekly confirmed hangout count.
-- hangouts RLS restricts per-user reads, so we use SECURITY DEFINER
-- to count across all rows without exposing hangout content.

CREATE OR REPLACE FUNCTION public.get_weekly_confirmed_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.hangouts
  WHERE status = 'confirmed'
    AND created_at >= (now() - interval '7 days');
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_confirmed_count() TO authenticated;
