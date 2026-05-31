-- Force-reapply the notifications INSERT RLS policy.
-- Prod drifted: some restrictive INSERT policy is blocking notifications for
-- users outside the caller's duo (e.g. hangout_request to the receiving duo).
-- Drop ALL existing INSERT policies (whatever they're named), then recreate a
-- single permissive one so any authenticated user can notify any user.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'notifications' AND cmd = 'INSERT'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON notifications';
  END LOOP;
END $$;

-- New INSERT policy: any authenticated user can insert for any user_id.
CREATE POLICY "authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
