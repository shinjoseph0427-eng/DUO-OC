-- WEEKLY — weekly availability cards + overlap-based matching.
-- A weekly_card answers "when are you free this week?" (days + time slots + place).
-- Matching is overlap-based (shared day + shared slot + within 80km).

-- ── weekly_cards ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start  date NOT NULL,                       -- Monday of the week (week identifier)
  days        text[] NOT NULL DEFAULT '{}',        -- e.g. ['mon','wed','fri']
  time_slots  text[] NOT NULL DEFAULT '{}',        -- e.g. ['morning','afternoon','evening']
  place       text,                                -- preferred spot / neighborhood
  place_lat   float8,
  place_lng   float8,
  vibe        text,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','matched','expired')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_cards_unique_user_week UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_cards_week_status_idx
  ON public.weekly_cards (week_start, status);

-- ── RLS — owners manage their own card; matching is read via the RPC only ────
ALTER TABLE public.weekly_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_cards select own" ON public.weekly_cards;
CREATE POLICY "weekly_cards select own" ON public.weekly_cards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "weekly_cards insert own" ON public.weekly_cards;
CREATE POLICY "weekly_cards insert own" ON public.weekly_cards
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "weekly_cards update own" ON public.weekly_cards;
CREATE POLICY "weekly_cards update own" ON public.weekly_cards
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "weekly_cards delete own" ON public.weekly_cards;
CREATE POLICY "weekly_cards delete own" ON public.weekly_cards
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── find_weekly_matches(week_start) ─────────────────────────────────────────
-- SECURITY DEFINER: reads other users' open cards (bypassing the own-only SELECT
-- RLS) but only returns sanitized public profile fields + overlap info.
-- Match conditions: shared day(s) AND shared slot(s) AND (unknown location OR <=80km).
-- Excludes: self, blocked users (either direction), already-active solo matches.
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

  -- My open card for this week. No card → no matches.
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
    AND wc.time_slots && v_my_card.time_slots     -- at least one shared slot
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

-- ── expire_old_weekly_cards() ───────────────────────────────────────────────
-- Marks still-open cards from before this week's Monday as expired.
-- (Postgres date_trunc('week', ...) yields Monday 00:00.) Matched cards are left
-- as-is to preserve match history.
CREATE OR REPLACE FUNCTION public.expire_old_weekly_cards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.weekly_cards
     SET status = 'expired'
   WHERE status = 'open'
     AND week_start < (date_trunc('week', now())::date);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_old_weekly_cards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_old_weekly_cards() TO authenticated;
