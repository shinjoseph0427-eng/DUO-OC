-- Public, signed-out Explore feed.
-- Returns users who have an OPEN weekly_card for the current week, exposing only
-- sanitized public fields (no email / fcm_token / instagram / lat / lng /
-- raw birth_year). SECURITY DEFINER so anon can read past the authenticated-only
-- RLS on profiles + weekly_cards, but the SELECT list is the only thing exposed.

CREATE OR REPLACE FUNCTION public.browse_weekly_profiles(
  p_limit  int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  name    text,
  age     int,
  city    text,
  bio     text,
  photos  text[],       -- profiles.photos is text[] (matches find_weekly_matches)
  days    text[],       -- weekly_card availability days
  vibe    text          -- weekly_card vibe
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    CASE
      WHEN p.birth_year IS NOT NULL
      THEN date_part('year', now())::int - p.birth_year
      ELSE NULL
    END AS age,
    p.city,
    p.bio,
    p.photos,
    wc.days,
    wc.vibe
  FROM public.profiles p
  JOIN public.weekly_cards wc ON wc.user_id = p.id
  WHERE
    wc.week_start = date_trunc('week', now())::date
    AND wc.status = 'open'
    AND p.deleted_at IS NULL
    AND p.onboarding_complete = true
    AND array_length(wc.days, 1) > 0
  ORDER BY p.created_at DESC
  LIMIT  GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

-- Callable without a session (anon); authenticated may call it too.
REVOKE ALL ON FUNCTION public.browse_weekly_profiles(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.browse_weekly_profiles(int, int) TO anon, authenticated;
