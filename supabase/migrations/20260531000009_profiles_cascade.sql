-- Add ON DELETE CASCADE from profile-referencing tables so deleting a profile
-- cleans up its dependent rows instead of erroring / orphaning.

-- duo_members → profiles
ALTER TABLE duo_members
  DROP CONSTRAINT IF EXISTS duo_members_user_id_fkey;
ALTER TABLE duo_members
  ADD CONSTRAINT duo_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- notifications → profiles
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- homie_requests → profiles (both directions)
ALTER TABLE homie_requests
  DROP CONSTRAINT IF EXISTS homie_requests_from_user_id_fkey;
ALTER TABLE homie_requests
  DROP CONSTRAINT IF EXISTS homie_requests_to_user_id_fkey;
ALTER TABLE homie_requests
  ADD CONSTRAINT homie_requests_from_user_id_fkey
    FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE homie_requests
  ADD CONSTRAINT homie_requests_to_user_id_fkey
    FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
