-- DUO OC — include the accepter's display name in the homie_accepted
-- notification payload so the requester sees "OO accepted your Homie request!"
-- in both the in-app card and the push body.

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
  v_actor_name text;
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

  SELECT name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_request.from_user_id,
    'homie_accepted',
    jsonb_build_object(
      'accepted_by_user_id', v_actor_id,
      'accepted_by_name', v_actor_name,
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

REVOKE ALL ON FUNCTION public.notify_homie_request_accepted(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_homie_request_accepted(uuid, uuid) TO authenticated;
