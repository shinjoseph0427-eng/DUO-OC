-- ============================================================================
-- Chat "Leave" → notify the other person + system message in the thread.
-- Additive schema changes + a SECURITY DEFINER RPC. Does not touch existing
-- active match data. Idempotent.
-- ============================================================================

-- ── 1. solo_messages: system-message support ────────────────────────────────
-- is_system flags non-user messages ("X left the chat"). System messages have no
-- author, so sender_user_id must be nullable. (Existing rows are unaffected:
-- dropping NOT NULL never rejects data.)
ALTER TABLE public.solo_messages
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE public.solo_messages
  ALTER COLUMN sender_user_id DROP NOT NULL;

-- ── 2. solo_matches: record when a match ended ──────────────────────────────
ALTER TABLE public.solo_matches
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- ── 3. leave_solo_match RPC ─────────────────────────────────────────────────
-- Atomically: end the match, post a system message in the thread, and create a
-- 'solo_left' notification for the other participant. Returns the notification
-- id so the client can fire the push (same pattern as propose/confirm plan).
CREATE OR REPLACE FUNCTION public.leave_solo_match(p_match_id uuid)
RETURNS TABLE (notification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leaver      uuid := auth.uid();
  v_other       uuid;
  v_match       public.solo_matches%ROWTYPE;
  v_leaver_name text;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_leaver IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_match
  FROM public.solo_matches
  WHERE id = p_match_id
    AND status = 'active'
    AND (user_a = v_leaver OR user_b = v_leaver);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or already ended' USING ERRCODE = '42501';
  END IF;

  v_other := CASE WHEN v_match.user_a = v_leaver THEN v_match.user_b ELSE v_match.user_a END;
  SELECT name INTO v_leaver_name FROM public.profiles WHERE id = v_leaver;

  -- 1) End the match.
  UPDATE public.solo_matches
     SET status = 'ended', ended_at = now()
   WHERE id = p_match_id;

  -- 2) System message in the thread (name baked into content; no payload column).
  INSERT INTO public.solo_messages (match_id, sender_user_id, content, is_system)
  VALUES (p_match_id, NULL, coalesce(v_leaver_name, 'Someone') || ' left the chat', true);

  -- 3) Notify the other participant.
  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_other,
    'solo_left',
    jsonb_build_object(
      'match_id',   p_match_id,
      'leaver_id',  v_leaver,
      'leaver_name', coalesce(v_leaver_name, 'Someone')
    ),
    false
  )
  RETURNING * INTO v_notification;

  notification_id := v_notification.id;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_solo_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_solo_match(uuid) TO authenticated;
