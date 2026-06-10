-- DUO OC — Fix duplicate solo chat rooms for the same pair.
--
-- Root cause: solo_requests UNIQUE is directional (from,to), so A→B and B→A
-- both exist. When both are accepted near-simultaneously, accept_solo_request's
-- SELECT-then-INSERT reuse guard runs under READ COMMITTED and neither tx sees
-- the other's uncommitted INSERT → two active solo_matches rows are created.
--
-- Defense added here:
--   (1) pg_advisory_xact_lock on the normalized pair → serializes concurrent
--       accepts for the SAME pair, so the reuse-guard SELECT is now race-free.
--   (2) graceful unique_violation backstop → if the pair's unique index ever
--       fires, reuse the existing match instead of raising to the caller.
--
-- NOTE: the hard UNIQUE index (solo_matches_active_pair_uniq) is (re)created in
-- the manual cleanup script AFTER existing duplicates are archived — creating it
-- here would fail while duplicate active rows still exist in prod.

-- ── allow 'archived' status (used by the dup-cleanup script) ────────────────
ALTER TABLE public.solo_matches
  DROP CONSTRAINT IF EXISTS solo_matches_status_check;
ALTER TABLE public.solo_matches
  ADD CONSTRAINT solo_matches_status_check
  CHECK (status IN ('active', 'ended', 'archived'));

-- ── accept_solo_request RPC (race-safe) ─────────────────────────────────────
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

  -- (1) Serialize concurrent accepts for THIS pair. Any other accept touching
  --     the same pair (e.g. the reverse-direction request) blocks here until we
  --     commit, so the reuse-guard SELECT below always sees a freshly-created
  --     match instead of racing past it.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_lo::text || ':' || v_hi::text, 0));

  -- Reuse an existing active match for this pair if present.
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
      -- (2) Hard backstop: the pair's unique index rejected a concurrent
      --     duplicate. Reuse the row that won instead of erroring out.
      SELECT id INTO v_match_id
      FROM public.solo_matches
      WHERE status = 'active'
        AND LEAST(user_a, user_b)    = v_lo
        AND GREATEST(user_a, user_b) = v_hi
      LIMIT 1;
    END;
  END IF;

  UPDATE public.solo_requests SET status = 'accepted' WHERE id = p_request_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_solo_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_solo_request(uuid) TO authenticated;
