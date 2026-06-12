-- Fix: Explore never returns matches.
-- The weekly-card UI was simplified to days-only (no time-slot picker), so every
-- card now saves time_slots = '{}'. But find_weekly_matches still required a
-- time-slot overlap (wc.time_slots && v_my_card.time_slots), and array-overlap
-- with an empty array is always false — so EVERY candidate got filtered out.
--
-- Recreates find_weekly_matches with the SAME return shape (incl. place/vibe from
-- 20260609000003) EXCEPT the time_slots overlap requirement is dropped. Matching
-- is now: shared day(s) + within 80km (or unknown location), excluding self /
-- blocked / already-matched. overlap_slots is kept (returns '{}') for shape.
-- DROP first because the return type can't be changed via CREATE OR REPLACE.

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
    AND wc.days && v_my_card.days                 -- at least one shared day
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = v_uid AND b.blocked_id = wc.user_id)
         OR (b.blocker_id = wc.user_id AND b.blocked_id = v_uid)
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
