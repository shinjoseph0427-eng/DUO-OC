-- DUO OC - L-track: server-side homie notification creation
-- Keeps existing client-side notification policies in place for unmigrated flows.

CREATE OR REPLACE FUNCTION public.notify_homie_request(p_request_id uuid)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.homie_requests%ROWTYPE;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_request
  FROM public.homie_requests
  WHERE id = p_request_id;

  IF NOT FOUND
     OR v_request.from_user_id <> v_actor_id
     OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Homie request is not eligible for notification'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_request.to_user_id,
    'homie_request',
    jsonb_build_object(
      'from_user_id', v_request.from_user_id,
      'homie_request_id', v_request.id
    ),
    false
  )
  RETURNING * INTO v_notification;

  RETURN NEXT v_notification;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_homie_request_accepted(
  p_request_id uuid,
  p_duo_id uuid
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.homie_requests%ROWTYPE;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_request
  FROM public.homie_requests
  WHERE id = p_request_id;

  IF NOT FOUND
     OR v_request.to_user_id <> v_actor_id
     OR v_request.status <> 'accepted' THEN
    RAISE EXCEPTION 'Accepted homie request is not eligible for notification'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.duo_members
    WHERE duo_id = p_duo_id
      AND user_id = v_request.from_user_id
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.duo_members
    WHERE duo_id = p_duo_id
      AND user_id = v_request.to_user_id
  ) THEN
    RAISE EXCEPTION 'Accepted homie request duo membership is invalid'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_request.from_user_id,
    'homie_accepted',
    jsonb_build_object(
      'accepted_by_user_id', v_actor_id,
      'duo_id', p_duo_id,
      'homie_request_id', v_request.id
    ),
    false
  )
  RETURNING * INTO v_notification;

  RETURN NEXT v_notification;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_homie_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_homie_request_accepted(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.notify_homie_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_homie_request_accepted(uuid, uuid) TO authenticated;
