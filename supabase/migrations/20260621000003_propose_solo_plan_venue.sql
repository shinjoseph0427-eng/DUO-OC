-- ============================================================================
-- Extend propose_solo_plan to persist the selected venue's category + Google
-- Place id. Adds two optional params (default NULL); ALL existing logic
-- (one-open-proposal, confirmed guard, partner notification) is preserved
-- verbatim. The signature changes, so the old function is dropped first.
-- No behavior change when the new params are omitted.
-- ============================================================================

DROP FUNCTION IF EXISTS public.propose_solo_plan(uuid, text, text, text, text, float8, float8);

CREATE OR REPLACE FUNCTION public.propose_solo_plan(
  p_match_id uuid,
  p_day text,
  p_time_label text,
  p_place text DEFAULT NULL,
  p_activity text DEFAULT NULL,
  p_place_lat float8 DEFAULT NULL,
  p_place_lng float8 DEFAULT NULL,
  p_place_type text DEFAULT NULL,
  p_google_place_id text DEFAULT NULL
)
RETURNS TABLE (plan_id uuid, notification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match public.solo_matches%ROWTYPE;
  v_plan public.solo_plans%ROWTYPE;
  v_partner_id uuid;
  v_sender_name text;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_match
  FROM public.solo_matches
  WHERE id = p_match_id
    AND status = 'active'
    AND (user_a = v_uid OR user_b = v_uid);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo match not found' USING ERRCODE = '42501';
  END IF;

  IF p_day NOT IN ('mon','tue','wed','thu','fri','sat','sun') THEN
    RAISE EXCEPTION 'Plan day must be inside this week' USING ERRCODE = '22023';
  END IF;

  IF coalesce(char_length(trim(p_time_label)), 0) = 0 OR char_length(trim(p_time_label)) > 80 THEN
    RAISE EXCEPTION 'Plan time is required' USING ERRCODE = '22023';
  END IF;

  v_partner_id := CASE WHEN v_match.user_a = v_uid THEN v_match.user_b ELSE v_match.user_a END;

  IF EXISTS (
    SELECT 1 FROM public.solo_plans
    WHERE match_id = p_match_id
      AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'This plan is already confirmed' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_plan
  FROM public.solo_plans
  WHERE match_id = p_match_id
    AND status = 'proposed'
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.solo_plans
       SET proposed_by = v_uid,
           day = p_day,
           time_label = trim(p_time_label),
           place = nullif(trim(coalesce(p_place, '')), ''),
           activity = nullif(trim(coalesce(p_activity, '')), ''),
           place_lat = p_place_lat,
           place_lng = p_place_lng,
           place_type = nullif(trim(coalesce(p_place_type, '')), ''),
           google_place_id = nullif(trim(coalesce(p_google_place_id, '')), ''),
           updated_at = now()
     WHERE id = v_plan.id
     RETURNING * INTO v_plan;
  ELSE
    INSERT INTO public.solo_plans (
      match_id, proposed_by, day, time_label, place, activity,
      place_lat, place_lng, place_type, google_place_id
    )
    VALUES (
      p_match_id,
      v_uid,
      p_day,
      trim(p_time_label),
      nullif(trim(coalesce(p_place, '')), ''),
      nullif(trim(coalesce(p_activity, '')), ''),
      p_place_lat,
      p_place_lng,
      nullif(trim(coalesce(p_place_type, '')), ''),
      nullif(trim(coalesce(p_google_place_id, '')), '')
    )
    RETURNING * INTO v_plan;
  END IF;

  SELECT name INTO v_sender_name FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_partner_id,
    'plan_proposed',
    jsonb_build_object(
      'match_id', p_match_id,
      'plan_id', v_plan.id,
      'sender_name', coalesce(v_sender_name, 'Someone'),
      'day', v_plan.day,
      'time_label', v_plan.time_label,
      'place', v_plan.place,
      'activity', v_plan.activity
    ),
    false
  )
  RETURNING * INTO v_notification;

  plan_id := v_plan.id;
  notification_id := v_notification.id;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.propose_solo_plan(uuid, text, text, text, text, float8, float8, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.propose_solo_plan(uuid, text, text, text, text, float8, float8, text, text) TO authenticated;
