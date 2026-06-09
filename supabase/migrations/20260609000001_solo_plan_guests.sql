-- WEEKLY - optional +1 layer for solo plans.
-- Each side may invite one friend to an existing solo_plan. The original
-- proposed/confirmed plan never depends on guests accepting.

CREATE TABLE IF NOT EXISTS public.solo_plan_guests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES public.solo_plans(id) ON DELETE CASCADE,
  invited_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  CONSTRAINT solo_plan_guests_not_self CHECK (invited_by <> guest_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS solo_plan_guests_one_per_side
  ON public.solo_plan_guests (plan_id, invited_by);

CREATE UNIQUE INDEX IF NOT EXISTS solo_plan_guests_one_invite_per_guest
  ON public.solo_plan_guests (plan_id, guest_user_id);

CREATE INDEX IF NOT EXISTS solo_plan_guests_guest_idx
  ON public.solo_plan_guests (guest_user_id, status);

ALTER TABLE public.solo_plan_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo_plan_guests select related" ON public.solo_plan_guests;
CREATE POLICY "solo_plan_guests select related" ON public.solo_plan_guests
  FOR SELECT TO authenticated
  USING (
    guest_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.solo_plans sp
      JOIN public.solo_matches sm ON sm.id = sp.match_id
      WHERE sp.id = solo_plan_guests.plan_id
        AND sm.status = 'active'
        AND (sm.user_a = auth.uid() OR sm.user_b = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.search_solo_plan_guest_candidates(
  p_plan_id uuid,
  p_query text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  username text,
  name text,
  photos text[],
  city text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match public.solo_matches%ROWTYPE;
  v_query text := trim(coalesce(p_query, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT sm.* INTO v_match
  FROM public.solo_plans sp
  JOIN public.solo_matches sm ON sm.id = sp.match_id
  WHERE sp.id = p_plan_id
    AND sm.status = 'active'
    AND (sm.user_a = v_uid OR sm.user_b = v_uid);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.name, p.photos, p.city
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND p.id <> v_uid
    AND p.id <> v_match.user_a
    AND p.id <> v_match.user_b
    AND (
      p.username ILIKE v_query || '%'
      OR p.name ILIKE v_query || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = v_uid AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = v_uid)
    )
  ORDER BY
    CASE WHEN p.username ILIKE v_query || '%' THEN 0 ELSE 1 END,
    p.name NULLS LAST
  LIMIT 8;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_solo_plan_guest(
  p_plan_id uuid,
  p_guest_user_id uuid
)
RETURNS TABLE (invite_id uuid, notification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.solo_plans%ROWTYPE;
  v_match public.solo_matches%ROWTYPE;
  v_inviter_name text;
  v_invite public.solo_plan_guests%ROWTYPE;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_plan
  FROM public.solo_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_match
  FROM public.solo_matches
  WHERE id = v_plan.match_id
    AND status = 'active'
    AND (user_a = v_uid OR user_b = v_uid);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo match not found' USING ERRCODE = '42501';
  END IF;

  IF p_guest_user_id IN (v_uid, v_match.user_a, v_match.user_b) THEN
    RAISE EXCEPTION 'Choose a friend outside this match' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = v_uid AND b.blocked_id = p_guest_user_id)
       OR (b.blocker_id = p_guest_user_id AND b.blocked_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Cannot invite this user' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.solo_plan_guests (plan_id, invited_by, guest_user_id, status)
  VALUES (p_plan_id, v_uid, p_guest_user_id, 'pending')
  ON CONFLICT (plan_id, invited_by)
  DO UPDATE
     SET guest_user_id = excluded.guest_user_id,
         status = 'pending',
         updated_at = now(),
         responded_at = NULL
  RETURNING * INTO v_invite;

  SELECT name INTO v_inviter_name FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    p_guest_user_id,
    'plan_guest_invited',
    jsonb_build_object(
      'plan_id', p_plan_id,
      'invite_id', v_invite.id,
      'inviter_name', coalesce(v_inviter_name, 'Someone'),
      'day', v_plan.day,
      'time_label', v_plan.time_label,
      'place', v_plan.place,
      'activity', v_plan.activity
    ),
    false
  )
  RETURNING * INTO v_notification;

  invite_id := v_invite.id;
  notification_id := v_notification.id;
  RETURN NEXT;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_solo_plan_guest(
  p_invite_id uuid,
  p_accept boolean
)
RETURNS TABLE (invite_id uuid, notification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_invite public.solo_plan_guests%ROWTYPE;
  v_guest_name text;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invite
  FROM public.solo_plan_guests
  WHERE id = p_invite_id
    AND guest_user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.solo_plan_guests
     SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         responded_at = now(),
         updated_at = now()
   WHERE id = p_invite_id
   RETURNING * INTO v_invite;

  SELECT name INTO v_guest_name FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_invite.invited_by,
    CASE WHEN p_accept THEN 'plan_guest_accepted' ELSE 'plan_guest_declined' END,
    jsonb_build_object(
      'plan_id', v_invite.plan_id,
      'invite_id', v_invite.id,
      'guest_name', coalesce(v_guest_name, 'Someone')
    ),
    false
  )
  RETURNING * INTO v_notification;

  invite_id := v_invite.id;
  notification_id := v_notification.id;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.search_solo_plan_guest_candidates(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_solo_plan_guest(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_solo_plan_guest(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_solo_plan_guest_candidates(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_solo_plan_guest(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_solo_plan_guest(uuid, boolean) TO authenticated;

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
  'plan_confirmed',
  'plan_guest_invited',
  'plan_guest_accepted',
  'plan_guest_declined'
));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.solo_plan_guests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
