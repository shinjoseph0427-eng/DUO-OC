-- notifications RLS policies
-- Run in Supabase Dashboard → SQL Editor

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert a notification for any user_id
-- (needed so sendHomieRequest can notify the recipient)
CREATE POLICY "authenticated users insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can only read their own notifications
CREATE POLICY "users read own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can only update their own notifications (e.g. marking as read)
CREATE POLICY "users update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
