-- SECURITY DEFINER RPC to delete the original 'hangout_request' notifications
-- for a hangout. Needed because notifications has no DELETE RLS policy, so a
-- direct client delete (and especially a cross-duo one) is blocked. Runs as the
-- function owner to bypass RLS.
CREATE OR REPLACE FUNCTION delete_hangout_notifications(
  p_hangout_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE type = 'hangout_request'
    AND payload->>'hangout_id' = p_hangout_id::text;
END;
$$;

-- Only authenticated users may call it.
REVOKE ALL ON FUNCTION delete_hangout_notifications(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_hangout_notifications(uuid) TO authenticated;
