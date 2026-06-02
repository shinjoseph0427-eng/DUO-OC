-- DUO OC — Solo 1:1 feature (additive; does NOT touch duo tables).
-- profiles.is_solo + solo_requests + solo_matches + solo_messages
-- with RLS and an atomic accept_solo_request() RPC.

-- ── profiles flag ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_solo boolean NOT NULL DEFAULT false;

-- ── solo_requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solo_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solo_requests_not_self CHECK (from_user_id <> to_user_id),
  CONSTRAINT solo_requests_unique_pair UNIQUE (from_user_id, to_user_id)
);

ALTER TABLE public.solo_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo_requests select own" ON public.solo_requests;
CREATE POLICY "solo_requests select own" ON public.solo_requests
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "solo_requests insert own" ON public.solo_requests;
CREATE POLICY "solo_requests insert own" ON public.solo_requests
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- receiver can decline (update status)
DROP POLICY IF EXISTS "solo_requests receiver update" ON public.solo_requests;
CREATE POLICY "solo_requests receiver update" ON public.solo_requests
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- sender can cancel (delete) their own pending request
DROP POLICY IF EXISTS "solo_requests sender delete" ON public.solo_requests;
CREATE POLICY "solo_requests sender delete" ON public.solo_requests
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid());

-- ── solo_matches ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solo_matches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  matched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solo_matches_not_self CHECK (user_a <> user_b)
);

-- at most one ACTIVE match per unordered pair
CREATE UNIQUE INDEX IF NOT EXISTS solo_matches_active_pair_uniq
  ON public.solo_matches (LEAST(user_a, user_b), GREATEST(user_a, user_b))
  WHERE status = 'active';

ALTER TABLE public.solo_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo_matches select participant" ON public.solo_matches;
CREATE POLICY "solo_matches select participant" ON public.solo_matches
  FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- participants can end the match (update status); inserts only via the RPC.
DROP POLICY IF EXISTS "solo_matches participant update" ON public.solo_matches;
CREATE POLICY "solo_matches participant update" ON public.solo_matches
  FOR UPDATE TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid())
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- ── solo_messages ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solo_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       uuid NOT NULL REFERENCES public.solo_matches(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solo_messages_match_id_idx ON public.solo_messages (match_id, created_at);

ALTER TABLE public.solo_messages ENABLE ROW LEVEL SECURITY;

-- only participants of the match can read its messages
DROP POLICY IF EXISTS "solo_messages select participant" ON public.solo_messages;
CREATE POLICY "solo_messages select participant" ON public.solo_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.solo_matches m
    WHERE m.id = solo_messages.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
  ));

-- sender must be the caller AND a participant of an active match
DROP POLICY IF EXISTS "solo_messages insert participant" ON public.solo_messages;
CREATE POLICY "solo_messages insert participant" ON public.solo_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.solo_matches m
      WHERE m.id = solo_messages.match_id
        AND m.status = 'active'
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- sender can delete their own message
DROP POLICY IF EXISTS "solo_messages sender delete" ON public.solo_messages;
CREATE POLICY "solo_messages sender delete" ON public.solo_messages
  FOR DELETE TO authenticated
  USING (sender_user_id = auth.uid());

-- ── accept_solo_request RPC (atomic) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_solo_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_req     public.solo_requests%ROWTYPE;
  v_match_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.solo_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_req.to_user_id <> v_uid OR v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Solo request is not eligible to accept' USING ERRCODE = '42501';
  END IF;

  -- reuse an existing active match for this pair if present
  SELECT id INTO v_match_id
  FROM public.solo_matches
  WHERE status = 'active'
    AND LEAST(user_a, user_b)    = LEAST(v_req.from_user_id, v_req.to_user_id)
    AND GREATEST(user_a, user_b) = GREATEST(v_req.from_user_id, v_req.to_user_id)
  LIMIT 1;

  IF v_match_id IS NULL THEN
    INSERT INTO public.solo_matches (user_a, user_b, status)
    VALUES (v_req.from_user_id, v_req.to_user_id, 'active')
    RETURNING id INTO v_match_id;
  END IF;

  UPDATE public.solo_requests SET status = 'accepted' WHERE id = p_request_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_solo_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_solo_request(uuid) TO authenticated;

-- ── notify RPCs (SECURITY DEFINER so the inserted notification id can be
--    returned to the caller for push, bypassing the user_id=auth.uid() SELECT RLS) ──

-- solo_request → notify the recipient (to_user_id). Caller must be the sender.
CREATE OR REPLACE FUNCTION public.notify_solo_request(p_request_id uuid)
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
  IF NOT FOUND OR v_req.from_user_id <> v_uid OR v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Solo request not eligible for notification' USING ERRCODE = '42501';
  END IF;

  SELECT name INTO v_name FROM public.profiles WHERE id = v_req.from_user_id;

  INSERT INTO public.notifications (user_id, type, payload, read)
  VALUES (
    v_req.to_user_id,
    'solo_request',
    jsonb_build_object('from_user_id', v_req.from_user_id, 'request_id', v_req.id, 'sender_name', v_name),
    false
  )
  RETURNING * INTO v_notification;

  RETURN NEXT v_notification;
  RETURN;
END;
$$;

-- solo_accepted → notify the original sender (from_user_id). Caller must be the accepter.
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
  IF NOT FOUND OR v_req.to_user_id <> v_uid OR v_req.status <> 'accepted' THEN
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

REVOKE ALL ON FUNCTION public.notify_solo_request(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_solo_accepted(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_solo_request(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_solo_accepted(uuid) TO authenticated;

-- ── realtime for solo_messages ─────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.solo_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already in publication
  WHEN undefined_object THEN NULL;  -- publication missing (local) — ignore
END $$;
