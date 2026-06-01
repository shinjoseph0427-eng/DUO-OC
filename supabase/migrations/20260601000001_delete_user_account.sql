-- DUO OC — account deletion (App Store requirement).
-- Soft-delete: stamp profiles.deleted_at so the account is deactivated. We keep
-- the row (and the auth.users record) rather than hard-deleting, because
-- profiles.id references auth.users(id) ON DELETE CASCADE — removing the auth
-- user would wipe the profile and make the soft-delete moot. A hard delete
-- (auth.users) should be done from an edge function with the service role.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET deleted_at = now(),
         onboarding_complete = false
   WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
