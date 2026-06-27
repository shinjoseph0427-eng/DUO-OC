-- WEEKLY - solo request lifecycle.
--
-- Historical solo_requests should remain as history, but only a currently
-- pending request from the same sender to the same recipient should block a new
-- request. Active solo_matches still block rediscovery through Explore; ended
-- matches do not.

ALTER TABLE public.solo_requests
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.solo_requests
  DROP CONSTRAINT IF EXISTS solo_requests_status_check;

ALTER TABLE public.solo_requests
  ADD CONSTRAINT solo_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired', 'matched'));

-- Preserve existing rows after widening the constraint.
UPDATE public.solo_requests sr
   SET status = 'matched'
 WHERE EXISTS (
   SELECT 1
     FROM public.solo_matches sm
    WHERE (sm.user_a = sr.from_user_id AND sm.user_b = sr.to_user_id)
       OR (sm.user_a = sr.to_user_id AND sm.user_b = sr.from_user_id)
 );

-- Remove old global uniqueness, then enforce only duplicate pending sends.
DROP INDEX IF EXISTS public.solo_requests_from_to_uniq;
DROP INDEX IF EXISTS public.solo_requests_unique_from_to;
DROP INDEX IF EXISTS public.solo_requests_pending_from_to_uniq;
ALTER TABLE public.solo_requests
  DROP CONSTRAINT IF EXISTS solo_requests_from_user_id_to_user_id_key;
ALTER TABLE public.solo_requests
  DROP CONSTRAINT IF EXISTS solo_requests_unique_pair;

-- Defensive cleanup in case prod already has duplicate pending directional rows.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY from_user_id, to_user_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.solo_requests
  WHERE status = 'pending'
)
UPDATE public.solo_requests sr
   SET status = 'cancelled'
  FROM ranked r
 WHERE sr.id = r.id
   AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS solo_requests_pending_from_to_uniq
  ON public.solo_requests (from_user_id, to_user_id)
  WHERE status = 'pending';

-- Sender cancellation and receiver decline should preserve request rows as
-- history while keeping direct client updates narrow. Accept/match remains RPC.
DROP POLICY IF EXISTS "solo_requests receiver update" ON public.solo_requests;
CREATE POLICY "solo_requests receiver update" ON public.solo_requests
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (to_user_id = auth.uid() AND status = 'declined');

DROP POLICY IF EXISTS "solo_requests sender update" ON public.solo_requests;
CREATE POLICY "solo_requests sender update" ON public.solo_requests
  FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (from_user_id = auth.uid() AND status = 'cancelled');

-- accept_solo_request: final persisted request state is matched.
CREATE OR REPLACE FUNCTION public.accept_solo_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_req      public.solo_requests%ROWTYPE;
  v_match_id uuid;
  v_lo       uuid;
  v_hi       uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.solo_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_req.to_user_id <> v_uid OR v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Solo request is not eligible to accept' USING ERRCODE = '42501';
  END IF;

  v_lo := LEAST(v_req.from_user_id, v_req.to_user_id);
  v_hi := GREATEST(v_req.from_user_id, v_req.to_user_id);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_lo::text || ':' || v_hi::text, 0));

  SELECT id INTO v_match_id
  FROM public.solo_matches
  WHERE status = 'active'
    AND LEAST(user_a, user_b)    = v_lo
    AND GREATEST(user_a, user_b) = v_hi
  LIMIT 1;

  IF v_match_id IS NULL THEN
    BEGIN
      INSERT INTO public.solo_matches (user_a, user_b, status)
      VALUES (v_req.from_user_id, v_req.to_user_id, 'active')
      RETURNING id INTO v_match_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_match_id
      FROM public.solo_matches
      WHERE status = 'active'
        AND LEAST(user_a, user_b)    = v_lo
        AND GREATEST(user_a, user_b) = v_hi
      LIMIT 1;
    END;
  END IF;

  UPDATE public.solo_requests
     SET status = 'matched'
   WHERE id = p_request_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_solo_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_solo_request(uuid) TO authenticated;

-- The accepted notification now follows the matched final state.
CREATE OR REPLACE FUNCTION public.notify_solo_accepted(p_request_id uuid)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_req  public.solo_requests%ROWTYPE;
  v_name text;
  v_notification public.notifications%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.solo_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_req.to_user_id <> v_uid OR v_req.status NOT IN ('accepted', 'matched') THEN
    RAISE EXCEPTION 'Solo request not eligible for accepted notification' USING ERRCODE = '42501';
  END IF;

  SELECT name INTO v_name FROM public.profiles WHERE id = v_req.to_user_id;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_req.from_user_id,
    'solo_accepted',
    jsonb_build_object('accepted_by_user_id', v_req.to_user_id, 'request_id', v_req.id, 'partner_name', v_name),
    false
  )
  RETURNING * INTO v_notification;

  RETURN NEXT v_notification;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_solo_accepted(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_solo_accepted(uuid) TO authenticated;

-- Explore RPC: active matches and outgoing pending requests hide a candidate;
-- historical requests and ended matches do not.
DROP FUNCTION IF EXISTS public.find_weekly_matches(date);

CREATE OR REPLACE FUNCTION public.find_weekly_matches(p_week_start date)
RETURNS TABLE (
  id            uuid,
  username      text,
  name          text,
  photos        text[],
  city          text,
  bio           text,
  instagram     text,
  lat           float8,
  lng           float8,
  place         text,
  vibe          text,
  overlap_days  text[],
  overlap_slots text[],
  distance_km   float8
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_my_card public.weekly_cards%ROWTYPE;
  v_my_lat  float8;
  v_my_lng  float8;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_my_card
  FROM public.weekly_cards
  WHERE user_id = v_uid AND week_start = p_week_start AND status = 'open';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT p.lat, p.lng INTO v_my_lat, v_my_lng
  FROM public.profiles p WHERE p.id = v_uid;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.name,
    p.photos,
    p.city,
    p.bio,
    p.instagram,
    p.lat,
    p.lng,
    wc.place,
    wc.vibe,
    ARRAY(SELECT unnest(wc.days)       INTERSECT SELECT unnest(v_my_card.days))       AS overlap_days,
    ARRAY(SELECT unnest(wc.time_slots) INTERSECT SELECT unnest(v_my_card.time_slots)) AS overlap_slots,
    CASE
      WHEN v_my_lat IS NULL OR v_my_lng IS NULL OR p.lat IS NULL OR p.lng IS NULL THEN NULL
      ELSE 2 * 6371 * asin(sqrt(
             sin(radians((p.lat - v_my_lat) / 2)) ^ 2
           + cos(radians(v_my_lat)) * cos(radians(p.lat))
             * sin(radians((p.lng - v_my_lng) / 2)) ^ 2
           ))
    END AS distance_km
  FROM public.weekly_cards wc
  JOIN public.profiles p ON p.id = wc.user_id
  WHERE wc.week_start = p_week_start
    AND wc.status = 'open'
    AND wc.user_id <> v_uid
    AND p.deleted_at IS NULL
    AND wc.days && v_my_card.days
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = v_uid AND b.blocked_id = wc.user_id)
         OR (b.blocker_id = wc.user_id AND b.blocked_id = v_uid)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.solo_requests sr
      WHERE sr.from_user_id = v_uid
        AND sr.to_user_id = wc.user_id
        AND sr.status = 'pending'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.solo_matches m
      WHERE m.status = 'active'
        AND ((m.user_a = v_uid AND m.user_b = wc.user_id)
          OR (m.user_b = v_uid AND m.user_a = wc.user_id))
    )
    AND (
      v_my_lat IS NULL OR v_my_lng IS NULL OR p.lat IS NULL OR p.lng IS NULL
      OR 2 * 6371 * asin(sqrt(
             sin(radians((p.lat - v_my_lat) / 2)) ^ 2
           + cos(radians(v_my_lat)) * cos(radians(p.lat))
             * sin(radians((p.lng - v_my_lng) / 2)) ^ 2
           )) <= 80
    )
  ORDER BY distance_km NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.find_weekly_matches(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_weekly_matches(date) TO authenticated;
