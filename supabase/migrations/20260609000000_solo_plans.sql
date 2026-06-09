-- WEEKLY - minimal 1:1 plan layer.
-- Adds a single proposed/confirmed plan on top of an active solo_match.
-- No 4-way friend gate, no calendar system, no payment layer.

CREATE TABLE IF NOT EXISTS public.solo_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid NOT NULL REFERENCES public.solo_matches(id) ON DELETE CASCADE,
  proposed_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'proposed'
                  CHECK (status IN ('proposed','confirmed')),
  day           text NOT NULL CHECK (day IN ('mon','tue','wed','thu','fri','sat','sun')),
  time_label    text NOT NULL CHECK (char_length(time_label) > 0 AND char_length(time_label) <= 80),
  place         text,
  activity      text,
  place_lat     float8,
  place_lng     float8,
  confirmed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solo_plans_match_idx
  ON public.solo_plans (match_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS solo_plans_one_open_proposal
  ON public.solo_plans (match_id)
  WHERE status = 'proposed';

ALTER TABLE public.solo_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo_plans select participants" ON public.solo_plans;
CREATE POLICY "solo_plans select participants" ON public.solo_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solo_matches m
      WHERE m.id = solo_plans.match_id
        AND m.status = 'active'
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- Writes are intentionally routed through SECURITY DEFINER RPCs below so the
-- match participant check, one-open-proposal rule, and notifications stay atomic.

CREATE OR REPLACE FUNCTION public.propose_solo_plan(
  p_match_id uuid,
  p_day text,
  p_time_label text,
  p_place text DEFAULT NULL,
  p_activity text DEFAULT NULL,
  p_place_lat float8 DEFAULT NULL,
  p_place_lng float8 DEFAULT NULL
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
           updated_at = now()
     WHERE id = v_plan.id
     RETURNING * INTO v_plan;
  ELSE
    INSERT INTO public.solo_plans (
      match_id, proposed_by, day, time_label, place, activity, place_lat, place_lng
    )
    VALUES (
      p_match_id,
      v_uid,
      p_day,
      trim(p_time_label),
      nullif(trim(coalesce(p_place, '')), ''),
      nullif(trim(coalesce(p_activity, '')), ''),
      p_place_lat,
      p_place_lng
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

CREATE OR REPLACE FUNCTION public.confirm_solo_plan(p_plan_id uuid)
RETURNS TABLE (plan_id uuid, notification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.solo_plans%ROWTYPE;
  v_match public.solo_matches%ROWTYPE;
  v_confirmer_name text;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_plan
  FROM public.solo_plans
  WHERE id = p_plan_id
    AND status = 'proposed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan is no longer open' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_match
  FROM public.solo_matches
  WHERE id = v_plan.match_id
    AND status = 'active'
    AND (user_a = v_uid OR user_b = v_uid);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo match not found' USING ERRCODE = '42501';
  END IF;

  IF v_plan.proposed_by = v_uid THEN
    RAISE EXCEPTION 'The other person needs to confirm this plan' USING ERRCODE = '42501';
  END IF;

  UPDATE public.solo_plans
     SET status = 'confirmed',
         confirmed_by = v_uid,
         confirmed_at = now(),
         updated_at = now()
   WHERE id = p_plan_id
     AND status = 'proposed'
   RETURNING * INTO v_plan;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan is no longer open' USING ERRCODE = '42501';
  END IF;

  SELECT name INTO v_confirmer_name FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_plan.proposed_by,
    'plan_confirmed',
    jsonb_build_object(
      'match_id', v_plan.match_id,
      'plan_id', v_plan.id,
      'partner_name', coalesce(v_confirmer_name, 'Someone'),
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

REVOKE ALL ON FUNCTION public.propose_solo_plan(uuid, text, text, text, text, float8, float8) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_solo_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.propose_solo_plan(uuid, text, text, text, text, float8, float8) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_solo_plan(uuid) TO authenticated;

-- If a notification type check exists in an environment, keep all known values
-- and add the solo plan types. Production currently has no such check.
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
  'hangout_confirmed',
  'hangout_cancelled',
  'homie_accepted',
  'solo_request',
  'solo_accepted',
  'plan_request',
  'plan_accepted',
  'plan_declined',
  'plan_cancelled',
  'review',
  'plan_proposed',
  'plan_confirmed'
));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.solo_plans;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
