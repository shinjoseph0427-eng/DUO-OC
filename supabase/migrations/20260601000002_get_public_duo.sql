-- DUO OC — public DUO card. Returns a sanitized, anon-readable view of one
-- active duo for the shareable /duo/[id] page. SECURITY DEFINER so it bypasses
-- the authenticated-only RLS on duos/duo_members/profiles, while exposing ONLY
-- safe public fields (no instagram / lat / lng / email / birth_year raw).
--
-- NOTE: source columns are the real schema names (duo_bio, vibes, duo_photos),
-- but the returned JSON keys are kept friendly (bio, vibe_tags, photos).

CREATE OR REPLACE FUNCTION public.get_public_duo(p_duo_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id',        d.id,
    'name',      d.name,
    'city',      d.city,
    'bio',       d.duo_bio,
    'vibe_tags', d.vibes,
    'photos',    d.duo_photos,
    'members', (
      SELECT json_agg(json_build_object(
        'name',   p.name,
        'age',    CASE WHEN p.birth_year IS NOT NULL
                       THEN date_part('year', now())::int - p.birth_year
                       ELSE NULL END,
        'photos', p.photos
      ))
      FROM duo_members dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE dm.duo_id = d.id
        AND p.deleted_at IS NULL
    )
  )
  INTO result
  FROM duos d
  WHERE d.id = p_duo_id
    AND d.status = 'active';

  RETURN result; -- null when the duo doesn't exist / isn't active
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_duo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_duo(uuid) TO anon, authenticated;
